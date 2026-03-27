import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { searchGraph, getNeighborhood } from '@/modules/graph/service';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const type = searchParams.get('type') ?? undefined;
  const nodeId = searchParams.get('nodeId');
  const hops = parseInt(searchParams.get('hops') ?? '2', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  if (nodeId) {
    const result = await getNeighborhood(nodeId, hops, limit);
    return ok(result, { tier: auth.tier });
  }

  if (!q) return fail('VALIDATION', 'q (query) or nodeId parameter required');

  const results = await searchGraph(q, { type, limit });
  return ok({ query: q, results, total: results.length }, { tier: auth.tier });
}
