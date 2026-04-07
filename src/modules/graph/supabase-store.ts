/** SupabaseGraphStore — pgvector + PostgREST 기반 영속 그래프 저장소
 *
 * Graph v2: InMemory → Supabase pgvector 전환
 * - cosine similarity (embedding vector(768))
 * - BM25 full-text (tsvector)
 * - BFS graph traversal (recursive CTE)
 * - RRF 합산 (graph_hybrid_search RPC)
 *
 * 테이블: graph_nodes, graph_edges (migration 017)
 */

import type { GraphStore, StoreNode, StoreEdge, ListOptions, SearchOptions, StoreStats } from './store';
import { supabaseRest, supabaseRpc } from '@/lib/supabase';
import { embed, toEmbedText } from '@/lib/embedding';

// ═══════════════════════════════════════════
// DB row ↔ StoreNode/StoreEdge 변환
// ═══════════════════════════════════════════

interface DbNode {
  id: string;
  agent_id: string | null;
  domain: string | null;
  layer: number;
  type: string;
  title: string;
  description: string | null;
  embedding: string | null; // pgvector returns as string
  score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  expired_at: string | null;
}

interface DbEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  metadata: Record<string, unknown>;
  created_at: string;
  expired_at: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

interface HybridSearchResult extends DbNode {
  rrf_score: number;
}

function dbToStoreNode(db: DbNode): StoreNode {
  return {
    id: db.id,
    type: db.type,
    title: db.title,
    description: db.description ?? '',
    score: db.score ?? undefined,
    agentId: db.agent_id ?? undefined,
    domain: db.domain ?? undefined,
    layer: db.layer,
    metadata: db.metadata,
    createdAt: db.created_at,
    expiredAt: db.expired_at ?? undefined,
    // tags, method, userId, imageUrl from metadata
    tags: (db.metadata?.tags as string[]) ?? undefined,
    method: (db.metadata?.method as string) ?? undefined,
    userId: (db.metadata?.userId as string) ?? undefined,
    imageUrl: (db.metadata?.imageUrl as string) ?? undefined,
  };
}

function storeNodeToDb(node: StoreNode): Record<string, unknown> {
  return {
    id: node.id,
    agent_id: node.agentId ?? null,
    domain: node.domain ?? null,
    layer: node.layer ?? 2,
    type: node.type,
    title: node.title,
    description: node.description || null,
    score: node.score ?? null,
    metadata: {
      ...(node.metadata ?? {}),
      tags: node.tags,
      method: node.method,
      userId: node.userId,
      imageUrl: node.imageUrl,
    },
    created_at: node.createdAt || new Date().toISOString(),
    expired_at: node.expiredAt ?? null,
  };
}

function dbToStoreEdge(db: DbEdge): StoreEdge {
  return {
    id: db.id,
    source: db.source_id,
    target: db.target_id,
    type: db.type,
    weight: db.weight,
    metadata: db.metadata,
    createdAt: db.created_at,
    expiredAt: db.expired_at ?? undefined,
    validFrom: db.valid_from ?? undefined,
    validUntil: db.valid_until ?? undefined,
  };
}

function storeEdgeToDb(edge: StoreEdge): Record<string, unknown> {
  return {
    id: edge.id,
    source_id: edge.source,
    target_id: edge.target,
    type: edge.type,
    weight: edge.weight ?? 1.0,
    metadata: edge.metadata ?? {},
    created_at: edge.createdAt || new Date().toISOString(),
    expired_at: edge.expiredAt ?? null,
    valid_from: edge.validFrom ?? null,
    valid_until: edge.validUntil ?? null,
  };
}

// ═══════════════════════════════════════════
// SupabaseGraphStore
// ═══════════════════════════════════════════

/** 로컬 캐시 — getAllNodes/getAllEdges 동기 호출용 */
let _cachedNodes: StoreNode[] = [];
let _cachedEdges: StoreEdge[] = [];
let _cacheLoaded = false;

