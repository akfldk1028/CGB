import { authenticateRequest, tierAtLeast } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, created, fail } from '@/lib/api-response';
import { listEdges, addEdge } from '@/modules/graph/service';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId') ?? undefined;
  const type = searchParams.get('type') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '200', 10);

  const edges = await listEdges({ nodeId, type, limit });
  return ok({ edges, total: edges.length }, { tier: auth.tier });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);
  if (!tierAtLeast(auth.tier, 'pro')) return fail('TIER_REQUIRED', 'Pro tier required to create edges', 403);

  const { sourceId, targetId, type } = await request.json();
  if (!sourceId || !targetId || !type) return fail('VALIDATION', 'sourceId, targetId, and type are required');

  const edge = await addEdge({ sourceId, targetId, type });
  return created(edge, { tier: auth.tier });
}
