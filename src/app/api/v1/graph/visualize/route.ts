import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { generateMockGraph, SEED_ITERATION_CHAIN } from '@/lib/mock-graph';
import { getVisualizationData, getStats } from '@/modules/graph/service';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'live';
  const maxNodes = parseInt(searchParams.get('maxNodes') ?? '100', 10);
  const scope = (searchParams.get('scope') ?? 'collective') as 'my' | 'collective';

  if (mode === 'seed') return ok(SEED_ITERATION_CHAIN, { tier: auth.tier });

  if (mode === 'mock') {
    return ok(generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5)), { tier: auth.tier });
  }

  const stats = await getStats();
  if (stats.totalNodes === 0) {
    const data = generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5));
    return ok({ ...data, _meta: { source: 'mock_fallback', reason: 'graph empty', stats } }, { tier: auth.tier });
  }

  const filterUserId = scope === 'my' ? auth.userId : undefined;
  const data = await getVisualizationData(maxNodes, filterUserId);
  return ok({ ...data, _meta: { source: stats.mode, scope, stats } }, { tier: auth.tier });
}
