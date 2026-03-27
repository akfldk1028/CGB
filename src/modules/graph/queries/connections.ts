/** Edge/Connection 쿼리 — 3계층 관계 (생성, 의미, 구조)
 *
 * 설계 근거:
 * - Barrios et al. (2020): 아이디어 간 관계 온톨로지
 * - 3계층: Creation(provenance) / Semantic(meaning) / Structural(hierarchy)
 */

import type { GraphEdge } from '@/types/graph';
import type { EdgeType, CreationEdge, SemanticEdge, StructuralEdge } from '../schema';

export const CONNECTION_QUERIES = {
  create: `
    MATCH (a {id: $sourceId}), (b {id: $targetId})
    CREATE (a)-[r:$TYPE {id: $id, createdAt: $createdAt}]->(b)
    RETURN r
  `,

  getByNode: `
    MATCH (n {id: $nodeId})-[r]-(other)
    RETURN n, r, other, type(r) as relationType
    LIMIT $limit
  `,

  getByType: `
    MATCH (a)-[r:$TYPE]->(b)
    RETURN a, r, b
    LIMIT $limit
  `,

  getPath: `
    MATCH path = shortestPath((a {id: $sourceId})-[*..5]-(b {id: $targetId}))
    RETURN nodes(path) as pathNodes, relationships(path) as pathEdges, length(path) as distance
  `,

  deleteEdge: `
    MATCH ()-[r {id: $edgeId}]->()
    DELETE r
  `,
} as const;

const CREATION_EDGES = new Set<string>(['INSPIRED_BY', 'ITERATED_FROM', 'COMBINED_FROM', 'SCAMPER_OF', 'DERIVED_FROM', 'GENERATED_BY', 'RESEARCHED_FROM']);
const SEMANTIC_EDGES = new Set<string>(['CONTRADICTS', 'SUPPORTS', 'CAUSES', 'SIMILAR_TO', 'ALTERNATIVE_TO', 'PREREQUISITE_OF', 'EXTENDS']);
const STRUCTURAL_EDGES = new Set<string>(['PART_OF', 'GENERALIZES', 'SPECIALIZES', 'BELONGS_TO', 'PRODUCED_IN', 'USES_CONCEPT', 'ADDRESSES_TOPIC', 'PRODUCES']);

export function classifyEdge(type: string): 'creation' | 'semantic' | 'structural' {
  if (CREATION_EDGES.has(type)) return 'creation';
  if (SEMANTIC_EDGES.has(type)) return 'semantic';
  return 'structural';
}

export interface CreateEdgeParams {
  sourceId: string;
  targetId: string;
  type: string;
}

export function createEdge(params: CreateEdgeParams): GraphEdge {
  return {
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
    source: params.sourceId,
    target: params.targetId,
    type: params.type,
    category: classifyEdge(params.type),
    createdAt: new Date().toISOString(),
  };
}
