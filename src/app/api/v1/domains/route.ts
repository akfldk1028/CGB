import { authenticateRequest } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { getGateway } from '@/modules/domains';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const gateway = await getGateway();
  const domains = gateway.getDomains();
  return ok({ domains, total: domains.length }, { tier: auth.tier });
}
