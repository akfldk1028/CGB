/** GraphStore — 유저별 격리 가능한 그래프 저장소 인터페이스
 *
 * 현재: InMemoryGraphStore (개발/데모)
 * 미래: MemgraphGraphStore, NeonGraphStore 등으로 교체/추가
 *
 * 모든 graph 연산은 이 인터페이스를 통해 수행.
 * service.ts, graph-tools.ts 모두 GraphStore를 통해 접근.
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
}

export interface StoreEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  createdAt: string;
}

export interface ListOptions {
  type?: string;
  userId?: string;
  limit?: number;
}

export interface SearchOptions {
  limit?: number;
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

  // Search
  search(query: string, options?: SearchOptions): Promise<StoreNode[]>;

  // Stats
  getStats(): Promise<StoreStats>;

  // Bulk access (시각화, persistence)
  getAllNodes(): StoreNode[];
  getAllEdges(): StoreEdge[];

  // Persistence
  merge(nodes: StoreNode[], edges: StoreEdge[]): void;
  clear(): void;
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

class GraphStoreManager {
  private stores = new Map<string, GraphStore>();

  /** 글로벌 스토어 (Collective Brain) */
  getGlobalStore(): GraphStore {
    return this.getStore(GLOBAL_KEY);
  }

  /** 유저별 스토어 (My Brain) — 미래 확장용 */
  getUserStore(userId: string): GraphStore {
    return this.getStore(userId);
  }

  /** 키 기반 스토어 조회/생성 */
  getStore(key: string): GraphStore {
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
