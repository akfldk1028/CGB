/** KNN Similarity — 그래프 구조 기반 노드 유사도
 *
 * Jaccard similarity on neighbor sets.
 * BFS novelty(최단경로)보다 정교: "이웃 구조가 비슷한 노드 = 유사한 아이디어".
 *
 * CGB에서: 유사한 아이디어 자동 발견, 중복 감지, 융합 후보 추천.
 *
 * FastRP(CCG 패턴)는 Neo4j GDS 전용이므로, Jaccard로 대체.
 * Jaccard(A,B) = |neighbors(A) ∩ neighbors(B)| / |neighbors(A) ∪ neighbors(B)|
 */

import { storeManager } from '../store';

export interface SimilarityPair {
  node1Id: string;
  node1Title: string;
  node2Id: string;
  node2Title: string;
  similarity: number;
}

export interface SimilarityOptions {
  nodeTypes?: string[];  // 필터 (미지정 시 Idea만)
  topK?: number;         // 상위 N쌍 (기본 20)
  minSimilarity?: number; // 최소 유사도 (기본 0.1)
}

/** Jaccard similarity between two sets */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/** In-memory KNN Similarity — Jaccard on neighbor sets */
export function runSimilarity(options: SimilarityOptions = {}): SimilarityPair[] {
  const {
    nodeTypes = ['Idea'],
    topK = 20,
    minSimilarity = 0.1,
  } = options;

  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  const nodes = allNodes.filter((n) => nodeTypes.includes(n.type));
  if (nodes.length < 2) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build neighbor sets (undirected, include all edge types)
  const neighbors = new Map<string, Set<string>>();
  for (const id of nodeIds) neighbors.set(id, new Set());

  for (const edge of allEdges) {
    // Include edges where at least one end is in our node set
    if (nodeIds.has(edge.source)) {
      neighbors.get(edge.source)!.add(edge.target);
    }
    if (nodeIds.has(edge.target)) {
      neighbors.get(edge.target)!.add(edge.source);
    }
  }

  // Calculate pairwise Jaccard similarity
  const pairs: SimilarityPair[] = [];
  const nodeList = [...nodeIds];

  for (let i = 0; i < nodeList.length; i++) {
    const a = nodeList[i];
    const neighborsA = neighbors.get(a)!;
    if (neighborsA.size === 0) continue;

    for (let j = i + 1; j < nodeList.length; j++) {
      const b = nodeList[j];
      const neighborsB = neighbors.get(b)!;
      if (neighborsB.size === 0) continue;

      const sim = jaccard(neighborsA, neighborsB);
      if (sim >= minSimilarity) {
        const nodeA = nodeMap.get(a)!;
        const nodeB = nodeMap.get(b)!;
        pairs.push({
          node1Id: a,
          node1Title: nodeA.title,
          node2Id: b,
          node2Title: nodeB.title,
          similarity: sim,
        });
      }
    }
  }

  return pairs
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/** 특정 노드의 가장 유사한 노드 K개 */
export function findSimilarNodes(
  nodeId: string,
  k = 5,
  nodeTypes = ['Idea']
): SimilarityPair[] {
  const store = storeManager.getGlobalStore();
  const allNodes = store.getAllNodes();
  const allEdges = store.getAllEdges();

  const targetNode = allNodes.find((n) => n.id === nodeId);
  if (!targetNode) return [];

  const candidates = allNodes.filter((n) => nodeTypes.includes(n.type) && n.id !== nodeId);
  if (candidates.length === 0) return [];

  // Build neighbor sets
  const getNeighbors = (id: string): Set<string> => {
    const result = new Set<string>();
    for (const edge of allEdges) {
      if (edge.source === id) result.add(edge.target);
      if (edge.target === id) result.add(edge.source);
    }
    return result;
  };

  const targetNeighbors = getNeighbors(nodeId);
  if (targetNeighbors.size === 0) return [];

  const pairs: SimilarityPair[] = [];
  for (const candidate of candidates) {
    const candidateNeighbors = getNeighbors(candidate.id);
    if (candidateNeighbors.size === 0) continue;

    const sim = jaccard(targetNeighbors, candidateNeighbors);
    if (sim > 0) {
      pairs.push({
        node1Id: nodeId,
        node1Title: targetNode.title,
        node2Id: candidate.id,
        node2Title: candidate.title,
        similarity: sim,
      });
    }
  }

  return pairs
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
