/** Keyword Extractor Tool — 주제에서 핵심 검색 키워드 추출
 *
 * 근거: Agent Ideate (IJCAI 2025, Kanumolu et al.)
 * Keyword Extractor Agent가 검색 전에 핵심 키워드를 뽑으면
 * 웹 검색 정확도가 극적으로 높아짐 (CS 도메인 86% 승률).
 */

import type { AgentTool } from './registry';

export const keywordExtractorTool: AgentTool = {
  name: 'extract_keywords',
  description: 'Extract 2-3 core keywords from a topic or idea description for targeted web search. Use this BEFORE web_search to improve search accuracy. Based on Agent Ideate (IJCAI 2025) finding that keyword extraction dramatically improves search relevance.',
  parameters: {
    text: { type: 'string', description: 'Topic, idea title, or description to extract keywords from' },
    count: { type: 'number', description: 'Number of keywords to extract (default 3)' },
  },
  execute: async (params) => {
    // 프레임 제공 — 실제 추출은 에이전트 LLM이 수행
    return {
      instruction: `Extract ${params.count ?? 3} core technical/domain keywords from: "${params.text}". Keywords should be specific enough for web search but broad enough to find relevant results. Return as a list.`,
      tips: [
        'Focus on technical terms, not generic words',
        'Include domain-specific jargon',
        'Combine keywords for more specific searches',
      ],
      reference: 'Agent Ideate (Kanumolu et al., IJCAI 2025) — Keyword Extractor Agent',
    };
  },
};
