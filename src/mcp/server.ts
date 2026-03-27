/**
 * Minimal MCP (Model Context Protocol) server implementation.
 *
 * Implements the JSON-RPC 2.0 subset required by MCP:
 *   - initialize / initialized
 *   - tools/list
 *   - tools/call
 *   - ping
 *
 * No external dependency required -- the MCP wire protocol is just JSON-RPC.
 */

import { MCP_TOOLS, findTool } from './tools';
import { isToolAllowed, getAllowedTools, type Tier } from './tiers';

const SERVER_INFO = {
  name: 'creativegraph-ai',
  version: '1.0.0',
};

const CAPABILITIES = {
  tools: {},
};

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleMCPRequest(request: JsonRpcRequest, tier: Tier = 'free'): Promise<JsonRpcResponse | null> {
  const id = request.id ?? null;

  // Notifications (no id) -- acknowledge silently
  if (id == null && request.method === 'notifications/initialized') {
    return null;
  }

  switch (request.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: SERVER_INFO,
          capabilities: CAPABILITIES,
        },
      };

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list': {
      const allowed = getAllowedTools(tier);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS
            .filter((t) => allowed.includes(t.name))
            .map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
        },
      };
    }

    case 'tools/call': {
      const toolName = (request.params?.name as string) ?? '';
      const toolArgs = (request.params?.arguments as Record<string, unknown>) ?? {};

      if (!isToolAllowed(tier, toolName)) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: `Tool "${toolName}" requires a higher tier. Current tier: ${tier}` }) }],
            isError: true,
          },
        };
      }

      const tool = findTool(toolName);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
            isError: true,
          },
        };
      }

      try {
        const result = await tool.execute(toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
            isError: true,
          },
        };
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
  }
}
