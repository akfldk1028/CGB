/** Graph 거리 기반 Novelty Score 계산
 *
 * 근거: Luo et al. (2022). "Guiding Data-Driven Design Ideation by Knowledge Distance"
 * Knowledge-Based Systems, 218, 106873.
 *
 * 핵심: 의미적으로 먼 개념을 연결할수록 더 창의적
 * 구현: 새 아이디어에서 가장 가까운 기존 아이디어까지의 최단 경로
 */

import { pathLengthToNovelty } from '@/modules/agents/tools/novelty-tool';

/** Memgraph Cypher 쿼리 — 최단 경로 기반 novelty */
export const NOVELTY_QUERY = `
MATCH (target:Idea {id: $ideaId})
MATCH (other:Idea)
WHERE other.id <> target.id
MATCH path = shortestPath((target)-[*..5]-(other))
RETURN min(length(path)) as minDistance, count(other) as totalIdeas
`;

/** In-memory fallback (Memgraph 미연결 시) */
export function calculateNoveltyInMemory(
  ideaId: string,
  allEdges: { source: string; target: string }[]
): number {
  // BFS로 최단 경로 계산
  const adjacency = new Map<string, Set<string>>();
  for (const edge of allEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  if (!adjacency.has(ideaId)) return pathLengthToNovelty(null); // 고립 = 100점

  // BFS
  const visited = new Set<string>([ideaId]);
  const queue: [string, number][] = [[ideaId, 0]];
  let minDistance: number | null = null;

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    if (depth > 5) break; // 최대 5홉

    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        if (neighbor.startsWith('idea-') && neighbor !== ideaId) {
          minDistance = minDistance === null ? depth + 1 : Math.min(minDistance, depth + 1);
        }
        queue.push([neighbor, depth + 1]);
      }
    }
  }

  return pathLengthToNovelty(minDistance);
}
