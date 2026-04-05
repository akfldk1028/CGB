import { ok } from '@/lib/api-response';
import { generateMockGraph, SEED_ITERATION_CHAIN } from '@/lib/mock-graph';
import { getVisualizationData, getStats } from '@/modules/graph/service';
import type { BrainView } from '@/modules/graph/queries/brain-views';

export async function GET(request: Request) {
  // Public access (no auth required for graph visualization)
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'live';
  const maxNodes = Math.min(parseInt(searchParams.get('maxNodes') ?? '500', 10) || 500, 5000);
  const view = (searchParams.get('view') ?? 'collective') as BrainView;
  const domainId = searchParams.get('domainId') ?? undefined;
  const agentId = searchParams.get('agentId') ?? undefined;

  if (mode === 'seed') return ok(SEED_ITERATION_CHAIN);
  if (mode === 'mock') return ok(generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5)));

  // Live mode — fetch real data first, then check if empty
  const userId = view === 'user' ? undefined : undefined;
  const data = await getVisualizationData(maxNodes, userId, view, { domainId, agentId });
  const stats = await getStats();

  const hasData = (data.nodes?.length ?? 0) > 0;
  if (!hasData) {
    const mockData = generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5));
    return ok({ ...mockData, _meta: { source: 'mock_fallback', reason: 'graph empty', stats } });
  }

  return ok({ ...data, _meta: { source: stats.mode, view, stats } });
}
