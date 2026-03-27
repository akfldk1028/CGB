/** Graph 순회 쿼리 — 아이디어 네트워크 탐색
 *
 * 근거: KG-Agent (2024) — knowledge graph를 통한 자율 탐색
 * 용도: Immersion phase에서 기존 지식 탐색, Novelty 측정
 */

export const TRAVERSAL_QUERIES = {
  /** 특정 노드에서 N홉 이내의 모든 연결 노드 */
  neighborhood: `
    MATCH (start {id: $startId})
    MATCH path = (start)-[*1..$maxHops]-(neighbor)
    WITH neighbor, min(length(path)) as distance
    RETURN neighbor, distance
    ORDER BY distance
    LIMIT $limit
  `,

  /** 두 노드 간 최단 경로 */
  shortestPath: `
    MATCH (a {id: $sourceId}), (b {id: $targetId})
    MATCH path = shortestPath((a)-[*..6]-(b))
    RETURN nodes(path) as pathNodes, relationships(path) as pathEdges, length(path) as distance
  `,

  /** 서브그래프 추출 (시각화용) — 특정 노드 중심 */
  subgraph: `
    MATCH (center {id: $centerId})
    OPTIONAL MATCH (center)-[r1]-(n1)
    OPTIONAL MATCH (n1)-[r2]-(n2)
    WHERE n2 <> center
    WITH collect(DISTINCT center) + collect(DISTINCT n1) + collect(DISTINCT n2) as allNodes,
         collect(DISTINCT r1) + collect(DISTINCT r2) as allEdges
    RETURN allNodes, allEdges
  `,

  /** 전체 그래프 통계 */
  stats: `
    MATCH (n)
    WITH labels(n)[0] as nodeType, count(n) as cnt
    RETURN nodeType, cnt
    ORDER BY cnt DESC
  `,

  /** 전체 그래프 (시각화용, 제한) */
  fullGraph: `
    MATCH (n)
    WITH n LIMIT $nodeLimit
    OPTIONAL MATCH (n)-[r]-(m)
    WHERE id(m) <= id(n)
    RETURN collect(DISTINCT n) as nodes, collect(DISTINCT r) as edges
  `,
} as const;

/** In-memory BFS 이웃 탐색 */
export function bfsNeighborhood(
  startId: string,
  edges: Array<{ source: string; target: string; type: string }>,
  maxHops: number = 2,
  limit: number = 50
): Array<{ id: string; distance: number }> {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }

  const visited = new Map<string, number>([[startId, 0]]);
  const queue: [string, number][] = [[startId, 0]];
  const results: Array<{ id: string; distance: number }> = [];

  while (queue.length > 0 && results.length < limit) {
    const [current, depth] = queue.shift()!;
    if (depth > maxHops) break;

    const neighbors = adjacency.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, depth + 1);
        results.push({ id: neighbor, distance: depth + 1 });
        if (depth + 1 < maxHops) {
          queue.push([neighbor, depth + 1]);
        }
      }
    }
  }

  return results;
}
