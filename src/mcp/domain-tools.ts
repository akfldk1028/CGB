import type { MCPToolDef } from './tools';
import { getGateway } from '@/modules/domains';
import type { DomainToolConfig } from '@/modules/domains/types';

/** Convert domain tool configs to MCP tool definitions.
 *  Naming: "domainId:toolName" (e.g. "korean-law:search_law")
 */
export async function getDomainMCPTools(): Promise<MCPToolDef[]> {
  const gateway = await getGateway();
  const domains = gateway.getDomains();
  const tools: MCPToolDef[] = [];

  for (const domain of domains) {
    const domainTools = gateway.getTools(domain.name);
    for (const t of domainTools) {
      tools.push(domainToolToMCP(domain.name, t));
    }
  }

  return tools;
}

function domainToolToMCP(domainId: string, tool: DomainToolConfig): MCPToolDef {
  const properties = tool.input_schema?.properties ?? {};
  const required = tool.input_schema?.required ?? [];

  return {
    name: `${domainId}:${tool.name}`,
    description: `[${domainId}] ${tool.name}`,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
    execute: async (args: Record<string, unknown>) => {
      const gateway = await getGateway();
      const result = await gateway.call(domainId, tool.name, args, { saveToGraph: true });
      return result;
    },
  };
}

/** Check if a tool name is a domain tool (contains ':') */
export function isDomainTool(name: string): boolean {
  return name.includes(':');
}

/** Parse "korean-law:search_law" → { domain, tool } */
export function parseDomainToolName(name: string): { domain: string; tool: string } | null {
  const idx = name.indexOf(':');
  if (idx === -1) return null;
  return { domain: name.slice(0, idx), tool: name.slice(idx + 1) };
}
