/** Agent Runner — 자율적 에이전트 실행 엔진
 *
 * 핵심 루프: observe → think → act (tool use) → observe → ...
 *
 * 설계 원칙:
 * 1. 에이전트는 자율적으로 어떤 도구를 쓸지 결정
 * 2. 루프는 에이전트가 "done" 판단하거나 maxSteps 도달 시 종료
 * 3. 모든 행동은 로그로 남김 (투명성)
 * 4. 새 에이전트 타입 추가 = AgentDefinition 하나 + registry에 도구 등록
 *
 * LLM: AI SDK (Gemini 2.5 Flash 기본, 환경변수로 변경 가능)
 */

import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import type { AgentRole } from '@/types/agent';
import { getToolsForRole, type AgentTool } from '../tools/registry';
import { AGENT_DEFINITIONS } from './definitions';
import { getModel } from '@/modules/llm/client';

export interface AgentStep {
  step: number;
  thought: string;
  toolUsed?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  timestamp: string;
}

export interface AgentRunResult {
  role: AgentRole;
  goal: string;
  steps: AgentStep[];
  finalOutput: string;
  nodesCreated: number;
  edgesCreated: number;
  toolsUsed: string[];
  duration: number;
}

/** AgentTool → AI SDK tool 변환 */
function toAISDKTools(agentTools: AgentTool[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};
  for (const t of agentTools) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, schema] of Object.entries(t.parameters)) {
      const s = schema as { type: string; description?: string };
      switch (s.type) {
        case 'number':
          shape[key] = z.number().describe(s.description ?? key);
          break;
        default:
          shape[key] = z.string().describe(s.description ?? key);
      }
    }
    const schema = z.object(shape);
    tools[t.name] = tool({
      description: t.description,
      inputSchema: schema,
      execute: async (params: z.infer<typeof schema>) => t.execute(params as Record<string, unknown>),
    });
  }
  return tools;
}

/** 에이전트 실행 — 자율 루프 */
export async function runAgent(
  role: AgentRole,
  goal: string,
  context?: string,
  maxSteps = 10,
  domain?: string
): Promise<AgentRunResult> {
  const startTime = Date.now();
  const definition = AGENT_DEFINITIONS[role];
  if (!definition) throw new Error(`Unknown agent role: ${role}`);

  const agentTools = getToolsForRole(role, domain);
  const aiTools = toAISDKTools(agentTools);

  const steps: AgentStep[] = [];
  const toolsUsedSet = new Set<string>();
  let nodesCreated = 0;
  let edgesCreated = 0;

  const systemPrompt = `${definition.systemPrompt}

You are an autonomous AI agent with tools. Work step-by-step:
1. Think about what you need to do next
2. Use a tool if needed
3. Observe the result
4. Decide next action
5. When finished, say "DONE:" followed by your summary

Available tools: ${agentTools.map((t) => t.name).join(', ')}
Always save your generated ideas to the graph using graph_add_node.
Always create connections between related ideas using graph_add_edge.`;

  const userMessage = `Your goal: ${goal}\n\n${context ? `Context:\n${context}\n\n` : ''}Use your tools to accomplish this goal autonomously. When you're done, say "DONE:" followed by your final output summary.`;

  const result = await generateText({
    model: getModel(),
    system: systemPrompt,
    prompt: userMessage,
    tools: aiTools,
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      if (toolCalls && toolCalls.length > 0) {
        for (let i = 0; i < toolCalls.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tc = toolCalls[i] as any;
          const name = tc.toolName as string;
          toolsUsedSet.add(name);
          if (name === 'graph_add_node') nodesCreated++;
          if (name === 'graph_add_edge') edgesCreated++;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tr = toolResults?.[i] as any;
          steps.push({
            step: steps.length,
            thought: text || `Using ${name}`,
            toolUsed: name,
            toolInput: (tc.input ?? tc.args) as Record<string, unknown>,
            toolResult: tr?.result ?? tr?.output,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (text) {
        steps.push({
          step: steps.length,
          thought: text,
          timestamp: new Date().toISOString(),
        });
      }
    },
  });

  const finalOutput = result.text.includes('DONE:')
    ? result.text.split('DONE:').pop()?.trim() ?? result.text
    : result.text;

  return {
    role,
    goal,
    steps,
    finalOutput,
    nodesCreated,
    edgesCreated,
    toolsUsed: [...toolsUsedSet],
    duration: Date.now() - startTime,
  };
}
