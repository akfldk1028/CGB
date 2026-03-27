/** Graph Service — dual-mode 고수준 인터페이스
 *
 * Memgraph 연결 시 → Cypher 쿼리 실행
 * 미연결 시 → graph-tools의 in-memory store 사용
 *
 * API 라우트와 파이프라인에서 이 서비스를 통해 Graph 조작.
 */

import type { GraphNode, GraphEdge, GraphQueryResult } from '@/types/graph';
import type { CreativeSession } from '@/types/session';
import { getMemoryStore } from '../agents/tools/graph-tools';
import { loadFromFile, scheduleAutoSave } from './persistence';
import { createIdeaNode, type CreateIdeaParams } from './queries/ideas';
import { createConceptNode, type CreateConceptParams } from './queries/concepts';
import { createSessionNode, type CreateSessionParams } from './queries/sessions';
import { createEdge, classifyEdge, type CreateEdgeParams } from './queries/connections';
import { tokenSearch } from './queries/search';
import { bfsNeighborhood } from './queries/traversal';
import { calculateNoveltyInMemory } from './queries/novelty';
import { toGraph3D } from './transform';
import { safeLabel, safeRelType, clampInt } from './safe-cypher';

const USE_MEMGRAPH = !!(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

const MAX_STORE_NODES = 10_000;
const MAX_STORE_EDGES = 30_000;

/** Lazy async getter — avoids race condition with top-level dynamic import */
let _runQuery: ((cypher: string, params?: Record<string, unknown>) => Promise<unknown[]>) | null = null;
let _driverPromise: Promise<void> | null = null;

async function getRunQuery() {
  if (!USE_MEMGRAPH) return null;
  if (_runQuery) return _runQuery;
  if (!_driverPromise) {
    _driverPromise = import('./driver').then((mod) => { _runQuery = mod.runQuery; });
  }
  await _driverPromise;
  return _runQuery;
}

// Restore persisted in-memory store on module load
loadFromFile().catch((err) => {
  console.error('[graph/service] failed to load persisted store:', err);
});

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

  const store = getMemoryStore();
  if (store.nodes.length >= MAX_STORE_NODES) {
    store.nodes.splice(0, Math.floor(MAX_STORE_NODES * 0.1)); // evict oldest 10%
  }
  store.nodes.push({
    id: node.id,
    type: node.type,
    title: node.title,
    description: node.description ?? '',
    method: node.method,
    tags: (node.metadata?.tags as string[]) ?? [],
    createdAt: node.createdAt,
  });
  scheduleAutoSave();

  const runQ = await getRunQuery();
  if (runQ) {
    const label = safeLabel(node.type);
    await runQ(
      `CREATE (n:${label} {id: $id, title: $title, description: $desc, createdAt: $ts})`,
      { id: node.id, title: node.title, desc: node.description ?? '', ts: node.createdAt }
    );
  }

  return node;
}

export async function getNode(id: string): Promise<GraphNode | null> {
  const runQ = await getRunQuery();
  if (runQ) {
    const results = await runQ('MATCH (n {id: $id}) RETURN n', { id });
    if (results.length > 0) {
      const r = results[0] as Record<string, unknown>;
      const n = r.n as Record<string, unknown>;
      return {
        id: n.id as string,
        type: (n.type ?? 'Idea') as GraphNode['type'],
        title: (n.title ?? n.name ?? '') as string,
        description: (n.description ?? '') as string,
        createdAt: (n.createdAt ?? '') as string,
      };
    }
  }

  const store = getMemoryStore();
  const found = store.nodes.find((n) => n.id === id);
  if (!found) return null;

  return {
    id: found.id,
    type: found.type as GraphNode['type'],
    title: found.title,
    description: found.description,
    method: found.method,
    score: found.score,
    createdAt: found.createdAt,
  };
}

