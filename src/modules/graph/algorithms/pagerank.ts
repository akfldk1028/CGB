/** PageRank — 그래프 중심성 분석
 *
 * Power iteration 방식. 가장 많이 연결된 (= 영향력 있는) 노드를 식별.
 * CGB에서: 가장 핵심적인 Idea/Concept 노드를 찾는 데 사용.
 *
 * 참조: Page, Brin et al. (1999). "The PageRank Citation Ranking"
 */

import { storeManager } from '../store';

export interface PageRankResult {
  nodeId: string;
  title: string;
  type: string;
  score: number;
}

export interface PageRankOptions {
  damping?: number;      // 기본 0.85
  iterations?: number;   // 기본 20
  nodeTypes?: string[];  // 필터 (미지정 시 전체)
  topK?: number;         // 상위 N개 반환 (기본 20)
}

/** In-memory PageRank — power iteration */
export function runPageRank(options: PageRankOptions = {}): PageRankResult[] {
  const {
    damping = 0.85,
    iterations = 20,
    nodeTypes,
    topK = 20,
  } = options;

  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  // 필터링
  const nodes = nodeTypes
    ? allNodes.filter((n) => nodeTypes.includes(n.type))
    : allNodes;

  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Adjacency: outgoing edges per node
  const outgoing = new Map<string, string[]>();
  for (const edge of allEdges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    outgoing.get(edge.source)!.push(edge.target);
  }

  const N = nodes.length;
  const initScore = 1 / N;

  // Initialize scores
  let scores = new Map<string, number>();
  for (const id of nodeIds) {
    scores.set(id, initScore);
  }

  // Power iteration
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, number>();
    for (const id of nodeIds) {
      next.set(id, (1 - damping) / N);
    }

    for (const [sourceId, targets] of outgoing) {
      const contribution = (scores.get(sourceId) ?? 0) / targets.length;
      for (const targetId of targets) {
        next.set(targetId, (next.get(targetId) ?? 0) + damping * contribution);
      }
    }

    scores = next;
  }

  // Sort and return top K
  return [...scores.entries()]
    .map(([nodeId, score]) => {
      const node = nodeMap.get(nodeId)!;
      return { nodeId, title: node.title, type: node.type, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
