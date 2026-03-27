import { authenticateRequest } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { getStats } from '@/modules/graph/service';
import { isRedisConfigured } from '@/lib/redis';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const stats = await getStats();
  return ok({ ...stats, redis: isRedisConfigured() }, { tier: auth.tier });
}
