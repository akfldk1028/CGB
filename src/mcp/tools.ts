/**
 * MCP Tool definitions for CreativeGraph AI.
 *
 * Wraps the 11 internal agent tools as MCP-compatible tool schemas
 * with JSON Schema inputSchema and execute functions.
 */

import { webSearchTool } from '../modules/agents/tools/web-search';
import { graphQueryTool, graphAddNodeTool, graphAddEdgeTool, graphSearchTool } from '../modules/agents/tools/graph-tools';
import { scamperTool } from '../modules/agents/tools/scamper-tool';
import { evaluateTool } from '../modules/agents/tools/evaluate-tool';
import { brainstormTool } from '../modules/agents/tools/brainstorm-tool';
import { keywordExtractorTool } from '../modules/agents/tools/keyword-extractor';
import { noveltyTool } from '../modules/agents/tools/novelty-tool';
import { trizTool } from '../modules/agents/tools/triz-tool';
import type { AgentTool } from '../modules/agents/tools/registry';

// ---------------------------------------------------------------------------
// Tool definition type (MCP-compatible)
// ---------------------------------------------------------------------------

export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// AgentTool -> MCPToolDef adapter
// ---------------------------------------------------------------------------

function fromAgentTool(tool: AgentTool): MCPToolDef {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, schema] of Object.entries(tool.parameters)) {
    properties[key] = schema;
    // Treat all parameters as required unless description says "optional"
    const desc = (schema as { description?: string }).description ?? '';
    if (!desc.toLowerCase().includes('optional')) {
      required.push(key);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: { type: 'object', properties, required },
    execute: tool.execute,
  };
}

// ---------------------------------------------------------------------------
// All 11 tools
// ---------------------------------------------------------------------------

export const MCP_TOOLS: MCPToolDef[] = [
  // Graph tools (4)
  fromAgentTool(graphSearchTool),
  fromAgentTool(graphQueryTool),
  fromAgentTool(graphAddNodeTool),
  fromAgentTool(graphAddEdgeTool),

  // Search (1)
  fromAgentTool(webSearchTool),

  // Creativity tools (3)
  fromAgentTool(brainstormTool),
  fromAgentTool(scamperTool),
  fromAgentTool(trizTool),

  // Evaluation tools (3)
  fromAgentTool(evaluateTool),
  fromAgentTool(keywordExtractorTool),
  fromAgentTool(noveltyTool),
];

/** Lookup tool by name. */
export function findTool(name: string): MCPToolDef | undefined {
  return MCP_TOOLS.find((t) => t.name === name);
}
