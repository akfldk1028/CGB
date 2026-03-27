/** Multi-Agent Orchestrator — 여러 에이전트 자율 협업
 *
 * 4I's 파이프라인을 진짜 에이전트 팀으로 실행.
 * 각 에이전트는 자율적으로 도구를 사용하고, 결과를 Graph DB에 저장.
 * Orchestrator는 단계 간 전환만 관리.
 */

import type { AgentRole } from '@/types/agent';
import type { CreativeSession, PhaseResult } from '@/types/session';
import type { Idea } from '@/types/creativity';
import { runAgent, type AgentRunResult } from './agent-runner';
import { getMemoryStore } from '../tools/graph-tools';
import { getImmersionContext } from '@/modules/graph/service';
import { tournamentSelect } from '@/modules/creativity/evaluation/judge';

export interface MultiAgentResult {
  sessionId: string;
  topic: string;
  domain: string;
  agentResults: AgentRunResult[];
  totalNodesCreated: number;
  totalEdgesCreated: number;
  totalDuration: number;
  /** Graph snapshot at completion */
  graphSnapshot: { nodes: unknown[]; edges: unknown[] };
}

/** 4I's 멀티에이전트 파이프라인 — 진짜 자율 에이전트 버전 */
export async function runMultiAgentPipeline(
  topic: string,
  domain: string
): Promise<MultiAgentResult> {
  const sessionId = `session-${Date.now()}`;
  const startTime = Date.now();
  const agentResults: AgentRunResult[] = [];

  // Immersion: Graph DB에서 기존 지식 검색
  let graphContext = '';
  try {
    graphContext = await getImmersionContext(topic, domain);
  } catch {
    graphContext = 'Graph search unavailable.';
  }

  const baseContext = `Topic: "${topic}"\nDomain: "${domain}"\nSession: ${sessionId}\n\nPrior Knowledge from Graph DB:\n${graphContext}`;

  // Phase 1: IMMERSION — researcher가 자율적으로 웹 검색 + Graph 탐색
  const researchResult = await runAgent(
    'researcher',
    `Research the domain "${domain}" for topic "${topic}". You have prior knowledge from the graph database (see context). Build on existing knowledge, find NEW trends and gaps. Save key findings as Concept nodes in the graph.`,
    baseContext,
    8,
    domain
  );
  agentResults.push(researchResult);

  const truncate = (s: string, max = 500) => s.length > max ? s.slice(0, max) + '...[truncated]' : s;

  const researchContext = `${baseContext}\n\nResearch findings:\n${truncate(researchResult.finalOutput)}`;

  // Phase 2: INSPIRATION — divergent_thinker가 자율적으로 아이디어 생성
  const divergentResult = await runAgent(
    'divergent_thinker',
    `Generate 10+ creative ideas about "${topic}" in "${domain}". Use SCAMPER, brainstorming, TRIZ principles, and save everything to the graph.`,
    researchContext,
    12,
    domain
  );
  agentResults.push(divergentResult);

  const ideaContext = `${researchContext}\n\nGenerated ideas:\n${truncate(divergentResult.finalOutput)}`;

  // Phase 3: ISOLATION — evaluator + field_validator 독립 실행 (병렬)
  const [evalResult, fieldResult] = await Promise.all([
    runAgent(
      'evaluator',
      `Evaluate all generated ideas using the 6-dimensional framework (Amabile 3 + Agent Ideate 3). Score each on: domainRelevance, creativeThinking, intrinsicMotivation, specificity, marketNeed, competitiveAdvantage. Rank them.`,
      ideaContext,
      8,
      domain
    ),
    runAgent(
      'field_validator',
      `Validate the generated ideas against market reality. Use measure_novelty to check knowledge distance. Check originality, feasibility, demand.`,
      ideaContext,
      8,
      domain
    ),
  ]);
  agentResults.push(evalResult, fieldResult);

  // Phase 3.5: LLM-as-Judge tournament — 상위 아이디어 자동 선별
  const store = getMemoryStore();
  const ideaNodes = store.nodes.filter((n) => n.type === 'Idea' || n.type === 'Output');
  let tournamentContext = '';
  if (ideaNodes.length >= 4) {
    const candidates = ideaNodes.map((n) => ({ title: n.title, description: n.description }));
    const topIdeas = await tournamentSelect(candidates, domain, Math.min(5, Math.ceil(candidates.length / 2)));
    tournamentContext = `\n\nLLM-as-Judge Tournament Results (top ${topIdeas.length} of ${candidates.length}):\n` +
      topIdeas.map((idea, i) => `${i + 1}. "${idea.title}" (${idea.wins} wins)`).join('\n');
  }

  const evalContext = `${ideaContext}\n\nEvaluation:\n${truncate(evalResult.finalOutput)}\n\nField Validation:\n${truncate(fieldResult.finalOutput)}${tournamentContext}`;

  // Phase 4: ITERATION — iterator가 상위 아이디어를 자율적으로 변주
  const iterResult = await runAgent(
    'iterator',
    `Take the top-rated ideas and create meaningful iterations. Use measure_novelty to find high-novelty angles. Apply triz_principle for contradiction-based innovation. Find universal themes, apply to new contexts.`,
    evalContext,
    10,
    domain
  );
  agentResults.push(iterResult);

  return {
    sessionId,
    topic,
    domain,
    agentResults,
    totalNodesCreated: agentResults.reduce((sum, r) => sum + r.nodesCreated, 0),
    totalEdgesCreated: agentResults.reduce((sum, r) => sum + r.edgesCreated, 0),
    totalDuration: Date.now() - startTime,
    graphSnapshot: { nodes: [...store.nodes], edges: [...store.edges] },
  };
}

