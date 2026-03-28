/** Brain Views — 단일 그래프, 다중 뷰 필터링
 *
 * 설계 원칙:
 * - 모든 노드는 하나의 그래프에 존재 (Knowledge Distance 측정에 필수)
 * - "뇌"는 필터/뷰일 뿐 별도 저장소가 아님
 * - Collective Brain = 필터 없음 = 전체 = "뇌를 합치는 뇌"
 *
 * 5가지 뷰:
 * - collective: 전체 그래프 (메타 뇌)
 * - domain:     BELONGS_TO 엣지 기준 도메인 서브그래프
 * - user:       userId 기준 개인 서브그래프
 * - agent:      GENERATED_BY 엣지 기준 에이전트별 기여
 * - visual:     imageUrl이 있는 노드만 (시각적 영감)
 */

import { storeManager, type StoreNode, type StoreEdge } from '../store';

export type BrainView = 'collective' | 'domain' | 'user' | 'agent' | 'visual';

export interface BrainViewOptions {
  /** domain view: 도메인 ID 또는 이름 */
  domainId?: string;
  /** user view: 사용자 ID */
  userId?: string;
  /** agent view: 에이전트 role 또는 ID */
  agentId?: string;
  /** 결과 제한 */
  limit?: number;
}

export interface BrainViewResult {
  view: BrainView;
  nodes: StoreNode[];
  edges: StoreEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    byType: Record<string, number>;
  };
}

/** 뇌 뷰 쿼리 — 단일 그래프에서 필터링 */
export function queryBrainView(
  view: BrainView,
  options: BrainViewOptions = {},
): BrainViewResult {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();
  const limit = options.limit ?? 500;

  let filteredNodes: StoreNode[];

  switch (view) {
    case 'collective':
      // 전체 — 필터 없음
      filteredNodes = allNodes.slice(-limit);
      break;

    case 'domain':
      filteredNodes = filterByDomain(allNodes, allEdges, options.domainId, limit);
      break;

    case 'user':
      filteredNodes = options.userId
        ? allNodes.filter((n) => n.userId === options.userId).slice(-limit)
        : allNodes.slice(-limit);
      break;

    case 'agent':
      filteredNodes = filterByAgent(allNodes, allEdges, options.agentId, limit);
      break;

    case 'visual':
      filteredNodes = allNodes.filter((n) => n.imageUrl).slice(-limit);
      break;

    default:
      filteredNodes = allNodes.slice(-limit);
  }

  // 필터된 노드 간의 엣지만 추출
  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = allEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  // 타입별 통계
  const byType: Record<string, number> = {};
  for (const n of filteredNodes) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }

  return {
    view,
    nodes: filteredNodes,
    edges: filteredEdges,
    stats: {
      totalNodes: filteredNodes.length,
      totalEdges: filteredEdges.length,
      byType,
    },
  };
}

/** 도메인별 필터 — BELONGS_TO 엣지 체인을 따라 서브그래프 추출 */
function filterByDomain(
  allNodes: StoreNode[],
  allEdges: StoreEdge[],
  domainId: string | undefined,
  limit: number,
): StoreNode[] {
  if (!domainId) {
    // 도메인 목록 반환
    return allNodes.filter((n) => n.type === 'Domain').slice(-limit);
  }

  // 도메인에 속한 모든 노드 수집 (BFS via BELONGS_TO + ADDRESSES_TOPIC)
  const memberIds = new Set<string>([domainId]);
  const queue = [domainId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of allEdges) {
      // source --BELONGS_TO/ADDRESSES_TOPIC--> current
      if (edge.target === current && (edge.type === 'BELONGS_TO' || edge.type === 'ADDRESSES_TOPIC')) {
        if (!memberIds.has(edge.source)) {
          memberIds.add(edge.source);
          queue.push(edge.source);
        }
      }
      // current --> target (PRODUCED_IN 등 역방향)
      if (edge.source === current && edge.type === 'PRODUCED_IN') {
        if (!memberIds.has(edge.target)) {
          memberIds.add(edge.target);
        }
      }
    }
  }

  return allNodes.filter((n) => memberIds.has(n.id)).slice(-limit);
}

/** 에이전트별 필터 — GENERATED_BY 엣지 기준 */
function filterByAgent(
  allNodes: StoreNode[],
  allEdges: StoreEdge[],
  agentId: string | undefined,
  limit: number,
): StoreNode[] {
  if (!agentId) {
    // 에이전트 목록 반환
    return allNodes.filter((n) => n.type === 'Agent').slice(-limit);
  }

  // agentId가 role 이름일 수 있음 (e.g. "researcher" → "agent-researcher")
  const normalizedId = agentId.startsWith('agent-') ? agentId : `agent-${agentId}`;

  // 에이전트가 생성한 노드 ID들
  const generatedIds = new Set<string>(
    allEdges
      .filter((e) => e.type === 'GENERATED_BY' && (e.source === normalizedId || e.source === agentId))
      .map((e) => e.target)
  );

  // 에이전트 노드 자체도 포함
  generatedIds.add(normalizedId);
  generatedIds.add(agentId);

  return allNodes.filter((n) => generatedIds.has(n.id)).slice(-limit);
}

/** 도메인 목록 조회 (뷰 선택 UI용) */
export function listDomains(): { id: string; name: string; nodeCount: number }[] {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  const domains = allNodes.filter((n) => n.type === 'Domain');

  return domains.map((d) => {
    const memberCount = allEdges.filter(
      (e) => e.target === d.id && e.type === 'BELONGS_TO'
    ).length;
    return { id: d.id, name: d.title, nodeCount: memberCount };
  });
}

/** 에이전트 목록 조회 (뷰 선택 UI용) */
export function listAgents(): { id: string; role: string; nodesGenerated: number }[] {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  const agents = allNodes.filter((n) => n.type === 'Agent');

  return agents.map((a) => {
    const genCount = allEdges.filter(
      (e) => e.type === 'GENERATED_BY' && e.source === a.id
    ).length;
    return { id: a.id, role: a.title, nodesGenerated: genCount };
  });
}
