import { NextResponse } from 'next/server';
import { searchGraph, getNeighborhood } from '@/modules/graph/service';
import type { ApiResponse } from '@/types/api';

/** GET /api/graph/search — 키워드 검색 + 이웃 탐색 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const type = searchParams.get('type') ?? undefined;
    const nodeId = searchParams.get('nodeId');
    const hops = Math.min(Math.max(parseInt(searchParams.get('hops') ?? '2', 10) || 2, 1), 5);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), 200);

    // 특정 노드의 이웃 탐색
    if (nodeId) {
      const result = await getNeighborhood(nodeId, hops, limit);
      return NextResponse.json<ApiResponse>({ success: true, data: result });
    }

    // 키워드 검색
    if (!q) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'q (query) or nodeId parameter required' },
        { status: 400 }
      );
    }

    const results = await searchGraph(q, { type, limit });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { query: q, results, total: results.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
