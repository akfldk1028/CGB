/** Multi-Model Debate Tool — 그래프 지식 기반 멀티모델 토론
 *
 * 영감: brainstorm-mcp (spranab/brainstorm-mcp)
 * 근거: Agent Ideate (IJCAI 2025) — "tool이 있는 에이전트가 86% 더 창의적"
 *       Knowledge Distance (Luo 2022) — 먼 개념 연결 = 더 창의적
 *
 * 흐름:
 * 1. 그래프에서 기존 지식 로드 (Concept, Idea 노드 + 연결)
 * 2. 기존 지식을 컨텍스트로 여러 모델에 병렬 전송
 * 3. 라운드별 교차 토론
 * 4. 합성 → 결과를 Idea 노드로 그래프에 저장 + GENERATED_BY 엣지
 */

import { generateText } from 'ai';
import { getModel, getAvailableProviders } from '@/modules/llm/client';
import { storeManager } from '@/modules/graph/store';
import { scheduleAutoSave } from '@/modules/graph/persistence';
import { ensureAgentNode, linkAgentToNodes } from '@/modules/graph/queries/agents';
import type { AgentTool } from './registry';

interface DebateResponse {
  model: string;
  content: string;
  duration: number;
}

/** 사용 가능한 모델 목록 (API 키 설정된 것만) */
function getAvailableModels(): string[] {
  const models: string[] = [];
  for (const p of getAvailableProviders()) {
    if (!p.configured) continue;
    switch (p.provider) {
      case 'google': models.push('google/gemini-2.5-flash'); break;
      case 'anthropic': models.push('anthropic/claude-sonnet-4.6'); break;
      case 'openai': models.push('openai/gpt-4o'); break;
    }
  }
  return models;
}

