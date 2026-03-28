/** Multi-Model Debate Tool — 여러 LLM이 토론하여 더 창의적인 아이디어 생성
 *
 * 영감: brainstorm-mcp (spranab/brainstorm-mcp)
 * 근거: Agent Ideate (IJCAI 2025) — "tool이 있는 에이전트가 86% 더 창의적"
 *       + 다중 관점이 단일 관점보다 창의적 (Barrios 2020)
 *
 * 핵심: 같은 주제를 여러 모델에 던져서 병렬 응답 → 교차 토론 → 합성
 * 결과: 각 관점을 Idea 노드로, 합성을 별도 노드로 그래프에 저장
 */

import { generateText } from 'ai';
import { getModel, getAvailableProviders } from '@/modules/llm/client';
import type { AgentTool } from './registry';

interface DebateResponse {
  model: string;
  content: string;
  duration: number;
}

interface DebateRound {
  round: number;
  responses: DebateResponse[];
}

interface DebateResult {
  topic: string;
  rounds: DebateRound[];
  synthesis: string;
  models: string[];
  totalDuration: number;
}

/** 사용 가능한 모델 목록 (API 키 설정된 것만) */
function getAvailableModels(): string[] {
  const models: string[] = [];
  const providers = getAvailableProviders();

  for (const p of providers) {
    if (!p.configured) continue;
    switch (p.provider) {
      case 'google':
        models.push('google/gemini-2.5-flash');
        break;
      case 'anthropic':
        models.push('anthropic/claude-sonnet-4.6');
        break;
      case 'openai':
        models.push('openai/gpt-4o');
        break;
    }
  }
  return models;
}

