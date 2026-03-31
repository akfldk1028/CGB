/** Graph Service — Supabase pgvector 기반 (Graph v2)
 *
 * 모든 그래프 연산은 storeManager.getGlobalStore()를 통해 수행.
 * SupabaseGraphStore: cosine + BM25 + BFS → RRF 3중 검색.
 */

import type { GraphNode, GraphEdge, GraphQueryResult } from '@/types/graph';
import type { CreativeSession } from '@/types/session';
import { storeManager, type StoreNode } from './store';
import { createIdeaNode, type CreateIdeaParams } from './queries/ideas';
import { createConceptNode, type CreateConceptParams } from './queries/concepts';
import { createSessionNode, type CreateSessionParams } from './queries/sessions';
import { createEdge, classifyEdge, type CreateEdgeParams } from './queries/connections';
import { toGraph3D } from './transform';
import { queryBrainView, listDomains, listAgents, type BrainView, type BrainViewOptions } from './queries/brain-views';
import { ensureAgentNode, linkAgentToNodes, listAgentNodes, getAgentStats } from './queries/agents';

function getStore() {
  return storeManager.getGlobalStore();
}

function storeNodeToGraphNode(n: StoreNode): GraphNode {
  return {
    id: n.id,
    type: n.type as GraphNode['type'],
    title: n.title,
    description: n.description,
    method: n.method,
    score: n.score,
    imageUrl: n.imageUrl,
    userId: n.userId,
    createdAt: n.createdAt,
  };
}

// ════════════════════════════════════════
// Node Operations
// ════════════════════════════════════════

export async function addNode(
  type: 'Idea' | 'Concept' | 'Session',
  params: CreateIdeaParams | CreateConceptParams | CreateSessionParams
): Promise<GraphNode> {
  let node: GraphNode;

  switch (type) {
    case 'Idea':
      node = createIdeaNode(params as CreateIdeaParams);
      break;
    case 'Concept':
      node = createConceptNode(params as CreateConceptParams);
      break;
    case 'Session':
      node = createSessionNode(params as CreateSessionParams);
      break;
    default:
      throw new Error(`Unknown node type: ${type}`);
  }

  await getStore().addNode({
    id: node.id,
    type: node.type,
    title: node.title,
    description: node.description ?? '',
    method: node.method,
    tags: (node.metadata?.tags as string[]) ?? [],
    createdAt: node.createdAt,
  });

  return node;
}

export async function getNode(id: string): Promise<GraphNode | null> {
  const found = await getStore().getNode(id);
  if (!found) return null;
  return storeNodeToGraphNode(found);
}

export async function listNodes(options?: {
  type?: string;
  agentId?: string;
  domain?: string;
  layer?: number;
  limit?: number;
}): Promise<GraphNode[]> {
  const results = await getStore().listNodes({
    type: options?.type,
    agentId: options?.agentId,
    domain: options?.domain,
    layer: options?.layer,
    limit: options?.limit ?? 100,
  });
  return results.map(storeNodeToGraphNode);
}

// ════════════════════════════════════════
// Edge Operations
// ════════════════════════════════════════

export async function addEdge(params: CreateEdgeParams): Promise<GraphEdge> {
  const edge = createEdge(params);

  await getStore().addEdge({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    createdAt: edge.createdAt,
  });

  return edge;
}

export async function listEdges(options?: {
  nodeId?: string;
  type?: string;
  limit?: number;
}): Promise<GraphEdge[]> {
  const store = getStore();
  const results = await store.listEdges({
    type: options?.type,
    limit: options?.limit ?? 200,
  });

  let filtered = results;
  if (options?.nodeId) {
    filtered = results.filter(
      (e) => e.source === options.nodeId || e.target === options.nodeId
    );
  }

  return filtered.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    category: classifyEdge(e.type),
    createdAt: e.createdAt,
  }));
}

// ════════════════════════════════════════
// Search — 3중 검색 (cosine + BM25 + BFS → RRF)
// ════════════════════════════════════════

export async function searchGraph(
  query: string,
  options?: { type?: string; agentId?: string; domain?: string; layer?: number; limit?: number }
): Promise<GraphNode[]> {
  const results = await getStore().search(query, {
    limit: options?.limit ?? 20,
    agentId: options?.agentId,
    domain: options?.domain,
    layer: options?.layer,
    type: options?.type,
  });
  return results.map(storeNodeToGraphNode);
}

