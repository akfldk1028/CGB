/** Reasoning Trace 쿼리 — 에이전트 사고과정을 그래프에 영구 저장
 *
 * CCG 패턴: 3-Memory-Types의 episodic memory 구현
 * 구조: Session → HAS_TRACE → DecisionTrace → HAS_STEP → TraceStep
 *       Agent  → EXECUTED  → DecisionTrace
 *
 * 세션 끝나면 사라지던 steps[] 배열을 그래프 노드로 영구화.
 */

import { storeManager, type StoreNode, type StoreEdge } from '../store';
import { scheduleAutoSave } from '../persistence';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface SaveTraceParams {
  sessionId: string;
  agentRole: string;
  goal: string;
  summary: string;
  duration: number;
  toolsUsed: string[];
  steps: TraceStepInput[];
}

export interface TraceStepInput {
  stepIndex: number;
  thought: string;
  toolUsed?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  timestamp: string;
}

// ═══════════════════════════════════════════
// Cypher Queries (Memgraph 미래용)
// ═══════════════════════════════════════════

export const TRACE_QUERIES = {
  createTrace: `
    CREATE (t:DecisionTrace {
      id: $id, agentRole: $agentRole, goal: $goal,
      summary: $summary, stepCount: $stepCount,
      toolsUsed: $toolsUsed, duration: $duration,
      sessionId: $sessionId, createdAt: $createdAt
    })
    RETURN t
  `,

  createStep: `
    CREATE (s:TraceStep {
      id: $id, stepIndex: $stepIndex, thought: $thought,
      toolUsed: $toolUsed, traceId: $traceId, createdAt: $createdAt
    })
    RETURN s
  `,

  getBySession: `
    MATCH (s:Session {id: $sessionId})-[:HAS_TRACE]->(t:DecisionTrace)
    RETURN t ORDER BY t.createdAt
  `,

  getSteps: `
    MATCH (t:DecisionTrace {id: $traceId})-[:HAS_STEP]->(s:TraceStep)
    RETURN s ORDER BY s.stepIndex
  `,

  getByAgent: `
    MATCH (a:Agent {role: $agentRole})-[:EXECUTED]->(t:DecisionTrace)
    RETURN t ORDER BY t.createdAt DESC
    LIMIT $limit
  `,
} as const;

// ═══════════════════════════════════════════
// InMemory 구현
// ═══════════════════════════════════════════

/** 에이전트 실행 결과를 DecisionTrace + TraceStep 노드로 그래프에 저장 */
export async function saveTrace(params: SaveTraceParams): Promise<{
  traceNode: StoreNode;
  stepNodes: StoreNode[];
  edges: StoreEdge[];
}> {
  const store = storeManager.getGlobalStore();
  const traceId = `trace-${params.agentRole}-${Date.now()}`;
  const now = new Date().toISOString();

  // 1. DecisionTrace 노드 생성
  const traceNode: StoreNode = {
    id: traceId,
    type: 'DecisionTrace',
    title: `${params.agentRole}: ${truncate(params.goal, 60)}`,
    description: params.summary,
    method: params.agentRole,
    tags: params.toolsUsed,
    score: params.duration,
    createdAt: now,
  };
  await store.addNode(traceNode);

  // 2. TraceStep 노드들 생성
  const stepNodes: StoreNode[] = [];
  for (const step of params.steps) {
    const stepNode: StoreNode = {
      id: `${traceId}-step-${step.stepIndex}`,
      type: 'TraceStep',
      title: step.toolUsed
        ? `[${step.toolUsed}] ${truncate(step.thought, 50)}`
        : truncate(step.thought, 60),
      description: step.thought,
      method: step.toolUsed,
      tags: step.toolInput ? Object.keys(step.toolInput) : undefined,
      createdAt: step.timestamp,
    };
    await store.addNode(stepNode);
    stepNodes.push(stepNode);
  }

  // 3. 엣지 생성
  const edges: StoreEdge[] = [];
  const addEdge = async (source: string, target: string, type: string) => {
    const edge: StoreEdge = {
      id: `edge-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      target,
      type,
      createdAt: now,
    };
    await store.addEdge(edge);
    edges.push(edge);
  };

  // Session → HAS_TRACE → DecisionTrace
  await addEdge(params.sessionId, traceId, 'HAS_TRACE');

  // Agent → EXECUTED → DecisionTrace
  const agentId = `agent-${params.agentRole}`;
  await addEdge(agentId, traceId, 'EXECUTED');

  // DecisionTrace → HAS_STEP → TraceStep (각 스텝)
  for (const stepNode of stepNodes) {
    await addEdge(traceId, stepNode.id, 'HAS_STEP');
  }

  scheduleAutoSave();

  return { traceNode, stepNodes, edges };
}

/** 세션의 모든 DecisionTrace 조회 */
export function getTracesBySession(sessionId: string): StoreNode[] {
  const store = storeManager.getGlobalStore();
  const traceIds = new Set(
    store.getAllEdges()
      .filter((e) => e.source === sessionId && e.type === 'HAS_TRACE')
      .map((e) => e.target)
  );
  return store.getAllNodes()
    .filter((n) => traceIds.has(n.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** DecisionTrace의 모든 TraceStep 조회 (순서대로) */
export function getTraceSteps(traceId: string): StoreNode[] {
  const store = storeManager.getGlobalStore();
  const stepIds = new Set(
    store.getAllEdges()
      .filter((e) => e.source === traceId && e.type === 'HAS_STEP')
      .map((e) => e.target)
  );
  return store.getAllNodes()
    .filter((n) => stepIds.has(n.id))
    .sort((a, b) => {
      // step index 기반 정렬 (id에서 추출)
      const aIdx = parseInt(a.id.split('-step-').pop() ?? '0');
      const bIdx = parseInt(b.id.split('-step-').pop() ?? '0');
      return aIdx - bIdx;
    });
}

/** 에이전트별 최근 trace 조회 */
export function getTracesByAgent(agentRole: string, limit = 10): StoreNode[] {
  const store = storeManager.getGlobalStore();
  const agentId = `agent-${agentRole}`;
  const traceIds = new Set(
    store.getAllEdges()
      .filter((e) => e.source === agentId && e.type === 'EXECUTED')
      .map((e) => e.target)
  );
  return store.getAllNodes()
    .filter((n) => traceIds.has(n.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** 전체 trace 통계 */
export function getTraceStats(): {
  totalTraces: number;
  totalSteps: number;
  byAgent: Record<string, number>;
  avgStepsPerTrace: number;
} {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const traces = allNodes.filter((n) => n.type === 'DecisionTrace');
  const steps = allNodes.filter((n) => n.type === 'TraceStep');

  const byAgent: Record<string, number> = {};
  for (const t of traces) {
    const role = t.method ?? 'unknown';
    byAgent[role] = (byAgent[role] ?? 0) + 1;
  }

  return {
    totalTraces: traces.length,
    totalSteps: steps.length,
    byAgent,
    avgStepsPerTrace: traces.length > 0 ? steps.length / traces.length : 0,
  };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}
