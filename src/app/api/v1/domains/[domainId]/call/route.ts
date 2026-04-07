import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, fail } from '@/lib/api-response';
import { getGateway } from '@/modules/domains';
import type { DomainCallRequest } from '@/modules/domains/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domainId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { domainId } = await params;
  const body: DomainCallRequest = await request.json();
  if (!body.tool) return fail('VALIDATION', 'tool is required');

  const gateway = await getGateway();

  // Check tool tier access
  const tools = gateway.getTools(domainId, auth.tier);
  const toolAllowed = tools.some(t => t.name === body.tool);
  if (!toolAllowed) {
    const allTools = gateway.getTools(domainId);
    const toolExists = allTools.some(t => t.name === body.tool);
    if (!toolExists) {
      const domain = gateway.getDomain(domainId);
      if (!domain) return fail('DOMAIN_NOT_FOUND', `Domain not found: ${domainId}`, 404);
      return fail('TOOL_NOT_FOUND', `Tool not found: ${body.tool}`, 404);
    }
    return fail('TIER_RESTRICTED', `Tool ${body.tool} requires a higher tier`, 403);
  }

  const result = await gateway.call(domainId, body.tool, body.args || {}, {
    agentId: body.agent_id,
    saveToGraph: body.save_to_graph,
    apiKey: body.api_key,
  });

  if (!result.ok) {
    const status = result.error!.code === 'UPSTREAM_TIMEOUT' ? 504 : 502;
    return fail(result.error!.code, result.error!.message, status);
  }

  return ok(result, { tier: auth.tier, remaining: rl.remaining, limit: rl.limit });
}