export async function listNodes(options?: {
  type?: string;
  limit?: number;
}): Promise<GraphNode[]> {
  const limit = options?.limit ?? 100;

  const runQ = await getRunQuery();
  if (runQ) {
    const cypher = options?.type
      ? `MATCH (n:${safeLabel(options.type)}) RETURN n ORDER BY n.createdAt DESC LIMIT $limit`
      : `MATCH (n) RETURN n, labels(n)[0] as nodeType ORDER BY n.createdAt DESC LIMIT $limit`;
    const results = await runQ(cypher, { limit });
    return results.map((r: unknown) => {
      const rec = r as Record<string, unknown>;
      const n = rec.n as Record<string, unknown>;
      return {
        id: n.id as string,
        type: ((rec.nodeType ?? n.type ?? 'Idea') as string) as GraphNode['type'],
        title: (n.title ?? n.name ?? '') as string,
        description: (n.description ?? '') as string,
        method: n.method as string | undefined,
        score: n.score as number | undefined,
        imageUrl: n.imageUrl as string | undefined,
        createdAt: (n.createdAt ?? '') as string,
      };
    });
  }

  const store = getMemoryStore();
  return store.nodes
    .filter((n) => !options?.type || n.type === options.type)
    .slice(-limit)
    .reverse()
    .map((n) => ({
      id: n.id,
      type: n.type as GraphNode['type'],
      title: n.title,
      description: n.description,
      method: n.method,
      score: n.score,
      imageUrl: n.imageUrl,
      createdAt: n.createdAt,
    }));
}

// ════════════════════════════════════════
// Edge Operations
// ════════════════════════════════════════

export async function addEdge(params: CreateEdgeParams): Promise<GraphEdge> {
  const edge = createEdge(params);

  const store = getMemoryStore();
  if (store.edges.length >= MAX_STORE_EDGES) {
    store.edges.splice(0, Math.floor(MAX_STORE_EDGES * 0.1));
  }
  store.edges.push({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    createdAt: edge.createdAt,
  });
  scheduleAutoSave();

  const runQ = await getRunQuery();
  if (runQ) {
    const relType = safeRelType(edge.type);
    await runQ(
      `MATCH (a {id: $src}), (b {id: $tgt}) CREATE (a)-[:${relType} {id: $eid, createdAt: $ts}]->(b)`,
      { src: edge.source, tgt: edge.target, eid: edge.id, ts: edge.createdAt }
    );
  }

  return edge;
}

export async function listEdges(options?: {
  nodeId?: string;
  type?: string;
  limit?: number;
}): Promise<GraphEdge[]> {
  const limit = options?.limit ?? 200;

  const runQ = await getRunQuery();
  if (runQ) {
    let cypher: string;
    const params: Record<string, unknown> = { limit };

    if (options?.nodeId) {
      cypher = `MATCH (n {id: $nodeId})-[r]-(m) RETURN r, startNode(r).id as src, endNode(r).id as tgt, type(r) as rType LIMIT $limit`;
      params.nodeId = options.nodeId;
    } else {
      cypher = `MATCH (a)-[r]->(b) RETURN r, a.id as src, b.id as tgt, type(r) as rType LIMIT $limit`;
    }

    const results = await runQ(cypher, params);
    return results.map((rec: unknown) => {
      const r = rec as Record<string, unknown>;
      const rel = r.r as Record<string, unknown>;
      return {
        id: (rel.id ?? `e-${Math.random().toString(36).slice(2)}`) as string,
        source: r.src as string,
        target: r.tgt as string,
        type: r.rType as string,
        category: classifyEdge(r.rType as string),
        createdAt: (rel.createdAt ?? '') as string,
      };
    });
  }

  const store = getMemoryStore();
  return store.edges
    .filter((e) => {
      if (options?.nodeId && e.source !== options.nodeId && e.target !== options.nodeId) return false;
      if (options?.type && e.type !== options.type) return false;
      return true;
    })
    .slice(-limit)
    .reverse()
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      category: classifyEdge(e.type),
      createdAt: e.createdAt,
    }));
}

