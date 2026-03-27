import { NextResponse } from 'next/server';
import { listNodes, addNode, getNode, getStats } from '@/modules/graph/service';
import type { ApiResponse } from '@/types/api';

/** GET /api/graph/nodes — 노드 목록 조회 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? undefined;
    const id = searchParams.get('id');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1), 500);

    // 특정 노드 조회
    if (id) {
      const node = await getNode(id);
      if (!node) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: `Node not found: ${id}` },
          { status: 404 }
        );
      }
      return NextResponse.json<ApiResponse>({ success: true, data: node });
    }

    const nodes = await listNodes({ type, limit });
    const stats = await getStats();

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { nodes, total: nodes.length, stats },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/graph/nodes — 노드 생성 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, ...params } = body;

    if (!type || !params.title) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'type and title are required' },
        { status: 400 }
      );
    }

    const nodeType = type === 'Concept' ? 'Concept' : type === 'Session' ? 'Session' : 'Idea';
    const node = await addNode(nodeType, params);

    return NextResponse.json<ApiResponse>({ success: true, data: node }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