/** 그래프에서 주제 관련 기존 지식 추출 */
function getGraphContext(topic: string, domain: string): string {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  if (allNodes.length === 0) return 'No prior knowledge in the graph.';

  // 키워드 기반 관련 노드 검색 (AI, ML 등 2글자도 포함)
  const tokens = `${topic} ${domain}`.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const related = allNodes
    .filter((n) => {
      const hay = `${n.title} ${n.description} ${n.type} ${n.tags?.join(' ') ?? ''}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    })
    .slice(0, 15);

  if (related.length === 0) {
    // 키워드 매치 없으면 최근 노드라도 제공
    const recent = allNodes.slice(-10);
    if (recent.length === 0) return 'No prior knowledge in the graph.';
    return `Graph has ${allNodes.length} nodes but none match "${topic}". Recent ideas for context:\n` +
      recent.map((n) => `- [${n.type}] ${n.title}: ${n.description?.slice(0, 100)}`).join('\n');
  }

  const parts: string[] = [
    `Found ${related.length} related items in the knowledge graph (${allNodes.length} total nodes, ${allEdges.length} edges):`,
    '',
  ];

  for (const node of related) {
    parts.push(`- [${node.type}] "${node.title}": ${node.description?.slice(0, 150) ?? '(no description)'}`);
  }

  // 관련 노드 간 엣지
  const nodeIds = new Set(related.map((n) => n.id));
  const relatedEdges = allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)).slice(0, 10);
  if (relatedEdges.length > 0) {
    parts.push('', 'Connections:');
    for (const edge of relatedEdges) {
      const src = related.find((n) => n.id === edge.source);
      const tgt = related.find((n) => n.id === edge.target);
      if (src && tgt) parts.push(`  "${src.title}" --[${edge.type}]--> "${tgt.title}"`);
    }
  }

  return parts.join('\n');
}

/** 디베이트 결과를 그래프에 store 인터페이스로 저장 */
async function saveDebateToGraph(
  topic: string,
  domain: string,
  ideas: { title: string; description: string; model: string }[],
  synthesis: string,
): Promise<{ nodeIds: string[]; edgeCount: number }> {
  const store = storeManager.getGlobalStore();
  const savedNodeIds: string[] = [];
  let edgeCount = 0;

  // 각 모델의 아이디어를 Idea 노드로 저장
  for (const idea of ideas) {
    const nodeId = `debate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await store.addNode({
      id: nodeId,
      type: 'Idea',
      title: idea.title,
      description: idea.description,
      method: 'multi_model_debate',
      tags: [idea.model, domain],
      createdAt: new Date().toISOString(),
    });
    savedNodeIds.push(nodeId);
  }

  // 합성 노드 저장
  const synthesisId = `debate-synth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await store.addNode({
    id: synthesisId,
    type: 'Idea',
    title: `[Synthesis] ${topic}`,
    description: synthesis.slice(0, 1000),
    method: 'multi_model_debate',
    tags: ['synthesis', domain],
    createdAt: new Date().toISOString(),
  });
  savedNodeIds.push(synthesisId);

  // 개별 아이디어 → 합성 엣지 (INSPIRED_BY)
  for (const nodeId of savedNodeIds.slice(0, -1)) {
    await store.addEdge({
      id: `edge-debate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: synthesisId,
      target: nodeId,
      type: 'INSPIRED_BY',
      createdAt: new Date().toISOString(),
    });
    edgeCount++;
  }

  // 개별 아이디어끼리 SIMILAR_TO 엣지
  for (let i = 0; i < savedNodeIds.length - 2; i++) {
    for (let j = i + 1; j < savedNodeIds.length - 1; j++) {
      await store.addEdge({
        id: `edge-sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: savedNodeIds[i],
        target: savedNodeIds[j],
        type: 'SIMILAR_TO',
        createdAt: new Date().toISOString(),
      });
      edgeCount++;
    }
  }

  // debate-agent 노드 등록 + GENERATED_BY
  await ensureAgentNode({ role: 'multi_model_debate', name: 'Multi-Model Debate', theory: 'brainstorm-mcp pattern' });
  const genEdges = await linkAgentToNodes('multi_model_debate', savedNodeIds);
  edgeCount += genEdges.length;

  scheduleAutoSave();
  return { nodeIds: savedNodeIds, edgeCount };
}

/** 단일 모델에 프롬프트 전송 */
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

export const debateTool: AgentTool = {
  name: 'multi_model_debate',
  description: `Run a multi-model creative debate grounded in the knowledge graph. Reads existing ideas/concepts from the graph, sends them as context to multiple LLMs (Gemini, Claude, GPT) for parallel brainstorming, runs cross-model debate rounds, synthesizes, and saves ALL results back to the graph as Idea nodes with GENERATED_BY/INSPIRED_BY/SIMILAR_TO edges.

Use this when:
- You want diverse perspectives INFORMED by existing graph knowledge
- Cross-pollination between different AI "minds" + accumulated ideas
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

    const models = getAvailableModels();
    if (models.length === 0) {
      return {
        topic,
        error: 'No LLM API keys configured. Set at least GOOGLE_GENERATIVE_AI_API_KEY.',
        models: [],
        nodesCreated: 0,
        edgesCreated: 0,
      };
    }

    // ── 1. 그래프에서 기존 지식 로드 ──
    const graphContext = getGraphContext(topic, domain);

    const styleInstruction = style === 'redteam'
      ? 'Challenge and find weaknesses in other perspectives. Be critical.'
      : style === 'socratic'
      ? 'Ask probing questions about other perspectives. Dig deeper.'
      : 'Build on others\' ideas and offer your unique perspective.';

    let latestResponses: DebateResponse[] = [];

    // ── 2. Round 1: 그래프 지식 기반 독립 관점 생성 ──
    const round1System = `You are a creative thinker generating ideas about: "${topic}" (domain: ${domain}).

EXISTING KNOWLEDGE FROM THE GRAPH:
${graphContext}

IMPORTANT: Build on existing knowledge. Don't repeat ideas already in the graph. Find GAPS and NOVEL ANGLES.
Be specific, original, and practical. Generate 2-3 distinct ideas.
${styleInstruction}`;

    const startTime = Date.now();
    const round1Responses = await Promise.allSettled(
      models.map((m) => callModel(m, round1System, `Generate creative ideas about "${topic}" that go BEYOND what's already in the knowledge graph.`))
    );

    const round1 = round1Responses
      .filter((r): r is PromiseFulfilledResult<DebateResponse> => r.status === 'fulfilled')
      .map((r) => r.value);

    latestResponses = round1;
    let history = round1.map((r) => `[${r.model}]: ${r.content}`).join('\n\n');

    // ── 3. Round 2+: 교차 토론 ──
    for (let round = 2; round <= rounds; round++) {
      const roundSystem = `You are debating creative ideas about: "${topic}" (domain: ${domain}).

EXISTING KNOWLEDGE:
${graphContext.slice(0, 2000)}

Previous debate:
${history.slice(-6000)}

${styleInstruction}
Respond to others' ideas. Build on strengths, address weaknesses, propose combinations or new angles.`;

      const roundResponses = await Promise.allSettled(
        models.map((m) => callModel(m, roundSystem, `Continue the debate. Combine the best ideas from different perspectives.`))
      );

      const roundResult = roundResponses
        .filter((r): r is PromiseFulfilledResult<DebateResponse> => r.status === 'fulfilled')
        .map((r) => r.value);

      latestResponses = roundResult;
      history += '\n\n' + roundResult.map((r) => `[${r.model}]: ${r.content}`).join('\n\n');
    }

    // ── 4. 합성 ──
    const synthesisResp = await callModel(
      models[0],
      `You are synthesizing a multi-model creative debate about: "${topic}" (domain: ${domain}).

GRAPH CONTEXT (existing knowledge):
${graphContext.slice(0, 2000)}

FULL DEBATE:
${history.slice(-10000)}

Produce:
1. **Top 3 Ideas** — best ideas combining all perspectives, going BEYOND existing graph knowledge
2. **Key Insight** — single most creative insight that emerged
3. **Unresolved Tension** — biggest disagreement worth exploring further
4. **Graph Connections** — how these ideas connect to existing concepts in the graph`,
      `Synthesize the debate.`,
    );

    // ── 5. 결과를 그래프에 저장 (마지막 라운드의 정제된 아이디어) ──
    const ideas = latestResponses.map((r) => ({
      title: `[${r.model.split('/')[1]}] ${topic}`,
      description: r.content.slice(0, 500),
      model: r.model,
    }));

    const { nodeIds, edgeCount } = await saveDebateToGraph(topic, domain, ideas, synthesisResp.content);

    return {
      topic,
      models,
      rounds,
      totalDuration: Date.now() - startTime,
      graphContextUsed: graphContext.length > 50,
      nodesCreated: nodeIds.length,
      edgesCreated: edgeCount,
      synthesis: synthesisResp.content,
      savedNodeIds: nodeIds,
    };
  },
};
