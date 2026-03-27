/** Agent Tool Registry — 논문 기반 도구 11종
 *
 * 근거:
 * - Agent Ideate (IJCAI 2025): keyword extraction + 6-dim evaluation
 * - KG-Agent (2024): autonomous tool use over knowledge graphs
 * - TRIZ Agents (ICAART 2025): TRIZ principles as tools
 * - Knowledge Distance (KBS 2022): novelty measurement via graph distance
 */

import type { AgentRole } from '@/types/agent';
import { webSearchTool } from './web-search';
import { graphQueryTool, graphAddNodeTool, graphAddEdgeTool, graphSearchTool } from './graph-tools';
import { scamperTool } from './scamper-tool';
import { evaluateTool } from './evaluate-tool';
import { brainstormTool } from './brainstorm-tool';
import { keywordExtractorTool } from './keyword-extractor';
import { noveltyTool } from './novelty-tool';
import { trizTool } from './triz-tool';
import { imageAnalysisTool } from './image-tool';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/** 전체 도구 레지스트리 — 12종 */
export const ALL_TOOLS: AgentTool[] = [
  webSearchTool,
  graphQueryTool,
  graphAddNodeTool,
  graphAddEdgeTool,
  graphSearchTool,
  scamperTool,
  evaluateTool,
  brainstormTool,
  keywordExtractorTool,
  noveltyTool,
  trizTool,
  imageAnalysisTool,
];

/** 역할별 기본 도구 매핑 */
const ROLE_TOOLS: Record<AgentRole, string[]> = {
  creative_director: ['web_search', 'graph_search', 'graph_query', 'evaluate_idea', 'measure_novelty'],
  researcher:        ['extract_keywords', 'web_search', 'graph_search', 'graph_query', 'graph_add_node', 'analyze_image'],
  divergent_thinker: ['extract_keywords', 'web_search', 'brainstorm', 'scamper_transform', 'triz_principle', 'graph_add_node', 'graph_add_edge', 'analyze_image'],
  evaluator:         ['evaluate_idea', 'measure_novelty', 'graph_search', 'graph_query'],
  iterator:          ['graph_search', 'scamper_transform', 'triz_principle', 'graph_add_node', 'graph_add_edge', 'web_search', 'measure_novelty'],
  field_validator:   ['web_search', 'extract_keywords', 'graph_search', 'evaluate_idea', 'measure_novelty'],
};

const TECH_DOMAINS = ['cs', 'computer science', 'engineering', 'technology', 'software', 'ai', 'ml', 'fintech', 'biotech'];
const CREATIVE_DOMAINS = ['art', 'design', 'music', 'writing', 'film', 'fashion', 'architecture', 'game'];

/** 역할 + 도메인 기반 도구 필터링 (Agent Ideate 근거) */
export function getToolsForRole(role: AgentRole, domain?: string): AgentTool[] {
  const allowedNames = [...(ROLE_TOOLS[role] ?? [])];

  if (domain) {
    const d = domain.toLowerCase();
    if (TECH_DOMAINS.some((t) => d.includes(t)) && !allowedNames.includes('web_search')) {
      allowedNames.push('web_search');
    }
    if (CREATIVE_DOMAINS.some((c) => d.includes(c))) {
      if (!allowedNames.includes('scamper_transform')) allowedNames.push('scamper_transform');
      if (!allowedNames.includes('triz_principle')) allowedNames.push('triz_principle');
    }
  }

  return ALL_TOOLS.filter((t) => allowedNames.includes(t.name));
}

export function toAnthropicTools(tools: AgentTool[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object' as const,
      properties: t.parameters,
      required: Object.keys(t.parameters),
    },
  }));
}
