import { NextResponse } from 'next/server';
import { listEdges, addEdge } from '@/modules/graph/service';
import type { ApiResponse } from '@/types/api';

/** GET /api/graph/edges — 엣지 목록 조회 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '200', 10) || 200, 1), 500);

    const edges = await listEdges({ nodeId, type, limit });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { edges, total: edges.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/graph/edges — 엣지 생성 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, targetId, type } = body;

    if (!sourceId || !targetId || !type) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'sourceId, targetId, and type are required' },
        { status: 400 }
      );
    }

    const edge = await addEdge({ sourceId, targetId, type });

    return NextResponse.json<ApiResponse>({ success: true, data: edge }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
