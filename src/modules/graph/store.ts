/** GraphStore — Graph v2 저장소 인터페이스
 *
 * 기본: SupabaseGraphStore (pgvector + tsvector + RRF 3중검색)
 * Fallback: InMemoryGraphStore (SUPABASE_URL 없을 때)
 *
 * 모든 graph 연산은 storeManager.getGlobalStore()를 통해 수행.
 */

import type { GraphNode, GraphEdge } from '@/types/graph';

// ═══════════════════════════════════════════
// Store 인터페이스
// ═══════════════════════════════════════════

export interface StoreNode {
  id: string;
  type: string;
  title: string;
  description: string;
  method?: string;
  tags?: string[];
  score?: number;
  userId?: string;
  imageUrl?: string;
  createdAt: string;
  // Graph v2 fields
  agentId?: string;
  domain?: string;
  layer?: number;           // 0=global, 1=domain, 2=agent
  embedding?: number[];     // 768-dim vector
  metadata?: Record<string, unknown>;
  expiredAt?: string;
}

export interface StoreEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  createdAt: string;
  // Graph v2 fields
  weight?: number;
  metadata?: Record<string, unknown>;
  expiredAt?: string;
  validFrom?: string;
  validUntil?: string;
}

export interface ListOptions {
  type?: string;
  userId?: string;
  agentId?: string;
  domain?: string;
  layer?: number;
  limit?: number;
}

export interface SearchOptions {
  limit?: number;
  agentId?: string;
  domain?: string;
  layer?: number;
  type?: string;
}

export interface StoreStats {
  totalNodes: number;
  totalEdges: number;
  byType: Record<string, number>;
}

/** 그래프 저장소 인터페이스 — 모든 백엔드가 구현 */
export interface GraphStore {
  // Node CRUD
  addNode(node: StoreNode): Promise<StoreNode>;
  listNodes(options?: ListOptions): Promise<StoreNode[]>;
  getNode(id: string): Promise<StoreNode | null>;

  // Edge CRUD
  addEdge(edge: StoreEdge): Promise<StoreEdge>;
  listEdges(options?: ListOptions): Promise<StoreEdge[]>;

  // Search — v2: 3중 검색 (cosine + BM25 + BFS → RRF)
  search(query: string, options?: SearchOptions): Promise<StoreNode[]>;

  // Stats
  getStats(): Promise<StoreStats>;

  // Bulk access (시각화, persistence)
  getAllNodes(): StoreNode[];
  getAllEdges(): StoreEdge[];

  // Persistence
  merge(nodes: StoreNode[], edges: StoreEdge[]): void;
  clear(): void;

  // Graph v2: expire (삭제 대신 무효화)
  expireNode?(id: string): Promise<void>;
  expireEdge?(id: string): Promise<void>;
}

// ═══════════════════════════════════════════
// InMemoryGraphStore 구현
// ═══════════════════════════════════════════

const MAX_NODES = 10_000;
const MAX_EDGES = 30_000;

export class InMemoryGraphStore implements GraphStore {
  private nodes: StoreNode[] = [];
  private edges: StoreEdge[] = [];

  async addNode(node: StoreNode): Promise<StoreNode> {
    if (this.nodes.length >= MAX_NODES) {
      this.nodes.splice(0, Math.floor(MAX_NODES * 0.1));
    }
    this.nodes.push(node);
    return node;
  }

  async listNodes(options?: ListOptions): Promise<StoreNode[]> {
    const limit = options?.limit ?? 100;
    let filtered = this.nodes;

    if (options?.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }
    if (options?.userId) {
      filtered = filtered.filter((n) => n.userId === options.userId);
    }

    return filtered.slice(-limit).reverse();
  }

  async getNode(id: string): Promise<StoreNode | null> {
    return this.nodes.find((n) => n.id === id) ?? null;
  }

  async addEdge(edge: StoreEdge): Promise<StoreEdge> {
    if (this.edges.length >= MAX_EDGES) {
      this.edges.splice(0, Math.floor(MAX_EDGES * 0.1));
    }
    this.edges.push(edge);
    return edge;
  }

  async listEdges(options?: ListOptions): Promise<StoreEdge[]> {
    const limit = options?.limit ?? 300;
    return this.edges.slice(-limit).reverse();
  }

  async search(query: string, options?: SearchOptions): Promise<StoreNode[]> {
    const max = options?.limit ?? 10;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return this.nodes
      .filter((n) => {
        const hay = `${n.title} ${n.description} ${n.type} ${n.tags?.join(' ') ?? ''}`.toLowerCase();
        return tokens.some((t) => hay.includes(t));
      })
      .slice(0, max);
  }

  async getStats(): Promise<StoreStats> {
    const byType: Record<string, number> = {};
    for (const n of this.nodes) {
      byType[n.type] = (byType[n.type] ?? 0) + 1;
    }
    return {
      totalNodes: this.nodes.length,
      totalEdges: this.edges.length,
      byType,
    };
  }

  getAllNodes(): StoreNode[] {
    return this.nodes;
  }

  getAllEdges(): StoreEdge[] {
    return this.edges;
  }

