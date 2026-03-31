/** Graph DB Tools — 에이전트가 자율적으로 Graph DB 조회/저장
 *
 * Graph v2: 모든 연산은 storeManager.getGlobalStore()를 통해 수행.
 * SupabaseGraphStore: cosine + BM25 + BFS → RRF 3중 검색.
 */

import type { AgentTool } from './registry';
import { emitNodeCreated, emitEdgeCreated } from '../../graph/events';
import { safeLabel, safeRelType } from '../../graph/safe-cypher';
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

function getStore() {
  return storeManager.getGlobalStore();
}

// ── Tools ──

export const graphQueryTool: AgentTool = {
  name: 'graph_query',
  description: 'Search the knowledge graph by keywords. Returns related ideas, concepts, and their connections.',
  parameters: {
    cypher: { type: 'string', description: 'Search query (keywords or Cypher-like syntax)' },
  },
  execute: async (params) => {
    const query = params.cypher as string;
    const store = getStore();
    const results = await store.search(query, { limit: 10 });
    return {
      source: storeManager.getMode(),
      results,
      totalInStore: store.getAllNodes().length,
    };
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
    const store = getStore();
    const results = await store.search(keywords, { limit: max });
    return {
      source: storeManager.getMode(),
      results,
      total: results.length,
      totalInStore: store.getAllNodes().length,
    };
  },
};

export const graphAddNodeTool: AgentTool = {
  name: 'graph_add_node',
  description: 'Add a new idea, concept, or output node to the knowledge graph. Every generated idea should be saved here so the graph grows over time.',
  parameters: {
    type: { type: 'string', description: 'Node type: Idea, Concept, Domain, Output' },
    title: { type: 'string', description: 'Title of the node' },
    description: { type: 'string', description: 'Description' },
    method: { type: 'string', description: 'Method used: divergent, scamper, iteration, etc.' },
    userId: { type: 'string', description: 'User who created this node (optional)' },
  },
  execute: async (params) => {
    const node: StoreNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: params.type as string,
      title: params.title as string,
      description: params.description as string,
      method: params.method as string | undefined,
      userId: params.userId as string | undefined,
      createdAt: new Date().toISOString(),
    };

    // Validate label
    safeLabel(node.type);

    const store = getStore();
    await store.addNode(node);

    emitNodeCreated({
      id: node.id,
      type: node.type,
      title: node.title,
      description: node.description,
      method: node.method,
    });

    return { created: node, totalNodes: store.getAllNodes().length, persisted: storeManager.getMode() };
  },
};

export const graphAddEdgeTool: AgentTool = {
  name: 'graph_add_edge',
  description: 'Create a relationship between two nodes in the knowledge graph.',
  parameters: {
    sourceId: { type: 'string', description: 'Source node ID' },
    targetId: { type: 'string', description: 'Target node ID' },
    type: { type: 'string', description: 'Edge type: INSPIRED_BY, ITERATED_FROM, COMBINES, SCAMPER_OF, CONTRADICTS, CAUSES, SIMILAR_TO, etc.' },
  },
  execute: async (params) => {
    const edge: StoreEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
      source: params.sourceId as string,
      target: params.targetId as string,
      type: params.type as string,
      createdAt: new Date().toISOString(),
    };

    // Validate relationship type
    safeRelType(edge.type);

    const store = getStore();
    await store.addEdge(edge);

    emitEdgeCreated({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    });

    return { created: edge, totalEdges: store.getAllEdges().length, persisted: storeManager.getMode() };
  },
};
