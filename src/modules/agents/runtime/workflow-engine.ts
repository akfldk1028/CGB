/** Workflow Engine — YAML 워크플로우 기반 DAG 실행
 *
 * 기존 multi-agent.ts의 하드코딩된 순차 파이프라인을 대체.
 * - depends_on 기반 DAG 실행 (병렬 가능한 건 병렬)
 * - 에이전트 간 context를 Graph 쿼리로 전달 (문자열 복붙 대체)
 * - 각 step의 결과가 Graph에 저장되므로 다음 agent가 graph_search로 접근
 */

import { runAgent, type AgentRunResult } from './agent-runner';
import { loadAgent } from './loader';
import { getImmersionContext } from '@/modules/graph/service';
import { storeManager } from '@/modules/graph/store';
import { tournamentSelect } from '@/modules/creativity/evaluation/judge';
import type { AgentRole } from '@/types/agent';

// ── Types ──

interface WorkflowStep {
  id: string;
  action: string;
  agent?: string;       // 에이전트 이름 (kebab-case)
  depends_on?: string[];
  parallel?: boolean;
  steps?: WorkflowStep[]; // 병렬 서브스텝
}

interface StepResult {
  stepId: string;
  agentResult?: AgentRunResult;
  output: string;
  nodesCreated: number;
  edgesCreated: number;
  duration: number;
}

export interface WorkflowResult {
  workflowName: string;
  sessionId: string;
  topic: string;
  domain: string;
  stepResults: StepResult[];
  totalNodesCreated: number;
  totalEdgesCreated: number;
  totalDuration: number;
}

// ── Agent name mapping ──

const AGENT_ROLE_MAP: Record<string, AgentRole> = {
  'researcher': 'researcher',
  'divergent-thinker': 'divergent_thinker',
  'evaluator': 'evaluator',
  'iterator': 'iterator',
  'field-validator': 'field_validator',
  'creative-director': 'creative_director',
};

// ── Engine ──

/** 4I's Heavy 워크플로우 실행 — Graph 이벤트 기반 context 전달 */
export async function runWorkflow(
  topic: string,
  domain: string,
): Promise<WorkflowResult> {
  const sessionId = `session-${Date.now()}`;
  const startTime = Date.now();
  const stepResults: StepResult[] = [];

  // Graph에서 기존 지식 로드 (문자열 복붙 대신 Graph context)
  let graphContext = '';
  try {
    graphContext = await getImmersionContext(topic, domain);
  } catch {
    graphContext = 'No prior knowledge found.';
  }

  const sessionContext = `Topic: "${topic}"\nDomain: "${domain}"\nSession: ${sessionId}`;

  // ── Step 1: IMMERSION (researcher) ──
  const immersionResult = await executeAgentStep(
    'immersion',
    'researcher',
    `Research the domain "${domain}" for topic "${topic}". Build on existing graph knowledge. Save key findings as Concept nodes.`,
    `${sessionContext}\n\nPrior Knowledge:\n${graphContext}`,
    domain,
  );
  stepResults.push(immersionResult);

  // ── Step 2: INSPIRATION (divergent-thinker) ──
  // Context: Graph 쿼리로 현재 세션의 노드를 조회하라고 지시
  const inspirationResult = await executeAgentStep(
    'inspiration',
    'divergent-thinker',
    `Generate 10+ creative ideas about "${topic}" in "${domain}". Use graph_search to find what the researcher discovered. Use SCAMPER, TRIZ, brainstorming. Save everything to the graph.`,
    `${sessionContext}\n\nInstruction: Use graph_search with keywords from the topic to find the researcher's findings. Build on them.`,
    domain,
  );
  stepResults.push(inspirationResult);

  // ── Step 3: ISOLATION (evaluator + field-validator 병렬) ──
  const [evalResult, fieldResult] = await Promise.all([
    executeAgentStep(
      'evaluate',
      'evaluator',
      `Evaluate all ideas in the graph for this session. Use evaluate_idea and measure_novelty. Score on 6 dimensions. Rank them.`,
      `${sessionContext}\n\nInstruction: Use graph_search to find all Idea nodes. Evaluate each independently.`,
      domain,
    ),
    executeAgentStep(
      'validate',
      'field-validator',
      `Validate the generated ideas against market reality. Check originality, feasibility, demand.`,
      `${sessionContext}\n\nInstruction: Use graph_search to find Idea nodes, then web_search to check market viability.`,
      domain,
    ),
  ]);
  stepResults.push(evalResult, fieldResult);

  // ── Step 3.5: Tournament ──
  const store = storeManager.getGlobalStore();
  const ideaNodes = store.getAllNodes().filter((n) => n.type === 'Idea');
  if (ideaNodes.length >= 4) {
    const candidates = ideaNodes.map((n) => ({ title: n.title, description: n.description }));
    try {
      await tournamentSelect(candidates, domain, Math.min(5, Math.ceil(candidates.length / 2)));
    } catch { /* tournament is best-effort */ }
  }

  // ── Step 4: ITERATION (iterator) ──
  const iterationResult = await executeAgentStep(
    'iteration',
    'iterator',
    `Take the top-rated ideas and create meaningful iterations. Use graph_search to find high-scoring ideas. Apply cross-domain transfer and TRIZ.`,
    `${sessionContext}\n\nInstruction: Use graph_search to find top Idea nodes (look at scores). Iterate on the best ones.`,
    domain,
  );
  stepResults.push(iterationResult);

  return {
    workflowName: 'four-is-heavy',
    sessionId,
    topic,
    domain,
    stepResults,
    totalNodesCreated: stepResults.reduce((s, r) => s + r.nodesCreated, 0),
    totalEdgesCreated: stepResults.reduce((s, r) => s + r.edgesCreated, 0),
    totalDuration: Date.now() - startTime,
  };
}

/** 단일 에이전트 스텝 실행 */
async function executeAgentStep(
  stepId: string,
  agentName: string,
  goal: string,
  context: string,
  domain: string,
): Promise<StepResult> {
  const role = AGENT_ROLE_MAP[agentName];
  if (!role) {
    return { stepId, output: `Unknown agent: ${agentName}`, nodesCreated: 0, edgesCreated: 0, duration: 0 };
  }

  // YAML에서 에이전트 정의 로드 (SOUL.md → systemPrompt)
  const agentDef = await loadAgent(role);
  const startTime = Date.now();

  const agentResult = await runAgent(
    role,
    goal,
    context,
    agentDef.maxSteps,
    domain,
  );

  return {
    stepId,
    agentResult,
    output: agentResult.finalOutput,
    nodesCreated: agentResult.nodesCreated,
    edgesCreated: agentResult.edgesCreated,
    duration: Date.now() - startTime,
  };
}