  merge(nodes: StoreNode[], edges: StoreEdge[]): void {
    const existingNodeIds = new Set(this.nodes.map((n) => n.id));
    const existingEdgeIds = new Set(this.edges.map((e) => e.id));

    for (const node of nodes) {
      if (!existingNodeIds.has(node.id)) {
        this.nodes.push(node);
      }
    }
    for (const edge of edges) {
      if (!existingEdgeIds.has(edge.id)) {
        this.edges.push(edge);
      }
    }
  }

  clear(): void {
    this.nodes.length = 0;
    this.edges.length = 0;
  }
}

// ═══════════════════════════════════════════
// GraphStoreManager — 스토어 팩토리 + 캐시
// ═══════════════════════════════════════════

/** 글로벌 스토어 키 (전체 뇌) */
const GLOBAL_KEY = '__collective__';

/** Supabase 환경변수 존재 여부로 백엔드 결정 (런타임 평가 — Vercel serverless 대응) */
function useSupabase(): boolean {
  return !!(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** SupabaseGraphStore lazy import (circular 방지) */
let _supabaseStorePromise: Promise<GraphStore> | null = null;
async function getSupabaseStore(): Promise<GraphStore> {
  if (!_supabaseStorePromise) {
    _supabaseStorePromise = import('./supabase-store').then(async (mod) => {
      const store = new mod.SupabaseGraphStore();
      await store.loadCache();
      return store;
    });
  }
  return _supabaseStorePromise;
}

class GraphStoreManager {
  private stores = new Map<string, GraphStore>();
  private _globalStore: GraphStore | null = null;
  private _initPromise: Promise<void> | null = null;

  /** 초기화 — 앱 시작 시 1회 */
  async init(): Promise<void> {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      if (useSupabase()) {
        try {
          this._globalStore = await getSupabaseStore();
          console.log('[GraphStoreManager] using SupabaseGraphStore');
        } catch (err) {
          console.error('[GraphStoreManager] Supabase init failed, falling back to InMemory:', err);
          this._globalStore = new InMemoryGraphStore();
        }
      } else {
        this._globalStore = new InMemoryGraphStore();
        console.log('[GraphStoreManager] using InMemoryGraphStore (no SUPABASE_URL)');
      }
    })();
    return this._initPromise;
  }

  /** 글로벌 스토어 (동기 — 캐시된 인스턴스 반환)
   *  Vercel serverless: 첫 요청 시 ensureReady() 호출 필수. */
  getGlobalStore(): GraphStore {
    if (this._globalStore) return this._globalStore;
    this._globalStore = new InMemoryGraphStore();
    return this._globalStore;
  }

  /** Vercel serverless 대응: 첫 요청에서 await 필수 */
  async ensureReady(): Promise<GraphStore> {
    if (this._globalStore?.constructor.name === 'SupabaseGraphStore') {
      return this._globalStore;
    }
    if (!useSupabase()) {
      if (!this._globalStore) this._globalStore = new InMemoryGraphStore();
      return this._globalStore;
    }
    try {
      const store = await getSupabaseStore();
      // InMemory에 쌓인 데이터 merge
      if (this._globalStore && this._globalStore.getAllNodes().length > 0) {
        store.merge(this._globalStore.getAllNodes(), this._globalStore.getAllEdges());
      }
      this._globalStore = store;
    } catch (err) {
      console.error('[GraphStoreManager] Supabase init failed:', err);
      if (!this._globalStore) this._globalStore = new InMemoryGraphStore();
    }
    return this._globalStore;
  }

  /** 유저별 스토어 (My Brain) — 미래 확장용 */
  getUserStore(userId: string): GraphStore {
    return this.getStore(userId);
  }

  /** 키 기반 스토어 조회/생성 */
  getStore(key: string): GraphStore {
    if (key === GLOBAL_KEY) return this.getGlobalStore();
    let store = this.stores.get(key);
    if (!store) {
      store = new InMemoryGraphStore();
      this.stores.set(key, store);
    }
    return store;
  }

  /** 등록된 모든 스토어 키 */
  getStoreKeys(): string[] {
    return Array.from(this.stores.keys());
  }

  /** 스토어 교체 (Memgraph, Neon 등 외부 백엔드 주입) */
  setStore(key: string, store: GraphStore): void {
    this.stores.set(key, store);
    if (key === GLOBAL_KEY) this._globalStore = store;
  }

  /** 현재 백엔드 모드 */
  getMode(): 'supabase' | 'in_memory' {
    return useSupabase() && this._globalStore?.constructor.name === 'SupabaseGraphStore'
      ? 'supabase'
      : 'in_memory';
  }
}

/** 싱글톤 — 앱 전체에서 하나만 */
export const storeManager = new GraphStoreManager();

// ═══════════════════════════════════════════
// 하위 호환 — 기존 getMemoryStore() 호출자를 위한 브릿지
// ═══════════════════════════════════════════

/** @deprecated — 새 코드는 storeManager.getGlobalStore() 사용 */
export function getMemoryStore(): { nodes: StoreNode[]; edges: StoreEdge[] } {
  const store = storeManager.getGlobalStore();
  return {
    get nodes() { return store.getAllNodes(); },
    get edges() { return store.getAllEdges(); },
  } as { nodes: StoreNode[]; edges: StoreEdge[] };
}

/** @deprecated — 새 코드는 store.merge() 사용 */
export function loadMemoryStore(nodes: StoreNode[], edges: StoreEdge[]): void {
  const store = storeManager.getGlobalStore();
  store.merge(nodes, edges);
}
