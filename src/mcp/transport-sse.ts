/**
 * SSE transport for the MCP server, designed for Next.js API routes.
 *
 * Flow:
 *   1. Client sends GET /api/mcp -> receives SSE stream + sessionId in first event
 *   2. Client sends POST /api/mcp?sessionId=xxx with JSON-RPC body
 *   3. Server processes request, pushes response via SSE stream
 *
 * Each session holds a WritableStreamDefaultWriter so the server can push
 * events at any time. Sessions are cleaned up on disconnect or after 30 min.
 */

import { handleMCPRequest } from './server';

interface Session {
  writer: WritableStreamDefaultWriter<string>;
  createdAt: number;
}

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const encoder = new TextEncoder();

/** Prune expired sessions. */
function pruneExpired(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      try { session.writer.close(); } catch { /* already closed */ }
      sessions.delete(id);
    }
  }
}

/** Check Bearer token auth. Returns error Response or null if OK. */
function checkAuth(request: Request): Response | null {
  const apiKey = process.env.CREATIVEGRAPH_API_KEY;
  if (!apiKey) return null; // no key configured = open access

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

/**
 * Handle GET -- establish SSE connection.
 * Returns a streaming Response with `text/event-stream` content type.
 */
export function handleSSEGet(request: Request): Response {
  const authError = checkAuth(request);
  if (authError) return authError;

  pruneExpired();

  const sessionId = crypto.randomUUID();

  const { readable, writable } = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(encoder.encode(chunk));
    },
  });

  const writer = writable.getWriter();
  sessions.set(sessionId, { writer, createdAt: Date.now() });

  // Send initial endpoint event so client knows where to POST
  const endpointEvent = `event: endpoint\ndata: /api/mcp?sessionId=${sessionId}\n\n`;
  writer.write(endpointEvent).catch(() => {
    sessions.delete(sessionId);
  });

  // Handle client disconnect via AbortSignal
  request.signal?.addEventListener('abort', () => {
    sessions.delete(sessionId);
    try { writer.close(); } catch { /* already closed */ }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-MCP-Session-Id': sessionId,
    },
  });
}

/**
 * Handle POST -- receive JSON-RPC message, process, push response via SSE.
 */
export async function handleSSEPost(request: Request): Promise<Response> {
  const authError = checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId || !sessions.has(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'No active session. Connect via GET first.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const session = sessions.get(sessionId)!;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const rpcRequest = body as {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: Record<string, unknown>;
  };

  const response = await handleMCPRequest(rpcRequest);

  // Notifications return null -- no response to send
  if (response) {
    const sseData = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
    try {
      await session.writer.write(sseData);
    } catch {
      // SSE stream closed -- clean up
      sessions.delete(sessionId);
      return new Response(
        JSON.stringify({ error: 'SSE connection closed' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  return new Response('OK', { status: 202 });
}

/** Get active session count (for monitoring). */
export function getActiveSessionCount(): number {
  pruneExpired();
  return sessions.size;
}
