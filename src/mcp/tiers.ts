import type { Tier } from '@/lib/api-auth';
export type { Tier };

/** Tools accessible by each tier */
const TIER_TOOLS: Record<Tier, string[]> = {
  free: ['graph_search', 'brainstorm', 'evaluate_idea'],
  pro: [
    'graph_search', 'graph_query', 'graph_add_node', 'graph_add_edge', 'web_search',
    'brainstorm', 'scamper_transform', 'triz_principle', 'evaluate_idea',
    'extract_keywords', 'measure_novelty',
  ],
  enterprise: [
    'graph_search', 'graph_query', 'graph_add_node', 'graph_add_edge', 'web_search',
    'brainstorm', 'scamper_transform', 'triz_principle', 'evaluate_idea',
    'extract_keywords', 'measure_novelty',
  ],
  team: [
    'graph_search', 'graph_query', 'graph_add_node', 'graph_add_edge', 'web_search',
    'brainstorm', 'scamper_transform', 'triz_principle', 'evaluate_idea',
    'extract_keywords', 'measure_novelty',
  ],
};

export function getAllowedTools(tier: Tier): string[] {
  return TIER_TOOLS[tier] ?? TIER_TOOLS.free;
}

export function isToolAllowed(tier: Tier, toolName: string): boolean {
  return getAllowedTools(tier).includes(toolName);
}
