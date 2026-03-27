/** Concept 쿼리 — 재사용 가능한 핵심 개념 노드
 *
 * Csikszentmihalyi의 Domain "symbols and conventions"에 해당.
 * 여러 아이디어에서 공유되는 개념 (예: "Transfer Learning", "Attention Mechanism")
 */

import type { GraphNode } from '@/types/graph';

export const CONCEPT_QUERIES = {
  create: `
    CREATE (n:Concept {
      id: $id, name: $name, description: $desc,
      domainIds: $domainIds, references: $references,
      createdAt: $createdAt
    })
    RETURN n
  `,

  getById: `
    MATCH (n:Concept {id: $id})
    RETURN n
  `,

  getByDomain: `
    MATCH (n:Concept)
    WHERE $domainId IN n.domainIds
    RETURN n ORDER BY n.name
    LIMIT $limit
  `,

  search: `
    MATCH (n:Concept)
    WHERE toLower(n.name) CONTAINS toLower($query)
       OR toLower(n.description) CONTAINS toLower($query)
    RETURN n
    LIMIT $limit
  `,

  getLinkedIdeas: `
    MATCH (n:Concept {id: $conceptId})<-[:USES_CONCEPT]-(i:Idea)
    RETURN i ORDER BY i.createdAt DESC
    LIMIT $limit
  `,
} as const;

export interface CreateConceptParams {
  name: string;
  description: string;
  domainIds?: string[];
  references?: string[];
}

export function createConceptNode(params: CreateConceptParams): GraphNode {
  return {
    id: `concept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'Concept',
    title: params.name,
    description: params.description,
    metadata: {
      domainIds: params.domainIds ?? [],
      references: params.references ?? [],
    },
    createdAt: new Date().toISOString(),
  };
}
