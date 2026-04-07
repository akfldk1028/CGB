import { authenticateRequest } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { getGateway } from '@/modules/domains';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const { domainId } = await params;
  const gateway = await getGateway();
  const domain = gateway.getDomain(domainId);
  if (!domain) return fail('DOMAIN_NOT_FOUND', `Domain not found: ${domainId}`, 404);

  const tools = gateway.getTools(domainId, auth.tier);
  return ok({ tools, total: tools.length }, { tier: auth.tier });
}
