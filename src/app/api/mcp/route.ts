import { handleSSEGet, handleSSEPost } from '@/mcp/transport-sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * MCP SSE endpoint for CreativeGraph AI.
 *
 * GET  /api/mcp           -> Establish SSE connection, returns sessionId
 * POST /api/mcp?sessionId= -> Send JSON-RPC message to MCP server
 *
 * Auth: Bearer token via CREATIVEGRAPH_API_KEY env var (optional).
 *
 * Usage with Claude Code / OpenClaw:
 *   1. GET /api/mcp (with Authorization header if key is set)
 *   2. Read the `endpoint` SSE event to get the POST URL
 *   3. POST JSON-RPC messages to that URL
 *   4. Read `message` SSE events for responses
 */
export function GET(request: Request) {
  return handleSSEGet(request);
}

export function POST(request: Request) {
  return handleSSEPost(request);
}
