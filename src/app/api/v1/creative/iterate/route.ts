import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { scamperTransform, scamperFullSweep } from '@/modules/creativity/techniques/scamper';
import type { Idea, ScamperType } from '@/types/creativity';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { idea, technique, fullSweep = false } = await request.json() as { idea: Idea; technique?: ScamperType; fullSweep?: boolean };
  if (!idea) return fail('VALIDATION', 'idea is required');

  if (fullSweep) {
    const results = await scamperFullSweep(idea);
    return ok({ results }, { tier: auth.tier });
  }

  if (!technique) return fail('VALIDATION', 'technique or fullSweep=true required');

  const result = await scamperTransform(idea, technique);
  return ok(result, { tier: auth.tier });
}
