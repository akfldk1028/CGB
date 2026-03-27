/** Session 쿼리 — 창의 세션 기록 및 추적 */

import type { GraphNode } from '@/types/graph';

export const SESSION_QUERIES = {
  create: `
    CREATE (n:Session {
      id: $id, topicId: $topicId, status: $status,
      agents: $agents, createdAt: $createdAt
    })
    RETURN n
  `,

  getById: `
    MATCH (n:Session {id: $id})
    RETURN n
  `,

  updateStatus: `
    MATCH (n:Session {id: $id})
    SET n.status = $status, n.completedAt = $completedAt
    RETURN n
  `,

  getIdeas: `
    MATCH (n:Session {id: $sessionId})<-[:PRODUCED_IN]-(i:Idea)
    RETURN i ORDER BY i.createdAt
  `,

  recent: `
    MATCH (n:Session)
    RETURN n ORDER BY n.createdAt DESC
    LIMIT $limit
  `,

  stats: `
    MATCH (n:Session {id: $sessionId})
    OPTIONAL MATCH (n)<-[:PRODUCED_IN]-(i:Idea)
    RETURN n, count(i) as ideaCount
  `,
} as const;

export interface CreateSessionParams {
  topicId: string;
  agents?: string[];
}

export function createSessionNode(params: CreateSessionParams): GraphNode {
  return {
    id: `session-${Date.now()}`,
    type: 'Session',
    title: `Session for ${params.topicId}`,
    description: '',
    metadata: {
      topicId: params.topicId,
      status: 'active',
      agents: params.agents ?? [],
    },
    createdAt: new Date().toISOString(),
  };
}
