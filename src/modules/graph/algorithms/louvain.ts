/** Louvain Community Detection — 아이디어 클러스터 자동 발견
 *
 * Modularity 최적화 기반. 밀접하게 연결된 노드들을 같은 커뮤니티로 묶음.
 * CGB에서: 관련 아이디어 그룹 자동 발견, Brain View에서 클러스터 하이라이트.
 *
 * 참조: Blondel et al. (2008). "Fast unfolding of communities in large networks"
 *
 * 간소화 구현: Phase 1 (local moving) 만 수행. <10K 노드에서 충분.
 */

import { storeManager } from '../store';

export interface CommunityResult {
  nodeId: string;
  title: string;
  type: string;
  communityId: number;
}

export interface LouvainOptions {
  nodeTypes?: string[];  // 필터 (미지정 시 전체)
  maxIterations?: number; // 기본 10
}

export interface LouvainSummary {
  communities: CommunityResult[];
  communityCount: number;
  modularity: number;
  /** 커뮤니티별 노드 수 */
  sizes: Map<number, number>;
}

/** In-memory Louvain — Phase 1 local moving */
export function runLouvain(options: LouvainOptions = {}): LouvainSummary {
  const { nodeTypes, maxIterations = 10 } = options;

  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  const nodes = nodeTypes
    ? allNodes.filter((n) => nodeTypes.includes(n.type))
    : allNodes;

  if (nodes.length === 0) {
    return { communities: [], communityCount: 0, modularity: 0, sizes: new Map() };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build undirected adjacency with weights
  const adj = new Map<string, Map<string, number>>();
  for (const id of nodeIds) adj.set(id, new Map());

  let totalWeight = 0;
  for (const edge of allEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    const w = 1; // uniform weight
    adj.get(edge.source)!.set(edge.target, (adj.get(edge.source)!.get(edge.target) ?? 0) + w);
    adj.get(edge.target)!.set(edge.source, (adj.get(edge.target)!.get(edge.source) ?? 0) + w);
    totalWeight += w;
  }

  if (totalWeight === 0) {
    // No edges — each node is its own community
    const communities = nodes.map((n, i) => ({
      nodeId: n.id, title: n.title, type: n.type, communityId: i,
    }));
    return { communities, communityCount: nodes.length, modularity: 0, sizes: new Map(nodes.map((_, i) => [i, 1])) };
  }

  const m2 = totalWeight * 2; // sum of all edges (undirected, counted twice)

  // Node degree (sum of edge weights)
  const degree = new Map<string, number>();
  for (const [id, neighbors] of adj) {
    let d = 0;
    for (const w of neighbors.values()) d += w;
    degree.set(id, d);
  }

  // Initial: each node in its own community
  const community = new Map<string, number>();
  let nextCommunityId = 0;
  for (const id of nodeIds) {
    community.set(id, nextCommunityId++);
  }

  // Community internal weight and total degree
  const communityInternalWeight = new Map<number, number>();
  const communityTotalDegree = new Map<number, number>();
  for (const id of nodeIds) {
    const c = community.get(id)!;
    communityInternalWeight.set(c, 0);
    communityTotalDegree.set(c, degree.get(id) ?? 0);
  }

  // Phase 1: Local moving
  const nodeList = [...nodeIds];
  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;

    for (const nodeId of nodeList) {
      const currentCom = community.get(nodeId)!;
      const ki = degree.get(nodeId) ?? 0;
      const neighbors = adj.get(nodeId)!;

      // Calculate edges to each neighbor community
      const comWeights = new Map<number, number>();
      for (const [neighbor, w] of neighbors) {
        const neighborCom = community.get(neighbor)!;
        comWeights.set(neighborCom, (comWeights.get(neighborCom) ?? 0) + w);
      }

      // Remove node from current community
      const kiIn = comWeights.get(currentCom) ?? 0;
      communityTotalDegree.set(currentCom, (communityTotalDegree.get(currentCom) ?? 0) - ki);
      communityInternalWeight.set(currentCom, (communityInternalWeight.get(currentCom) ?? 0) - kiIn);

      // Find best community
      let bestCom = currentCom;
      let bestDeltaQ = 0;

      for (const [targetCom, kinTarget] of comWeights) {
        const sigmaTot = communityTotalDegree.get(targetCom) ?? 0;
        // Delta Q = [kinTarget / m2] - [sigmaTot * ki / (m2 * m2) * 2]
        const deltaQ = kinTarget / m2 - (sigmaTot * ki) / (m2 * m2 / 2);
        if (deltaQ > bestDeltaQ) {
          bestDeltaQ = deltaQ;
          bestCom = targetCom;
        }
      }

      // Move node to best community
      community.set(nodeId, bestCom);
      const kiBest = comWeights.get(bestCom) ?? 0;
      communityTotalDegree.set(bestCom, (communityTotalDegree.get(bestCom) ?? 0) + ki);
      communityInternalWeight.set(bestCom, (communityInternalWeight.get(bestCom) ?? 0) + kiBest);

      if (bestCom !== currentCom) moved = true;
    }

    if (!moved) break; // Converged
  }

  // Renumber communities (compact IDs)
  const comRemap = new Map<number, number>();
  let compactId = 0;
  for (const c of community.values()) {
    if (!comRemap.has(c)) comRemap.set(c, compactId++);
  }

  const communities: CommunityResult[] = nodes.map((n) => ({
    nodeId: n.id,
    title: n.title,
    type: n.type,
    communityId: comRemap.get(community.get(n.id)!)!,
  }));

  // Calculate modularity
  let Q = 0;
  for (const edge of allEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (community.get(edge.source) === community.get(edge.target)) {
      const ki = degree.get(edge.source) ?? 0;
      const kj = degree.get(edge.target) ?? 0;
      Q += 1 - (ki * kj) / m2;
    }
  }
  Q /= (m2 / 2);

  // Community sizes
  const sizes = new Map<number, number>();
  for (const c of communities) {
    sizes.set(c.communityId, (sizes.get(c.communityId) ?? 0) + 1);
  }

  return {
    communities,
    communityCount: compactId,
    modularity: Q,
    sizes,
  };
}
