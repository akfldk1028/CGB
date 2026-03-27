import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { convergentSelect } from '@/modules/creativity/theories/guilford';
import type { Idea } from '@/types/creativity';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { ideas, domain, criteria } = await request.json() as { ideas: Idea[]; domain: string; criteria?: string[] };
  if (!ideas?.length || !domain) return fail('VALIDATION', 'ideas array and domain are required');

  const result = await convergentSelect(ideas, domain, criteria);
  return ok(result, { tier: auth.tier });
}