/** MultiAgentResult → CreativeSession 변환 (API 응답용) */
export function toCreativeSession(result: MultiAgentResult): CreativeSession {
  const store = result.graphSnapshot;
  const nodes = store.nodes as Array<{ id: string; title: string; description: string; type: string; method?: string; createdAt: string }>;

  // Graph 노드 → Idea 변환
  const toIdea = (n: typeof nodes[number], phase: string): Idea => ({
    id: n.id,
    title: n.title,
    description: n.description,
    theory: 'four_is',
    method: n.method,
    createdAt: n.createdAt,
  });

  // 에이전트별 생성 아이디어 추적
  const agentNodeCounts: Record<string, number> = {};
  for (const ar of result.agentResults) {
    agentNodeCounts[ar.role] = ar.nodesCreated;
  }

  // Phase별로 분류 (에이전트 실행 순서 기반)
  const researcherNodes = nodes.slice(0, agentNodeCounts['researcher'] ?? 0);
  const divergentEnd = (agentNodeCounts['researcher'] ?? 0) + (agentNodeCounts['divergent_thinker'] ?? 0);
  const divergentNodes = nodes.slice(agentNodeCounts['researcher'] ?? 0, divergentEnd);
  const iteratorNodes = nodes.slice(divergentEnd);

  const phases: CreativeSession['phases'] = {
    immersion: {
      phase: 'immersion',
      status: 'completed',
      ideas: researcherNodes.map((n) => toIdea(n, 'immersion')),
      metadata: {
        agent: 'researcher',
        steps: result.agentResults[0]?.steps.length ?? 0,
        toolsUsed: result.agentResults[0]?.toolsUsed ?? [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    inspiration: {
      phase: 'inspiration',
      status: 'completed',
      ideas: divergentNodes.map((n) => toIdea(n, 'inspiration')),
      metadata: {
        agent: 'divergent_thinker',
        steps: result.agentResults[1]?.steps.length ?? 0,
        toolsUsed: result.agentResults[1]?.toolsUsed ?? [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    isolation: {
      phase: 'isolation',
      status: 'completed',
      ideas: [], // evaluator/field_validator don't create ideas, they evaluate
      metadata: {
        evaluator: {
          steps: result.agentResults[2]?.steps.length ?? 0,
          toolsUsed: result.agentResults[2]?.toolsUsed ?? [],
          output: result.agentResults[2]?.finalOutput,
        },
        field_validator: {
          steps: result.agentResults[3]?.steps.length ?? 0,
          toolsUsed: result.agentResults[3]?.toolsUsed ?? [],
          output: result.agentResults[3]?.finalOutput,
        },
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    iteration: {
      phase: 'iteration',
      status: 'completed',
      ideas: iteratorNodes.map((n) => toIdea(n, 'iteration')),
      metadata: {
        agent: 'iterator',
        steps: result.agentResults[4]?.steps.length ?? 0,
        toolsUsed: result.agentResults[4]?.toolsUsed ?? [],
      },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  };

  const allIdeas = nodes.map((n) => toIdea(n, 'all'));

  return {
    id: result.sessionId,
    topic: result.topic,
    domain: result.domain,
    status: 'completed',
    mode: 'heavy', // agent mode = heavy
    phases,
    finalIdeas: allIdeas,
    totalGenerated: allIdeas.length,
    duration: result.totalDuration,
    createdAt: new Date(parseInt(result.sessionId.split('-')[1]) || Date.now()).toISOString(),
    completedAt: new Date().toISOString(),
  };
}