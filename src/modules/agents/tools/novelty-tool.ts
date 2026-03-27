/** Novelty Score Tool — Graph 거리 기반 창의성 측정
 *
 * 근거: Luo et al. (2022) "Guiding Data-Driven Design Ideation by Knowledge Distance"
 * Knowledge-Based Systems, 218, 106873.
 *
 * 핵심 가설: "의미적으로 먼 개념을 연결할수록 더 창의적"
 * 측정: Graph에서 가장 가까운 기존 Idea까지의 최단 경로 길이
 */

import type { AgentTool } from './registry';
import { getMemoryStore } from './graph-tools';
import { calculateNoveltyInMemory } from '@/modules/graph/queries/novelty';

/** 경로 길이 → novelty score 변환 */
export function pathLengthToNovelty(pathLength: number | null): number {
  if (pathLength === null || pathLength === 0) return 100; // 연결 없음 = 완전 새로움
  if (pathLength === 1) return 10;  // 직접 연결 = 파생 (낮은 창의성)
  if (pathLength === 2) return 40;  // 2홉 = 약간의 거리
  if (pathLength === 3) return 70;  // 3홉 = 교차 도메인 수준
  return Math.min(95, 60 + pathLength * 8); // 4+ = 매우 높은 창의성
}

export const noveltyTool: AgentTool = {
  name: 'measure_novelty',
  description: `Measure the novelty/creativity of an idea by calculating its "knowledge distance" from existing ideas in the graph. Based on Luo et al. (KBS 2022): ideas that connect semantically distant concepts are more creative. Returns a novelty score 0-100.`,
  parameters: {
    idea_title: { type: 'string', description: 'Title of the idea to measure' },
    idea_description: { type: 'string', description: 'Description of the idea' },
  },
  execute: async (params) => {
    const title = (params.idea_title as string).toLowerCase();
    const store = getMemoryStore();

    // Find the node in the store by title match
    const targetNode = store.nodes.find((n) =>
      n.title.toLowerCase().includes(title) || title.includes(n.title.toLowerCase())
    );

    if (!targetNode) {
      // Idea not in graph yet — completely novel by definition
      return {
        noveltyScore: 95,
        reasoning: 'Idea not found in the knowledge graph — no prior art detected.',
        totalNodesInGraph: store.nodes.length,
        framework: 'Knowledge Distance (Luo et al., KBS 2022)',
      };
    }

    // Calculate actual novelty via BFS on in-memory edges
    const noveltyScore = calculateNoveltyInMemory(
      targetNode.id,
      store.edges.map((e) => ({ source: e.source, target: e.target }))
    );

    // Count similar nodes by keyword overlap
    const titleTokens = title.split(/\s+/).filter((t) => t.length > 2);
    const similarCount = store.nodes.filter((n) => {
      if (n.id === targetNode.id) return false;
      const nTitle = n.title.toLowerCase();
      return titleTokens.some((t) => nTitle.includes(t));
    }).length;

    return {
      noveltyScore,
      ideaId: targetNode.id,
      similarIdeasFound: similarCount,
      totalNodesInGraph: store.nodes.length,
      totalEdgesInGraph: store.edges.length,
      interpretation: noveltyScore >= 80 ? 'Highly novel — cross-domain or paradigm-shifting'
        : noveltyScore >= 50 ? 'Moderately novel — meaningful differentiation'
        : noveltyScore >= 20 ? 'Incremental — builds on existing ideas'
        : 'Derivative — very close to existing ideas',
      framework: 'Knowledge Distance (Luo et al., KBS 2022)',
    };
  },
};
