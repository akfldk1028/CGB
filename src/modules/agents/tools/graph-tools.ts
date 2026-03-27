/** Graph DB Tools — 에이전트가 자율적으로 Graph DB 조회/저장
 *
 * Dual-mode: Memgraph 환경변수 있으면 실제 DB, 없으면 in-memory store.
 * In-memory store는 세션 내에서 모든 에이전트가 공유.
 *
 * Csikszentmihalyi의 Domain 지식 = Graph DB에 축적된 노드.
 * Iteration = 기존 노드에서 새 노드로 연결.
 */

import type { AgentTool } from './registry';
import { scheduleAutoSave } from '../../graph/persistence';
import { emitNodeCreated, emitEdgeCreated } from '../../graph/events';
import { safeLabel, safeRelType, isReadOnlyCypher } from '../../graph/safe-cypher';
import {
  storeManager,
  getMemoryStore,
  loadMemoryStore,
  type StoreNode,
  type StoreEdge,
} from '../../graph/store';

// Re-export for backward compatibility
export { getMemoryStore, loadMemoryStore };
export type MemNode = StoreNode;
export type MemEdge = StoreEdge;

// ── Dual-mode: Memgraph or in-memory ──

const USE_MEMGRAPH = !!(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

let _runQuery: ((cypher: string, params?: Record<string, unknown>) => Promise<unknown[]>) | null = null;
let _driverPromise: Promise<void> | null = null;

async function getRunQuery() {
  if (!USE_MEMGRAPH) return null;
  if (_runQuery) return _runQuery;
  if (!_driverPromise) {
    _driverPromise = import('@/modules/graph/driver').then((mod) => { _runQuery = mod.runQuery; });
  }
  await _driverPromise;
  return _runQuery;
}

function getStore() {
  return storeManager.getGlobalStore();
}

function tokenMatch(text: string, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = text.toLowerCase();
  return tokens.some((t) => haystack.includes(t));
}

// ── Tools ──

export const graphQueryTool: AgentTool = {
  name: 'graph_query',
  description: 'Run a Cypher query on the knowledge graph to find related ideas, concepts, or domains. Use for exploring the idea space during Immersion or Iteration.',
  parameters: {
    cypher: { type: 'string', description: 'Cypher query string' },
  },
  execute: async (params) => {
    const cypher = params.cypher as string;

    if (!isReadOnlyCypher(cypher)) {
      return { error: 'Write operations (CREATE, DELETE, SET, MERGE, DROP) are not allowed via graph_query. Use graph_add_node or graph_add_edge instead.' };
    }

    const runQ = await getRunQuery();
    if (runQ) {
      const results = await runQ(cypher);
      return { source: 'memgraph', results };
    }

    // In-memory fallback: extract meaningful keywords from Cypher
    const cleaned = cypher.replace(/MATCH|RETURN|WHERE|CREATE|SET|WITH|ORDER BY|LIMIT|AND|OR|NOT|\(|\)|{|}|\[|\]|:|-|>|<|\*|\.|,|'|"/gi, ' ').trim();
    const results = getStore().getAllNodes().filter((n) =>
      tokenMatch(`${n.title} ${n.description} ${n.type}`, cleaned)
    ).slice(0, 10);

    return { source: 'in_memory', results, totalInStore: getStore().getAllNodes().length };
  },
};

export const graphSearchTool: AgentTool = {
  name: 'graph_search',
  description: 'Search the knowledge graph by keywords. Returns related ideas, concepts, and their connections. Essential for the Immersion phase and finding iteration targets.',
  parameters: {
    keywords: { type: 'string', description: 'Search keywords' },
    max_results: { type: 'number', description: 'Max results (default 10)' },
  },
  execute: async (params) => {
    const keywords = params.keywords as string;
    const max = (params.max_results as number) ?? 10;

    const runQ = await getRunQuery();
    if (runQ) {
      const cypher = `MATCH (n) WHERE toLower(n.title) CONTAINS toLower($kw) OR toLower(n.description) CONTAINS toLower($kw) RETURN n LIMIT $limit`;
      const results = await runQ(cypher, { kw: keywords, limit: max });
      return { source: 'memgraph', results, total: results.length };
    }

    // In-memory: token-based search
    const results = getStore().getAllNodes()
      .filter((n) => tokenMatch(`${n.title} ${n.description} ${n.type} ${n.tags?.join(' ') ?? ''}`, keywords))
      .slice(0, max);

    return {
      source: 'in_memory',
      results,
      total: results.length,
      totalInStore: getStore().getAllNodes().length,
    };
  },
};

export const graphAddNodeTool: AgentTool = {
  name: 'graph_add_node',
  description: 'Add a new idea, concept, or output node to the knowledge graph. Every generated idea should be saved here so the graph grows over time. This is how "ideas compound forever".',
  parameters: {
    type: { type: 'string', description: 'Node type: Idea, Concept, Domain, Output' },
    title: { type: 'string', description: 'Title of the node' },
    description: { type: 'string', description: 'Description' },
    method: { type: 'string', description: 'Method used: divergent, scamper, iteration, etc.' },
    userId: { type: 'string', description: 'User who created this node (optional)' },
  },
  execute: async (params) => {
    const node: MemNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type as string,
      title: params.title as string,
      description: params.description as string,
      method: params.method as string | undefined,
      userId: params.userId as string | undefined,
      createdAt: new Date().toISOString(),
    };

    // Validate label before any write
    const validLabel = safeLabel(node.type);

    const store = getStore();
    await store.addNode(node);
    scheduleAutoSave();

    emitNodeCreated({
      id: node.id,
      type: node.type,
      title: node.title,
      description: node.description,
      method: node.method,
    });

    const runQ = await getRunQuery();
    if (runQ) {
      await runQ(
        `CREATE (n:${validLabel} {id: $id, title: $title, description: $desc, method: $method, createdAt: $ts})`,
        { id: node.id, title: node.title, desc: node.description, method: node.method ?? '', ts: node.createdAt }
      );
      return { created: node, totalNodes: store.getAllNodes().length, persisted: 'memgraph' };
    }

    return { created: node, totalNodes: store.getAllNodes().length, persisted: 'in_memory' };
  },
};

export const graphAddEdgeTool: AgentTool = {
  name: 'graph_add_edge',
  description: 'Create a relationship between two nodes in the knowledge graph. Use INSPIRED_BY for inspiration links, ITERATED_FROM for variations, SCAMPER_OF for transforms, CONTRADICTS for opposing ideas, SIMILAR_TO for related ideas.',
  parameters: {
    sourceId: { type: 'string', description: 'Source node ID' },
    targetId: { type: 'string', description: 'Target node ID' },
    type: { type: 'string', description: 'Edge type: INSPIRED_BY, ITERATED_FROM, COMBINES, SCAMPER_OF, CONTRADICTS, CAUSES, SIMILAR_TO, etc.' },
  },
  execute: async (params) => {
    const edge: MemEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      source: params.sourceId as string,
      target: params.targetId as string,
      type: params.type as string,
      createdAt: new Date().toISOString(),
    };

    // Validate relationship type before any write
    const validRelType = safeRelType(edge.type);

    const store = getStore();
    await store.addEdge(edge);
    scheduleAutoSave();

    emitEdgeCreated({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    });

    const runQ = await getRunQuery();
    if (runQ) {
      await runQ(
        `MATCH (a {id: $src}), (b {id: $tgt}) CREATE (a)-[:${validRelType} {id: $eid, createdAt: $ts}]->(b)`,
        { src: edge.source, tgt: edge.target, eid: edge.id, ts: edge.createdAt }
      );
      return { created: edge, totalEdges: store.getAllEdges().length, persisted: 'memgraph' };
    }

    return { created: edge, totalEdges: store.getAllEdges().length, persisted: 'in_memory' };
  },
};
