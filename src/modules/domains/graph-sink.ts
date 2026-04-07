import type { DomainToolConfig } from './types';
import type { StoreNode } from '@/modules/graph/store';

/** Extract value from object using simple JSONPath ($.field.nested) */
export function extractFieldByPath(obj: unknown, jsonPath: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = jsonPath.replace(/^\$\./, '').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const TITLE_FIELDS = ['title', 'name', 'lawNameKorean', 'lawName', 'caseNm', 'label'];
const DESC_FIELDS = ['description', 'snippet', 'summary', 'content', 'courtNm', 'text'];

/** Convert MCP result → StoreNode-like object for graph insertion */
export function resultToNode(
  result: unknown,
  toolConfig: DomainToolConfig,
  domainId: string,
  agentId?: string,
): StoreNode {
  const mapping = toolConfig.graph?.mapping;
  const nodeType = toolConfig.graph?.node_type || 'Concept';

  let title: string;
  let description: string;
  const metadata: Record<string, unknown> = {};

  if (mapping) {
    title = String(mapping.title ? extractFieldByPath(result, mapping.title) ?? '' : '');
    description = String(mapping.description ? extractFieldByPath(result, mapping.description) ?? '' : '');
    if (mapping.metadata) {
      for (const path of mapping.metadata) {
        const key = path.replace(/^\$\./, '');
        const val = extractFieldByPath(result, path);
        if (val !== undefined) metadata[key] = val;
      }
    }
  } else {
    const obj = (result && typeof result === 'object') ? result as Record<string, unknown> : {};
    title = '';
    for (const f of TITLE_FIELDS) {
      if (obj[f] && typeof obj[f] === 'string') { title = obj[f] as string; break; }
    }
    description = '';
    for (const f of DESC_FIELDS) {
      if (obj[f] && typeof obj[f] === 'string') { description = obj[f] as string; break; }
    }
  }

  if (!title) title = `${toolConfig.name} result`;
  if (!description) {
    try { description = JSON.stringify(result).slice(0, 500); } catch { description = ''; }
  }

  return {
    id: `domain-${domainId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: nodeType,
    title,
    description,
    agentId: agentId || undefined,
    domain: domainId,
    layer: 2,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    createdAt: new Date().toISOString(),
  };
}

/** Detect sub-domain from MCP result */
export function detectSubDomain(
  result: unknown,
  toolConfig: DomainToolConfig,
): string | undefined {
  if (!toolConfig.graph?.sub_domain_field) return undefined;
  const val = extractFieldByPath(result, toolConfig.graph.sub_domain_field);
  return val ? String(val) : undefined;
}