export class SupabaseGraphStore implements GraphStore {

  // ── Node CRUD ──

  async addNode(node: StoreNode): Promise<StoreNode> {
    // 임베딩 생성 (비동기, 실패해도 노드는 저장)
    let embeddingVec: number[] | null = null;
    try {
      embeddingVec = await embed(toEmbedText(node.title, node.description));
    } catch (err) {
      console.warn('[SupabaseGraphStore] embedding failed, saving without:', (err as Error).message);
    }

    const dbRow = storeNodeToDb(node);
    if (embeddingVec) {
      dbRow.embedding = JSON.stringify(embeddingVec);
    }

    const [result] = await supabaseRest<DbNode[]>('graph_nodes', {
      method: 'POST',
      query: 'on_conflict=id',
      body: dbRow,
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
    });

    const stored = result ? dbToStoreNode(result) : node;
    // 캐시 업데이트 (중복 제거)
    const idx = _cachedNodes.findIndex((n) => n.id === stored.id);
    if (idx >= 0) _cachedNodes[idx] = stored;
    else _cachedNodes.push(stored);
    return stored;
  }

  async listNodes(options?: ListOptions): Promise<StoreNode[]> {
    const limit = options?.limit ?? 100;
    const filters: string[] = ['expired_at=is.null'];

    if (options?.type) filters.push(`type=eq.${options.type}`);
    if (options?.agentId) filters.push(`agent_id=eq.${options.agentId}`);
    if (options?.domain) filters.push(`domain=eq.${options.domain}`);
    if (options?.layer !== undefined) filters.push(`layer=lte.${options.layer}`);
    if (options?.userId) filters.push(`metadata->>userId=eq.${options.userId}`);

    const query = `${filters.join('&')}&order=created_at.desc&limit=${limit}&select=id,agent_id,domain,layer,type,title,description,score,metadata,created_at,expired_at`;

    const rows = await supabaseRest<DbNode[]>('graph_nodes', { query });
    return rows.map(dbToStoreNode);
  }

  async getNode(id: string): Promise<StoreNode | null> {
    const rows = await supabaseRest<DbNode[]>('graph_nodes', {
      query: `id=eq.${encodeURIComponent(id)}&limit=1&select=id,agent_id,domain,layer,type,title,description,score,metadata,created_at,expired_at`,
    });
    return rows.length > 0 ? dbToStoreNode(rows[0]) : null;
  }

  // ── Edge CRUD ──

  async addEdge(edge: StoreEdge): Promise<StoreEdge> {
    const dbRow = storeEdgeToDb(edge);
    const [result] = await supabaseRest<DbEdge[]>('graph_edges', {
      method: 'POST',
      query: 'on_conflict=id',
      body: dbRow,
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
    });

    const stored = result ? dbToStoreEdge(result) : edge;
    // 캐시 중복 제거
    const idx = _cachedEdges.findIndex((e) => e.id === stored.id);
    if (idx >= 0) _cachedEdges[idx] = stored;
    else _cachedEdges.push(stored);
    return stored;
  }

  async listEdges(options?: ListOptions): Promise<StoreEdge[]> {
    const limit = options?.limit ?? 300;
    const filters: string[] = ['expired_at=is.null'];

    if (options?.type) filters.push(`type=eq.${options.type}`);

    const query = `${filters.join('&')}&order=created_at.desc&limit=${limit}`;
    const rows = await supabaseRest<DbEdge[]>('graph_edges', { query });
    return rows.map(dbToStoreEdge);
  }

  // ── Search: 3중 검색 (cosine + BM25 + BFS → RRF) ──

