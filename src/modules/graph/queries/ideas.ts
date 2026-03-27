/** Idea CRUD 쿼리 — Graph DB 핵심 엔티티
 *
 * Dual-mode: Memgraph 연결 시 Cypher, 미연결 시 in-memory store.
 * Geneplore maturity: raw → explored → refined → validated
 */

import type { GraphNode, GraphEdge } from '@/types/graph';
import type { IdeaNode, GenerationMethod } from '../schema';

// ── Cypher Queries ──

export const IDEA_QUERIES = {
  create: `
    CREATE (n:Idea {
      id: $id, title: $title, description: $desc,
      topicId: $topicId, generationMethod: $method,
      authorAgent: $author, maturityStage: $maturity,
      phase: $phase, tags: $tags,
      createdAt: $createdAt, updatedAt: $updatedAt
    })
    RETURN n
  `,

  getById: `
    MATCH (n:Idea {id: $id})
    RETURN n
  `,

  getByTopic: `
    MATCH (n:Idea {topicId: $topicId})
    RETURN n ORDER BY n.createdAt DESC
    LIMIT $limit
  `,

  getByPhase: `
    MATCH (n:Idea {phase: $phase})
    RETURN n ORDER BY n.createdAt DESC
    LIMIT $limit
  `,

  updateScores: `
    MATCH (n:Idea {id: $id})
    SET n.scoreDomainRelevance = $domainRelevance,
        n.scoreCreativeThinking = $creativeThinking,
        n.scoreIntrinsicMotivation = $intrinsicMotivation,
        n.scoreOverall = $overall,
        n.updatedAt = $updatedAt
    RETURN n
  `,

  updateMaturity: `
    MATCH (n:Idea {id: $id})
    SET n.maturityStage = $maturity, n.updatedAt = $updatedAt
    RETURN n
  `,

  getRelated: `
    MATCH (n:Idea {id: $id})-[r]-(related:Idea)
    RETURN related, type(r) as relationType
    LIMIT $limit
  `,

  getLineage: `
    MATCH path = (n:Idea {id: $id})<-[:ITERATED_FROM|SCAMPER_OF|INSPIRED_BY*1..5]-(descendant:Idea)
    RETURN nodes(path) as lineage, length(path) as depth
    ORDER BY depth
  `,

  countByDomain: `
    MATCH (n:Idea)-[:ADDRESSES_TOPIC]->(t:Topic)-[:BELONGS_TO]->(d:Domain {id: $domainId})
    RETURN count(n) as count
  `,

  recent: `
    MATCH (n:Idea)
    RETURN n ORDER BY n.createdAt DESC
    LIMIT $limit
  `,
} as const;

// ── In-memory helpers ──

export interface CreateIdeaParams {
  title: string;
  description: string;
  topicId?: string;
  method: GenerationMethod | string;
  authorAgent?: string;
  maturityStage?: IdeaNode['maturityStage'];
  phase?: IdeaNode['phase'];
  tags?: string[];
  parentIdeaId?: string;
}

export function createIdeaNode(params: CreateIdeaParams): GraphNode {
  const now = new Date().toISOString();
  return {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'Idea',
    title: params.title,
    description: params.description,
    method: params.method,
    authorAgent: params.authorAgent ?? 'system',
    metadata: {
      topicId: params.topicId,
      maturityStage: params.maturityStage ?? 'raw',
      phase: params.phase ?? 'inspiration',
      tags: params.tags ?? [],
      parentIdeaId: params.parentIdeaId,
    },
    createdAt: now,
  };
}
