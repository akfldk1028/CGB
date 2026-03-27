import { handleSSEGet, handleSSEPost } from '@/mcp/transport-sse';
import { authenticateApiKey, extractApiKey } from '@/mcp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * MCP SSE endpoint for CreativeGraph AI — Team tier only.
 *
 * Same as /api/mcp but requires a valid API key with team-level access.
 * Returns 403 if the caller does not have team tier.
 */

function requireTeam(request: Request): Response | null {
  const apiKey = extractApiKey(request);
  const auth = authenticateApiKey(apiKey);

  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ error: auth.error ?? 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (auth.tier !== 'team') {
    return new Response(
      JSON.stringify({ error: 'Team tier required for collective endpoint' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return null;
}

export function GET(request: Request) {
  const denied = requireTeam(request);
  if (denied) return denied;
  return handleSSEGet(request);
}

export async function POST(request: Request) {
  const denied = requireTeam(request);
  if (denied) return denied;
  return handleSSEPost(request);
}