/** 단일 모델에 프롬프트 전송 (타임아웃 포함) */
async function callModel(
  modelId: string,
  system: string,
  prompt: string,
  timeoutMs = 60_000,
): Promise<DebateResponse> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await generateText({
      model: getModel(modelId),
      system,
      prompt,
      maxOutputTokens: 2048,
      abortSignal: controller.signal,
    });
    return { model: modelId, content: result.text, duration: Date.now() - start };
  } catch {
    return { model: modelId, content: `[${modelId} failed or timed out]`, duration: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

/** 멀티모델 디베이트 실행 */
async function runDebate(
  topic: string,
  domain: string,
  rounds = 2,
  style: 'freeform' | 'socratic' | 'redteam' = 'freeform',
): Promise<DebateResult> {
  const startTime = Date.now();
  const models = getAvailableModels();

  if (models.length < 2) {
    // 모델이 1개뿐이면 일반 브레인스토밍으로 fallback
    const resp = await callModel(models[0] ?? 'google/gemini-2.5-flash', '', `Generate 5 creative ideas about: ${topic} (domain: ${domain})`);
    return {
      topic,
      rounds: [{ round: 1, responses: [resp] }],
      synthesis: resp.content,
      models: models.length > 0 ? models : ['google/gemini-2.5-flash'],
      totalDuration: Date.now() - startTime,
    };
  }

  const styleInstruction = style === 'redteam'
    ? 'Challenge and find weaknesses in other perspectives. Be critical.'
    : style === 'socratic'
    ? 'Ask probing questions about other perspectives. Dig deeper.'
    : 'Build on others\' ideas and offer your unique perspective.';

  const debateRounds: DebateRound[] = [];
  let history = '';

  // Round 1: 독립적 관점 생성
  const round1System = `You are a creative thinker generating ideas about: "${topic}" (domain: ${domain}).
Be specific, original, and practical. Generate 2-3 distinct ideas.
${styleInstruction}`;

  const round1Responses = await Promise.allSettled(
    models.map((m) => callModel(m, round1System, `Generate creative ideas about: ${topic}`))
  );

  const round1 = round1Responses
    .filter((r): r is PromiseFulfilledResult<DebateResponse> => r.status === 'fulfilled')
    .map((r) => r.value);

  debateRounds.push({ round: 1, responses: round1 });
  history = round1.map((r) => `[${r.model}]: ${r.content}`).join('\n\n');

  // Round 2+: 교차 토론
  for (let round = 2; round <= rounds; round++) {
    const roundSystem = `You are debating creative ideas about: "${topic}" (domain: ${domain}).
Previous round:
${history.slice(-6000)}

${styleInstruction}
Respond to others' ideas. Build on strengths, address weaknesses, propose combinations or new angles.`;

    const roundResponses = await Promise.allSettled(
      models.map((m) => callModel(m, roundSystem, `Continue the debate. Respond to other perspectives and refine your ideas.`))
    );

    const roundResult = roundResponses
      .filter((r): r is PromiseFulfilledResult<DebateResponse> => r.status === 'fulfilled')
      .map((r) => r.value);

    debateRounds.push({ round, responses: roundResult });
    history += '\n\n' + roundResult.map((r) => `[${r.model}]: ${r.content}`).join('\n\n');
  }

  // 합성: 첫 번째 모델이 전체 토론을 종합
  const synthesizer = models[0];
  const synthesisResp = await callModel(
    synthesizer,
    `You are synthesizing a multi-model creative debate about: "${topic}" (domain: ${domain}).

Full debate history:
${history.slice(-10000)}

Produce a synthesis with:
1. **Top 3 Ideas** — the best ideas from the debate, combining perspectives
2. **Key Insight** — the single most creative insight that emerged
3. **Unresolved Tension** — the biggest disagreement worth exploring further`,
    `Synthesize the debate into actionable creative output.`,
  );

  return {
    topic,
    rounds: debateRounds,
    synthesis: synthesisResp.content,
    models,
    totalDuration: Date.now() - startTime,
  };
}

/** 디베이트 결과 → 그래프 노드 데이터로 변환 */
function debateToNodeData(result: DebateResult): {
  ideas: { title: string; description: string; model: string }[];
  synthesis: string;
} {
  // 각 라운드의 응답에서 아이디어 추출 (마지막 라운드 우선)
  const lastRound = result.rounds[result.rounds.length - 1];
  const ideas = lastRound.responses.map((r) => ({
    title: `[${r.model.split('/')[1]}] ${result.topic}`,
    description: r.content.slice(0, 500),
    model: r.model,
  }));

  return { ideas, synthesis: result.synthesis };
}

export const debateTool: AgentTool = {
  name: 'multi_model_debate',
  description: `Run a multi-model creative debate. Multiple LLMs (Gemini, Claude, GPT) independently brainstorm on the same topic, then debate across rounds, then synthesize. Produces more diverse and creative ideas than single-model generation. Based on brainstorm-mcp pattern.

Use this when:
- You need diverse perspectives on a topic
- Single-model brainstorming feels repetitive
- You want cross-pollination of ideas from different AI "minds"
- The topic benefits from adversarial or Socratic examination`,
  parameters: {
    topic: { type: 'string', description: 'The topic or problem to brainstorm about' },
    domain: { type: 'string', description: 'Domain context (e.g., "Healthcare", "Fintech")' },
    rounds: { type: 'number', description: 'Number of debate rounds (default 2, max 4)' },
    style: { type: 'string', description: 'Debate style: freeform (default), socratic (questioning), redteam (adversarial)' },
  },
  execute: async (params) => {
    const topic = params.topic as string;
    const domain = params.domain as string;
    const rounds = Math.min(Math.max((params.rounds as number) ?? 2, 1), 4);
    const style = (params.style as 'freeform' | 'socratic' | 'redteam') ?? 'freeform';

    const result = await runDebate(topic, domain, rounds, style);
    const { ideas, synthesis } = debateToNodeData(result);

    return {
      topic,
      models: result.models,
      rounds: result.rounds.length,
      totalDuration: result.totalDuration,
      ideas,
      synthesis,
      instruction: 'Save each idea with graph_add_node (type: Idea, method: "multi_model_debate"). Then save the synthesis as a separate Idea node. Connect ideas with SIMILAR_TO edges.',
    };
  },
};