  async search(query: string, options?: SearchOptions): Promise<StoreNode[]> {
    const limit = options?.limit ?? 20;

    // 1) 임베딩 생성
    let queryEmbedding: number[];
    try {
      queryEmbedding = await embed(query);
    } catch {
      // 임베딩 실패 → FTS only fallback
      return this.ftsFallback(query, options);
    }

    // 2) RPC: graph_hybrid_search (cosine + BM25 → RRF)
    try {
      const results = await supabaseRpc<HybridSearchResult[]>('graph_hybrid_search', {
        query_embedding: JSON.stringify(queryEmbedding),
        query_text: query,
        match_agent_id: options?.agentId ?? null,
        match_domain: options?.domain ?? null,
        match_layer: options?.layer ?? null,
        match_type: options?.type ?? null,
        match_limit: limit,
      });

      if (results.length > 0) {
        return results.map(dbToStoreNode);
      }
    } catch (err) {
      console.warn('[SupabaseGraphStore] hybrid search failed, falling back:', (err as Error).message);
    }

    return this.ftsFallback(query, options);
  }

  /** FTS fallback — 임베딩 실패 시 */
  private async ftsFallback(query: string, options?: SearchOptions): Promise<StoreNode[]> {
    const limit = options?.limit ?? 20;
    const filters: string[] = ['expired_at=is.null'];
    if (options?.agentId) filters.push(`agent_id=eq.${options.agentId}`);
    if (options?.domain) filters.push(`domain=eq.${options.domain}`);
    if (options?.type) filters.push(`type=eq.${options.type}`);

    // PostgREST full-text search
    const ftsQuery = query.split(/\s+/).filter(Boolean).join(' & ');
    filters.push(`fts=wfts.${encodeURIComponent(ftsQuery)}`);

    const q = `${filters.join('&')}&order=created_at.desc&limit=${limit}&select=id,agent_id,domain,layer,type,title,description,score,metadata,created_at,expired_at`;
    const rows = await supabaseRest<DbNode[]>('graph_nodes', { query: q });
    return rows.map(dbToStoreNode);
  }

  // ── Stats ──

  async getStats(): Promise<StoreStats> {
    // DB RPC — 정확한 수치 (캐시 limit에 무관)
    try {
      const result = await supabaseRpc<{ nodes: { type: string; count: number }[]; total_nodes: number; total_edges: number }>('graph_stats', {});
      if (result && result.total_nodes !== undefined) {
        const byType: Record<string, number> = {};
        for (const row of result.nodes ?? []) {
          byType[row.type] = row.count;
        }
        return { totalNodes: result.total_nodes, totalEdges: result.total_edges, byType };
      }
    } catch (err) {
      console.warn('[SupabaseGraphStore] graph_stats RPC failed, using cache:', (err as Error).message);
    }

    const byType: Record<string, number> = {};
    for (const n of _cachedNodes) {
      byType[n.type] = (byType[n.type] ?? 0) + 1;
    }
    return {
      totalNodes: _cachedNodes.length,
      totalEdges: _cachedEdges.length,
      byType,
    };
  }

  // ── Bulk access (동기 — 캐시 사용) ──

  getAllNodes(): StoreNode[] {
    if (_cachedNodes.length === 0) {
      // full cache 아직 안 됐으면 비동기 로드 시작
      this.loadFullCache().catch(console.error);
    }
    return _cachedNodes;
  }

  getAllEdges(): StoreEdge[] {
    if (_cachedEdges.length === 0) {
      this.loadFullCache().catch(console.error);
    }
    return _cachedEdges;
  }

  // ── Persistence ──

  merge(nodes: StoreNode[], edges: StoreEdge[]): void {
    // bulk upsert — 비동기지만 fire-and-forget
    this.bulkUpsert(nodes, edges).catch(console.error);
  }

  clear(): void {
    _cachedNodes = [];
    _cachedEdges = [];
    // DB는 clear 안 함 (영속성 보장)
  }

  // ── Graph v2: expire ──

  async expireNode(id: string): Promise<void> {
    await supabaseRest('graph_nodes', {
      method: 'PATCH',
      query: `id=eq.${encodeURIComponent(id)}`,
      body: { expired_at: new Date().toISOString() },
    });
    _cachedNodes = _cachedNodes.filter((n) => n.id !== id);
  }

