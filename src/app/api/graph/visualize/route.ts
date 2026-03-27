import { NextResponse } from 'next/server';
import { generateMockGraph, SEED_ITERATION_CHAIN } from '@/lib/mock-graph';
import { getVisualizationData, getStats } from '@/modules/graph/service';
import type { ApiResponse } from '@/types/api';

/** GET /api/graph/visualize — 3D 렌더용 그래프 데이터
 *
 * mode=mock → 랜덤 목업 (개발용)
 * mode=seed → 수업 예시 Iteration 체인
 * mode=live → 실제 in-memory/Memgraph 데이터
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'live';
  const maxNodes = Math.min(Math.max(parseInt(searchParams.get('maxNodes') ?? '100', 10) || 100, 1), 500);
  const scope = (searchParams.get('scope') ?? 'collective') as 'my' | 'collective';
  const userId = searchParams.get('userId') ?? undefined;

  try {
    if (mode === 'seed') {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: SEED_ITERATION_CHAIN,
      });
    }

    if (mode === 'mock') {
      const data = generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5));
      return NextResponse.json<ApiResponse>({ success: true, data });
    }

    // live mode — 실제 그래프 데이터
    const stats = await getStats();

    if (stats.totalNodes === 0) {
      // 그래프가 비어있으면 mock fallback
      const data = generateMockGraph(maxNodes, Math.floor(maxNodes * 1.5));
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { ...data, _meta: { source: 'mock_fallback', reason: 'graph empty', stats } },
      });
    }

    const filterUserId = scope === 'my' && userId ? userId : undefined;
    const data = await getVisualizationData(maxNodes, filterUserId);
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { ...data, _meta: { source: stats.mode, scope, userId: filterUserId, stats } },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
