/** Agent Node Management — 에이전트를 그래프의 1등 시민으로
 *
 * 설계:
 * - 에이전트가 처음 실행될 때 Agent 노드 자동 생성 (중복 방지)
 * - 아이디어 생성 시 GENERATED_BY 엣지로 Agent→Idea 연결
 * - 외부 에이전트도 같은 방식으로 등록 (MCP를 통해)
 *
 * Rhodes (1961) 4P's의 "Person" — AI 에이전트 맥락에서 재해석
 */

import { storeManager, type StoreNode, type StoreEdge } from '../store';
import { scheduleAutoSave } from '../persistence';

/** 에이전트 등록 파라미터 */
export interface RegisterAgentParams {
  role: string;
  name?: string;
  theory?: string;
  tools?: string[];
  /** 외부 에이전트 식별 (MCP 등) */
  externalId?: string;
}

/** Agent 노드 ID 생성 — role 기반으로 deterministic */
function agentNodeId(role: string, externalId?: string): string {
  if (externalId) return `agent-ext-${externalId}`;
  return `agent-${role}`;
}

/** 에이전트 노드 확보 (없으면 생성, 있으면 반환)
 *  세션 시작 시 또는 에이전트 첫 실행 시 호출 */
export async function ensureAgentNode(params: RegisterAgentParams): Promise<StoreNode> {
  const store = storeManager.getGlobalStore();
  const id = agentNodeId(params.role, params.externalId);

  // 이미 존재하면 반환
  const existing = await store.getNode(id);
  if (existing) {
    if (params.tools?.length) {
      const prev = existing.tags ?? [];
      existing.tags = [...new Set([...prev, ...params.tools])];
    }
    return existing;
  }

  // 새 Agent 노드 생성 — store 인터페이스를 통해 (eviction 포함)
  const node: StoreNode = {
    id,
    type: 'Agent',
    title: params.name ?? params.role,
    description: params.theory
      ? `Agent: ${params.role} — ${params.theory}`
      : `Agent: ${params.role}`,
    method: params.externalId ? 'external' : 'internal',
    tags: params.tools ?? [],
    createdAt: new Date().toISOString(),
  };

  await store.addNode(node);
  scheduleAutoSave();
  return node;
}

/** 에이전트→아이디어 GENERATED_BY 엣지 생성
 *  에이전트가 생성한 모든 노드에 대해 호출 */
export async function linkAgentToNodes(
  agentRole: string,
  nodeIds: string[],
  externalId?: string,
): Promise<StoreEdge[]> {
  const store = storeManager.getGlobalStore();
  const agentId = agentNodeId(agentRole, externalId);
  const edges: StoreEdge[] = [];

  const existingEdgeSet = new Set(
    store.getAllEdges()
      .filter((e) => e.type === 'GENERATED_BY' && e.source === agentId)
      .map((e) => e.target)
  );

  for (const nodeId of nodeIds) {
    if (existingEdgeSet.has(nodeId)) continue;

    const edge: StoreEdge = {
      id: `edge-gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: agentId,
      target: nodeId,
      type: 'GENERATED_BY',
      createdAt: new Date().toISOString(),
    };
    await store.addEdge(edge);
    edges.push(edge);
  }

  if (edges.length > 0) scheduleAutoSave();
  return edges;
}

/** 등록된 에이전트 목록 조회 */
export function listAgentNodes(): StoreNode[] {
  const store = storeManager.getGlobalStore();
  return store.getAllNodes().filter((n) => n.type === 'Agent');
}

/** 특정 에이전트의 기여 통계 */
export function getAgentStats(agentRole: string, externalId?: string): {
  agentId: string;
  nodesGenerated: number;
  toolsUsed: string[];
  domains: string[];
} {
  const store = storeManager.getGlobalStore();
  const agentId = agentNodeId(agentRole, externalId);
  const agentNode = store.getAllNodes().find((n) => n.id === agentId);

  // GENERATED_BY 엣지에서 기여 노드 찾기
  const generatedNodeIds = store.getAllEdges()
    .filter((e) => e.type === 'GENERATED_BY' && e.source === agentId)
    .map((e) => e.target);

  // 기여한 도메인 추출
  const domains = new Set<string>();
  const allEdges = store.getAllEdges();
  for (const nodeId of generatedNodeIds) {
    const domainEdge = allEdges.find(
      (e) => e.source === nodeId && e.type === 'BELONGS_TO'
    );
    if (domainEdge) {
      const domainNode = store.getAllNodes().find((n) => n.id === domainEdge.target);
      if (domainNode) domains.add(domainNode.title);
    }
  }

  return {
    agentId,
    nodesGenerated: generatedNodeIds.length,
    toolsUsed: agentNode?.tags ?? [],
    domains: [...domains],
  };
}
