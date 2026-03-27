import { authenticateRequest, tierAtLeast } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, created, fail } from '@/lib/api-response';
import { listNodes, addNode, getNode, getStats } from '@/modules/graph/service';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '100', 10);

  if (id) {
    const node = await getNode(id);
    if (!node) return fail('NOT_FOUND', `Node not found: ${id}`, 404);
    return ok(node, { tier: auth.tier });
  }

  const nodes = await listNodes({ type, limit });
  const stats = await getStats();
  return ok({ nodes, total: nodes.length, stats }, { tier: auth.tier, remaining: rl.remaining, limit: rl.limit });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);
  if (!tierAtLeast(auth.tier, 'pro')) return fail('TIER_REQUIRED', 'Pro tier required to create nodes', 403);

  const body = await request.json();
  if (!body.type || !body.title) return fail('VALIDATION', 'type and title are required');

  const nodeType = body.type === 'Concept' ? 'Concept' as const : body.type === 'Session' ? 'Session' as const : 'Idea' as const;
  const node = await addNode(nodeType, body);
  return created(node, { tier: auth.tier });
}