// ════════════════════════════════════════
// Search
// ════════════════════════════════════════

export async function searchGraph(
  query: string,
  options?: { type?: string; limit?: number }
): Promise<GraphNode[]> {
  const limit = options?.limit ?? 20;

  const runQ = await getRunQuery();
  if (runQ) {
    const cypher = options?.type
      ? `MATCH (n:${safeLabel(options.type)}) WHERE toLower(n.title) CONTAINS toLower($q) OR toLower(n.description) CONTAINS toLower($q) RETURN n ORDER BY n.createdAt DESC LIMIT $limit`
      : `MATCH (n) WHERE toLower(n.title) CONTAINS toLower($q) OR toLower(n.description) CONTAINS toLower($q) RETURN n, labels(n)[0] as nodeType ORDER BY n.createdAt DESC LIMIT $limit`;

    const results = await runQ(cypher, { q: query, limit });
    return results.map((rec: unknown) => {
      const r = rec as Record<string, unknown>;
      const n = r.n as Record<string, unknown>;
      return {
        id: n.id as string,
        type: ((r.nodeType ?? n.type ?? 'Idea') as string) as GraphNode['type'],
        title: (n.title ?? n.name ?? '') as string,
        description: (n.description ?? '') as string,
        createdAt: (n.createdAt ?? '') as string,
      };
    });
  }

  const store = getMemoryStore();
  return tokenSearch(
    store.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      description: n.description,
      metadata: { tags: n.tags },
    })),
    query,
    { type: options?.type, limit }
  ).map((n) => ({
    id: n.id,
    type: n.type as GraphNode['type'],
    title: n.title,
    description: n.description,
    createdAt: '',
  }));
}

// ════════════════════════════════════════
// Traversal & Visualization
// ════════════════════════════════════════

export async function getNeighborhood(
  nodeId: string,
  maxHops: number = 2,
  limit: number = 50
): Promise<GraphQueryResult> {
  const safeHops = clampInt(maxHops, 1, 5, 2);
  const safeLimit = clampInt(limit, 1, 200, 50);

  const runQ = await getRunQuery();
  if (runQ) {
    const cypher = `
      MATCH (start {id: $startId})
      MATCH path = (start)-[*1..${safeHops}]-(neighbor)
      WITH neighbor, min(length(path)) as distance
      RETURN neighbor, distance
      ORDER BY distance
      LIMIT $limit
    `;
    const results = await runQ(cypher, { startId: nodeId, limit: safeLimit });
    const nodes: GraphNode[] = results.map((rec: unknown) => {
      const r = rec as Record<string, unknown>;
      const n = r.neighbor as Record<string, unknown>;
      return {
        id: n.id as string,
        type: (n.type ?? 'Idea') as GraphNode['type'],
        title: (n.title ?? n.name ?? '') as string,
        description: (n.description ?? '') as string,
        createdAt: (n.createdAt ?? '') as string,
        level: r.distance as number,
      };
    });
    const edges = await listEdges({ nodeId, limit: limit * 3 });
    return { nodes, edges, totalNodes: nodes.length, totalEdges: edges.length };
  }

  // In-memory BFS
  const store = getMemoryStore();
  const neighbors = bfsNeighborhood(nodeId, store.edges, maxHops, limit);
  const neighborIds = new Set(neighbors.map((n) => n.id));
  neighborIds.add(nodeId);

  const nodes: GraphNode[] = store.nodes
    .filter((n) => neighborIds.has(n.id))
    .map((n) => ({
      id: n.id,
      type: n.type as GraphNode['type'],
      title: n.title,
      description: n.description,
      method: n.method,
      createdAt: n.createdAt,
      level: neighbors.find((nb) => nb.id === n.id)?.distance,
    }));

  const edges: GraphEdge[] = store.edges
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

/** 전체 그래프 → 3D 시각화 데이터
 * @param userId — 제공 시 해당 유저의 노드만 필터 (My Brain 모드)
 */
export async function getVisualizationData(maxNodes: number = 100, userId?: string) {
  if (userId) {
    // My Brain: in-memory store에서 userId 일치 노드만 추출
    const store = getMemoryStore();
    const filteredNodes = store.nodes
      .filter((n) => n.userId === userId)
      .slice(-maxNodes)
      .reverse()
      .map((n): GraphNode => ({
        id: n.id,
        type: n.type as GraphNode['type'],
        title: n.title,
        description: n.description,
        method: n.method,
        score: n.score,
        imageUrl: n.imageUrl,
        userId: n.userId,
        createdAt: n.createdAt,
      }));

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges: GraphEdge[] = store.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .slice(0, maxNodes * 3)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        category: classifyEdge(e.type),
        createdAt: e.createdAt,
      }));

    return toGraph3D(filteredNodes, filteredEdges);
  }

  // Collective Brain: all nodes
  const nodes = await listNodes({ limit: maxNodes });
  const edges = await listEdges({ limit: maxNodes * 3 });
  return toGraph3D(nodes, edges);
}

