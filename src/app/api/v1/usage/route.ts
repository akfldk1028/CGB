/** GET /api/v1/usage — 내 사용량 조회 */

import { authenticateRequest } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { getUserUsage } from '@/modules/payment/usage';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const usage = getUserUsage(auth.userId);
  return ok({
    userId: auth.userId,
    tier: auth.tier,
    sessionsThisMonth: usage.sessionsThisMonth,
    monthlyLimit: auth.tier === 'free' ? 5 : -1,
    remaining: auth.tier === 'free' ? Math.max(0, 5 - usage.sessionsThisMonth) : -1,
  }, { tier: auth.tier });
}
