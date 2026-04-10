import { authenticateRequest, tierAtLeast } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ok, created, fail } from '@/lib/api-response';
import { listNodes, addNode, getNode } from '@/modules/graph/service';
import { storeManager } from '@/modules/graph/store';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);

  const rl = await checkRateLimit(auth.userId, auth.tier);
  if (!rl.allowed) return fail('RATE_LIMITED', 'Rate limit exceeded', 429);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') ?? undefined;
    const agentId = searchParams.get('agent_id') ?? undefined;
    const domain = searchParams.get('domain') ?? undefined;
    const layer = searchParams.has('layer') ? parseInt(searchParams.get('layer')!, 10) : undefined;
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);
    // metadata filter: ?meta.type=evaluation&meta.seriesId=xxx
    const metadata: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('meta.')) {
        metadata[key.slice(5)] = value;
      }
    }
    const hasMetadata = Object.keys(metadata).length > 0 ? metadata : undefined;

    if (id) {
      const node = await getNode(id);
      if (!node) return fail('NOT_FOUND', `Node not found: ${id}`, 404);
      return ok(node, { tier: auth.tier });
    }

    const nodes = await listNodes({ type, agentId, domain, layer, limit, metadata: hasMetadata });
    return ok({ nodes, total: nodes.length }, { tier: auth.tier, remaining: rl.remaining, limit: rl.limit });
  } catch (err) {
    console.error('[GET /graph/nodes] error:', err);
    return fail('INTERNAL', (err as Error).message, 500);
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return fail('UNAUTHORIZED', auth.error!, 401);
  if (!tierAtLeast(auth.tier, 'pro')) return fail('TIER_REQUIRED', 'Pro tier required to create nodes', 403);

  try {
    const body = await request.json();
    if (!body.type || !body.title) return fail('VALIDATION', 'type and title are required');

    // Agent/Episode/Domain 등 v2 타입은 직접 store에 저장
    if (!['Idea', 'Concept', 'Session'].includes(body.type)) {
      const store = await storeManager.ensureReady();
      const id = body.id || `${body.type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const node = await store.addNode({
        id,
        type: body.type,
        title: body.title,
        description: body.description ?? '',
        agentId: body.agent_id,
        domain: body.domain,
        layer: body.layer ?? 2,
        metadata: body.metadata ?? {},
        createdAt: new Date().toISOString(),
      });
      return created(node, { tier: auth.tier });
    }

    const nodeType = body.type === 'Concept' ? 'Concept' as const : body.type === 'Session' ? 'Session' as const : 'Idea' as const;
    const node = await addNode(nodeType, body);
    return created(node, { tier: auth.tier });
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    console.error('[POST /graph/nodes] error:', err);
    return fail('INTERNAL', message, 500);
  }
}