/** 그래프 통계 */
export async function getStats(): Promise<{
  totalNodes: number;
  totalEdges: number;
  byType: Record<string, number>;
  mode: 'memgraph' | 'in_memory';
}> {
  const store = getMemoryStore();
  const byType: Record<string, number> = {};
  for (const n of store.nodes) {
    byType[n.type] = (byType[n.type] ?? 0) + 1;
  }

  return {
    totalNodes: store.nodes.length,
    totalEdges: store.edges.length,
    byType,
    mode: USE_MEMGRAPH ? 'memgraph' : 'in_memory',
  };
}

/** Immersion context 가져오기 — 기존 그래프에서 주제 관련 지식 추출 */
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

  // 관련 엣지 (연결 정보)
  const nodeIds = new Set(relatedNodes.map((n) => n.id));
  const store = getMemoryStore();
  const relatedEdges = store.edges.filter(
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

/** 세션 결과를 Graph에 영구 저장
 *
 * 핵심: 매 세션의 아이디어가 Graph에 축적 → 다음 세션의 Immersion에서 재활용
 * Knowledge Distance (Luo 2022): "쓸수록 더 창의적"
 */
export async function persistSession(session: CreativeSession): Promise<{
  nodesCreated: number;
  edgesCreated: number;
}> {
  const store = getMemoryStore();
  const runQ = await getRunQuery();
  let nodesCreated = 0;
  let edgesCreated = 0;

  // 1. Domain 노드 (없으면 생성)
  const domainId = `domain-${session.domain.toLowerCase().replace(/\s+/g, '-')}`;
  const existingDomain = store.nodes.find((n) => n.id === domainId);
  if (!existingDomain) {
    store.nodes.push({
      id: domainId,
      type: 'Domain',
      title: session.domain,
      description: `Domain: ${session.domain}`,
      createdAt: session.createdAt,
    });
    if (runQ) {
      await runQ(
        'CREATE (n:Domain {id: $id, name: $name, description: $desc, createdAt: $ts})',
        { id: domainId, name: session.domain, desc: `Domain: ${session.domain}`, ts: session.createdAt }
      );
    }
    nodesCreated++;
  }

  // 2. Topic 노드
  const topicId = `topic-${session.id}`;
  store.nodes.push({
    id: topicId,
    type: 'Topic',
    title: session.topic,
    description: `Topic: ${session.topic} (${session.domain})`,
    createdAt: session.createdAt,
  });
  if (runQ) {
    await runQ(
      'CREATE (n:Topic {id: $id, title: $title, description: $desc, domainId: $domainId, createdAt: $ts})',
      { id: topicId, title: session.topic, desc: `Topic: ${session.topic}`, domainId, ts: session.createdAt }
    );
  }
  nodesCreated++;

  // Topic → Domain 엣지
  store.edges.push({ id: `e-${Date.now()}-td`, source: topicId, target: domainId, type: 'BELONGS_TO', createdAt: session.createdAt });
  if (runQ) {
    await runQ(
      'MATCH (a {id: $src}), (b {id: $tgt}) CREATE (a)-[:BELONGS_TO {createdAt: $ts}]->(b)',
      { src: topicId, tgt: domainId, ts: session.createdAt }
    );
  }
  edgesCreated++;

  // 3. Session 노드
  store.nodes.push({
    id: session.id,
    type: 'Session',
    title: `Session: ${session.topic}`,
    description: `${session.mode} mode, ${session.totalGenerated} ideas, ${session.duration}ms`,
    createdAt: session.createdAt,
  });
  if (runQ) {
    await runQ(
      'CREATE (n:Session {id: $id, title: $title, status: $status, mode: $mode, createdAt: $ts})',
      { id: session.id, title: `Session: ${session.topic}`, status: session.status, mode: session.mode, ts: session.createdAt }
    );
  }
  nodesCreated++;

  // 4. 모든 아이디어 노드 + 엣지
  const ideaIdMap = new Map<string, string>(); // old id → stored id (중복 방지)

  for (const idea of session.finalIdeas) {
    // 이미 store에 있으면 스킵 (heavy mode에서 agent가 이미 저장한 경우)
    if (store.nodes.some((n) => n.id === idea.id)) {
      ideaIdMap.set(idea.id, idea.id);
      continue;
    }

    store.nodes.push({
      id: idea.id,
      type: 'Idea',
      title: idea.title,
      description: idea.description,
      method: idea.method,
      score: idea.scores?.overall,
      createdAt: idea.createdAt,
    });

    if (runQ) {
      await runQ(
        'CREATE (n:Idea {id: $id, title: $title, description: $desc, method: $method, phase: $phase, createdAt: $ts})',
        {
          id: idea.id, title: idea.title, desc: idea.description,
          method: idea.method ?? '', phase: idea.theory ?? '',
          ts: idea.createdAt,
        }
      );
    }

    ideaIdMap.set(idea.id, idea.id);
    nodesCreated++;

    // Idea → Topic 엣지
    store.edges.push({ id: `e-${Date.now()}-${nodesCreated}a`, source: idea.id, target: topicId, type: 'ADDRESSES_TOPIC', createdAt: idea.createdAt });
    edgesCreated++;

    // Idea → Session 엣지
    store.edges.push({ id: `e-${Date.now()}-${nodesCreated}b`, source: idea.id, target: session.id, type: 'PRODUCED_IN', createdAt: idea.createdAt });
    edgesCreated++;

    // Parent → Child 엣지 (iteration/SCAMPER)
    if (idea.parentId && ideaIdMap.has(idea.parentId)) {
      const edgeType = idea.method?.includes('scamper') ? 'SCAMPER_OF' : 'ITERATED_FROM';
      store.edges.push({ id: `e-${Date.now()}-${nodesCreated}c`, source: idea.id, target: idea.parentId, type: edgeType, createdAt: idea.createdAt });
      edgesCreated++;
    }

    if (runQ) {
      await runQ(
        'MATCH (a {id: $src}), (b {id: $tgt}) CREATE (a)-[:ADDRESSES_TOPIC {createdAt: $ts}]->(b)',
        { src: idea.id, tgt: topicId, ts: idea.createdAt }
      );
      await runQ(
        'MATCH (a {id: $src}), (b {id: $tgt}) CREATE (a)-[:PRODUCED_IN {createdAt: $ts}]->(b)',
        { src: idea.id, tgt: session.id, ts: idea.createdAt }
      );
    }
  }

  scheduleAutoSave();
  return { nodesCreated, edgesCreated };
}