// ════════════════════════════════════════
// Traversal & Visualization
// ════════════════════════════════════════

export async function getNeighborhood(
  nodeId: string,
  maxHops: number = 2,
  limit: number = 50
): Promise<GraphQueryResult> {
  const store = getStore();
  const allEdges = store.getAllEdges();

  // 인접 리스트 빌드 (O(E) 1회, BFS는 O(V+E))
  const adj = new Map<string, { neighbor: string; edgeId: string }[]>();
  for (const e of allEdges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push({ neighbor: e.target, edgeId: e.id });
    adj.get(e.target)!.push({ neighbor: e.source, edgeId: e.id });
  }

  // BFS
  const visited = new Map<string, number>();
  const queue: { id: string; hop: number }[] = [{ id: nodeId, hop: 0 }];
  visited.set(nodeId, 0);

  while (queue.length > 0) {
    const { id, hop } = queue.shift()!;
    if (hop >= maxHops) continue;

    for (const { neighbor } of adj.get(id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, hop + 1);
        queue.push({ id: neighbor, hop: hop + 1 });
        if (visited.size >= limit + 1) break;
      }
    }
    if (visited.size >= limit + 1) break;
  }

  const neighborIds = new Set(visited.keys());
  const allNodes = store.getAllNodes();

  const nodes: GraphNode[] = allNodes
    .filter((n) => neighborIds.has(n.id))
    .map((n) => ({
      ...storeNodeToGraphNode(n),
      level: visited.get(n.id),
    }));

  const edges: GraphEdge[] = allEdges
    .filter((e) => neighborIds.has(e.source) && neighborIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      category: classifyEdge(e.type),
      createdAt: e.createdAt,
    }));

  return { nodes, edges, totalNodes: nodes.length, totalEdges: edges.length };
}

/** 전체 그래프 → 3D 시각화 데이터 */
export async function getVisualizationData(
  maxNodes: number = 100,
  userId?: string,
  view?: BrainView,
  viewOptions?: BrainViewOptions,
) {
  if (view) {
    const opts: BrainViewOptions = { ...viewOptions, limit: maxNodes };
    if (view === 'user' && userId) opts.userId = userId;
    const result = await getBrainVisualization(view, { ...opts, maxNodes });
    return result.graph3d;
  }

  if (userId) {
    const result = await getBrainVisualization('user', { userId, maxNodes });
    return result.graph3d;
  }

  const nodes = await listNodes({ limit: maxNodes });
  const edges = await listEdges({ limit: maxNodes * 3 });
  return toGraph3D(nodes, edges);
}

/** 그래프 통계 */
export async function getStats(): Promise<{
  totalNodes: number;
  totalEdges: number;
  byType: Record<string, number>;
  mode: 'supabase' | 'in_memory';
}> {
  const stats = await getStore().getStats();
  return { ...stats, mode: storeManager.getMode() };
}

// ════════════════════════════════════════
// Brain Views
// ════════════════════════════════════════

export async function getBrainVisualization(
  view: BrainView,
  options: BrainViewOptions & { maxNodes?: number } = {},
) {
  const result = queryBrainView(view, { ...options, limit: options.maxNodes ?? 200 });

  const nodes = result.nodes.map((n): GraphNode => storeNodeToGraphNode(n));
  const edges: GraphEdge[] = result.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type,
    category: classifyEdge(e.type),
    createdAt: e.createdAt,
  }));

  return {
    graph3d: toGraph3D(nodes, edges),
    stats: result.stats,
    view: result.view,
  };
}

export { listDomains };
export { listAgents };
export { ensureAgentNode, linkAgentToNodes, listAgentNodes, getAgentStats };

/** Immersion context — 기존 그래프에서 주제 관련 지식 추출 */
export async function getImmersionContext(
  topic: string,
  domain: string,
  limit: number = 20
): Promise<string> {
  const relatedNodes = await searchGraph(`${topic} ${domain}`, { limit });

  if (relatedNodes.length === 0) {
    return 'No prior knowledge found in the graph. This is a fresh exploration.';
  }

  const contextParts: string[] = [
    `Found ${relatedNodes.length} related items in the knowledge graph:`,
    '',
  ];

  for (const node of relatedNodes) {
    contextParts.push(`- [${node.type}] ${node.title}: ${node.description ?? '(no description)'}`);
  }

  const nodeIds = new Set(relatedNodes.map((n) => n.id));
  const allEdges = getStore().getAllEdges();
  const relatedEdges = allEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  if (relatedEdges.length > 0) {
    contextParts.push('');
    contextParts.push('Connections between these items:');
    for (const edge of relatedEdges.slice(0, 10)) {
      const srcNode = relatedNodes.find((n) => n.id === edge.source);
      const tgtNode = relatedNodes.find((n) => n.id === edge.target);
      if (srcNode && tgtNode) {
        contextParts.push(`  "${srcNode.title}" --[${edge.type}]--> "${tgtNode.title}"`);
      }
    }
  }

  return contextParts.join('\n');
}