  async expireEdge(id: string): Promise<void> {
    await supabaseRest('graph_edges', {
      method: 'PATCH',
      query: `id=eq.${encodeURIComponent(id)}`,
      body: { expired_at: new Date().toISOString() },
    });
    _cachedEdges = _cachedEdges.filter((e) => e.id !== id);
  }

  // ── Internal helpers ──

  /** 캐시 로드 — 앱 시작 시 1회 호출
   *  Vercel serverless: 전체 로드는 타임아웃 위험 → 연결 확인만 하고 캐시는 lazy
   *  연결 실패해도 store 자체는 유지 (각 API가 직접 Supabase 호출) */
  async loadCache(): Promise<void> {
    if (_cacheLoaded) return;
    try {
      // 연결 확인용 최소 쿼리 (1 row, 5s timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const res = await fetch(`${SUPABASE_URL}/rest/v1/graph_nodes?limit=1&select=id`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      _cacheLoaded = true;
      console.log(`[SupabaseGraphStore] connection verified (status: ${res.status})`);
    } catch (err) {
      console.error('[SupabaseGraphStore] connection probe failed:', (err as Error).message);
      // 연결 실패해도 store 유지 — 개별 API 호출에서 재시도
      _cacheLoaded = true;
    }
  }

  /** 전체 캐시 로드 — getAllNodes/getAllEdges에서 필요할 때만 */
  private async loadFullCache(): Promise<void> {
    if (_cachedNodes.length > 0) return;
    try {
      const [nodes, edges] = await Promise.all([
        supabaseRest<DbNode[]>('graph_nodes', {
          query: 'expired_at=is.null&order=created_at.desc&limit=20000&select=id,agent_id,domain,layer,type,title,description,score,metadata,created_at,expired_at',
        }),
        supabaseRest<DbEdge[]>('graph_edges', {
          query: 'expired_at=is.null&order=created_at.desc&limit=50000',
        }),
      ]);
      _cachedNodes = nodes.map(dbToStoreNode);
      _cachedEdges = edges.map(dbToStoreEdge);
      console.log(`[SupabaseGraphStore] full cache loaded: ${_cachedNodes.length} nodes, ${_cachedEdges.length} edges`);
    } catch (err) {
      console.error('[SupabaseGraphStore] full cache load failed:', (err as Error).message);
    }
  }

  /** bulk upsert */
  private async bulkUpsert(nodes: StoreNode[], edges: StoreEdge[]): Promise<void> {
    if (nodes.length > 0) {
      // 배치 임베딩
      const textsToEmbed = nodes.map((n) => toEmbedText(n.title, n.description));
      let embeddings: number[][] = [];
      try {
        const { embedBatch } = await import('@/lib/embedding');
        embeddings = await embedBatch(textsToEmbed);
      } catch {
        // 임베딩 실패해도 노드는 저장
      }

      const dbNodes = nodes.map((n, i) => {
        const row = storeNodeToDb(n);
        if (embeddings[i]) row.embedding = JSON.stringify(embeddings[i]);
        return row;
      });

      // PostgREST bulk upsert (50개씩)
      for (let i = 0; i < dbNodes.length; i += 50) {
        const batch = dbNodes.slice(i, i + 50);
        await supabaseRest('graph_nodes', {
          method: 'POST',
          query: 'on_conflict=id',
          body: batch,
          headers: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
        });
      }
    }

    if (edges.length > 0) {
      const dbEdges = edges.map(storeEdgeToDb);
      for (let i = 0; i < dbEdges.length; i += 50) {
        const batch = dbEdges.slice(i, i + 50);
        await supabaseRest('graph_edges', {
          method: 'POST',
          query: 'on_conflict=id',
          body: batch,
          headers: { 'Prefer': 'return=minimal,resolution=merge-duplicates' },
        });
      }
    }
  }
}
