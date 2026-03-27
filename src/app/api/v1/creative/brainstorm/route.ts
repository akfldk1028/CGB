import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { divergeConvergeCycle } from '@/modules/creativity/pipeline/diverge-converge';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { topic, domain, count = 10, topK = 5 } = await request.json();
  if (!topic || !domain) return fail('VALIDATION', 'topic and domain are required');

  const result = await divergeConvergeCycle(topic, domain, count, topK);
  return ok(result, { tier: auth.tier, remaining: rl.remaining, limit: rl.limit });
}