// ════════════════════════════════════════
// Session Persistence — "Ideas Compound Forever"
// ════════════════════════════════════════

export async function persistSession(session: CreativeSession): Promise<{
  nodesCreated: number;
  edgesCreated: number;
}> {
  const store = getStore();
  let nodesCreated = 0;
  let edgesCreated = 0;

  // 1. Domain 노드 (없으면 생성)
  const domainId = `domain-${session.domain.toLowerCase().replace(/\s+/g, '-')}`;
  const existingDomain = await store.getNode(domainId);
  if (!existingDomain) {
    await store.addNode({
      id: domainId,
      type: 'Domain',
      title: session.domain,
      description: `Domain: ${session.domain}`,
      domain: session.domain.toLowerCase(),
      layer: 0,
      createdAt: session.createdAt,
    });
    nodesCreated++;
  }

  // 2. Topic 노드
  const topicId = `topic-${session.id}`;
  await store.addNode({
    id: topicId,
    type: 'Topic',
    title: session.topic,
    description: `Topic: ${session.topic} (${session.domain})`,
    domain: session.domain.toLowerCase(),
    layer: 1,
    createdAt: session.createdAt,
  });
  nodesCreated++;

  // Topic → Domain 엣지
  await store.addEdge({
    id: `e-${Date.now()}-td`,
    source: topicId,
    target: domainId,
    type: 'BELONGS_TO',
    createdAt: session.createdAt,
  });
  edgesCreated++;

  // 3. Session 노드
  await store.addNode({
    id: session.id,
    type: 'Session',
    title: `Session: ${session.topic}`,
    description: `${session.mode} mode, ${session.totalGenerated} ideas, ${session.duration}ms`,
    domain: session.domain.toLowerCase(),
    layer: 1,
    createdAt: session.createdAt,
  });
  nodesCreated++;

  // 4. 에이전트 노드 (light mode)
  if (session.mode === 'light') {
    await ensureAgentNode({ role: 'light_pipeline', name: 'Light Pipeline', theory: 'Guilford diverge/converge' });
  }

  // 5. 아이디어 노드 + 엣지
  const ideaIdMap = new Map<string, string>();

  for (const idea of session.finalIdeas) {
    const existing = await store.getNode(idea.id);
    if (existing) {
      ideaIdMap.set(idea.id, idea.id);
      continue;
    }

    await store.addNode({
      id: idea.id,
      type: 'Idea',
      title: idea.title,
      description: idea.description,
      method: idea.method,
      score: idea.scores?.overall,
      domain: session.domain.toLowerCase(),
      layer: 2,
      createdAt: idea.createdAt,
    });

    ideaIdMap.set(idea.id, idea.id);
    nodesCreated++;

    await store.addEdge({
      id: `e-${Date.now()}-${nodesCreated}a`,
      source: idea.id,
      target: topicId,
      type: 'ADDRESSES_TOPIC',
      createdAt: idea.createdAt,
    });
    edgesCreated++;

    await store.addEdge({
      id: `e-${Date.now()}-${nodesCreated}b`,
      source: idea.id,
      target: session.id,
      type: 'PRODUCED_IN',
      createdAt: idea.createdAt,
    });
    edgesCreated++;

    if (idea.parentId && ideaIdMap.has(idea.parentId)) {
      const edgeType = idea.method?.includes('scamper') ? 'SCAMPER_OF' : 'ITERATED_FROM';
      await store.addEdge({
        id: `e-${Date.now()}-${nodesCreated}c`,
        source: idea.id,
        target: idea.parentId,
        type: edgeType,
        createdAt: idea.createdAt,
      });
      edgesCreated++;
    }

    if (session.mode === 'light') {
      await linkAgentToNodes('light_pipeline', [idea.id]);
      edgesCreated++;
    }
  }

  return { nodesCreated, edgesCreated };
}
