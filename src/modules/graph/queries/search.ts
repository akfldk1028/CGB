/** Graph 검색 쿼리 — 전체 노드 타입 대상 키워드 검색 */

export const SEARCH_QUERIES = {
  /** 전체 노드 타입 대상 텍스트 검색 */
  fullText: `
    MATCH (n)
    WHERE toLower(n.title) CONTAINS toLower($query)
       OR toLower(n.description) CONTAINS toLower($query)
       OR (n.name IS NOT NULL AND toLower(n.name) CONTAINS toLower($query))
    RETURN n, labels(n)[0] as nodeType
    ORDER BY
      CASE WHEN toLower(n.title) STARTS WITH toLower($query) THEN 0
           WHEN toLower(n.title) CONTAINS toLower($query) THEN 1
           ELSE 2 END
    LIMIT $limit
  `,

  /** 특정 노드 타입만 검색 */
  byType: `
    MATCH (n:$TYPE)
    WHERE toLower(n.title) CONTAINS toLower($query)
       OR toLower(n.description) CONTAINS toLower($query)
    RETURN n
    ORDER BY n.createdAt DESC
    LIMIT $limit
  `,

  /** 태그 기반 검색 */
  byTags: `
    MATCH (n:Idea)
    WHERE any(tag IN n.tags WHERE toLower(tag) CONTAINS toLower($query))
    RETURN n
    LIMIT $limit
  `,

  /** 도메인 내 검색 */
  withinDomain: `
    MATCH (d:Domain {id: $domainId})<-[:BELONGS_TO]-(t:Topic)<-[:ADDRESSES_TOPIC]-(n:Idea)
    WHERE toLower(n.title) CONTAINS toLower($query)
       OR toLower(n.description) CONTAINS toLower($query)
    RETURN n
    ORDER BY n.createdAt DESC
    LIMIT $limit
  `,
} as const;

/** In-memory 토큰 기반 검색 (Memgraph 미연결 시) */
export function tokenSearch(
  nodes: Array<{ id: string; type: string; title: string; description?: string; metadata?: Record<string, unknown> }>,
  query: string,
  options?: { type?: string; limit?: number }
): typeof nodes {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const limit = options?.limit ?? 20;

  return nodes
    .filter((n) => {
      if (options?.type && n.type !== options.type) return false;
      const haystack = `${n.title} ${n.description ?? ''} ${(n.metadata?.tags as string[])?.join(' ') ?? ''}`.toLowerCase();
      return tokens.some((t) => haystack.includes(t));
    })
    .sort((a, b) => {
      // 제목에 쿼리가 포함된 것 우선
      const aTitle = tokens.some((t) => a.title.toLowerCase().includes(t)) ? 0 : 1;
      const bTitle = tokens.some((t) => b.title.toLowerCase().includes(t)) ? 0 : 1;
      return aTitle - bTitle;
    })
    .slice(0, limit);
}
