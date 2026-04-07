import type { Tier } from '@/lib/api-auth';
export type { Tier };
import { isDomainTool, parseDomainToolName } from './domain-tools';
import { getGateway } from '@/modules/domains';

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

export async function isToolAllowedAsync(tier: Tier, toolName: string): Promise<boolean> {
  if (!isDomainTool(toolName)) {
    return isToolAllowed(tier, toolName);
  }

  const parsed = parseDomainToolName(toolName);
  if (!parsed) return false;

  try {
    const gateway = await getGateway();
    const tools = gateway.getTools(parsed.domain, tier);
    return tools.some(t => t.name === parsed.tool);
  } catch {
    return false;
  }
}
