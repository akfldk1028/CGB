import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { runFourIsPipeline } from '@/modules/creativity/pipeline/four-is';
import { runMultiAgentPipeline, toCreativeSession } from '@/modules/agents/runtime/multi-agent';
import { persistSession } from '@/modules/graph/service';
import { canCreateSession, recordSessionUsage } from '@/modules/payment/usage';

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', `Rate limit exceeded. Retry after ${rl.retryAfterSec}s`, 429);

  const body = await request.json();
  if (!body.topic || !body.domain) return fail('VALIDATION', 'topic and domain are required');

  const usage = canCreateSession(auth.userId);
  if (!usage.allowed) return fail('USAGE_LIMIT', usage.reason!, 429);

  if (body.mode === 'heavy') {
    const agentResult = await runMultiAgentPipeline(body.topic, body.domain);
    const session = toCreativeSession(agentResult);
    const persisted = await persistSession(session);
    recordSessionUsage(auth.userId);
    return ok({ session, agentDetails: agentResult.agentResults.length, graphPersistence: persisted }, { tier: auth.tier, remaining: usage.remaining, limit: 5 });
  }

  const session = await runFourIsPipeline(body.topic, body.domain, { divergentCount: body.divergentCount });
  const persisted = await persistSession(session);
  recordSessionUsage(auth.userId);
  return ok({ session, graphPersistence: persisted }, { tier: auth.tier, remaining: usage.remaining, limit: 5 });
}
