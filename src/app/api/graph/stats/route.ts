import { NextResponse } from 'next/server';
import { getStats } from '@/modules/graph/service';
import { ensureConnection } from '@/modules/graph/driver';
import type { ApiResponse } from '@/types/api';

const USE_MEMGRAPH = !!(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

/** GET /api/graph/stats — 그래프 전체 통계 + 연결 상태 */
export async function GET() {
  try {
    const stats = await getStats();

    let connection: { connected: boolean; error?: string } = { connected: false, error: 'Not configured' };
    if (USE_MEMGRAPH) {
      connection = await ensureConnection();
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...stats,
        connection: USE_MEMGRAPH ? connection : { connected: false, mode: 'in_memory' },
        config: {
          memgraphConfigured: USE_MEMGRAPH,
          uri: USE_MEMGRAPH ? process.env.NEO4J_URI?.replace(/\/\/.*@/, '//***@') : null,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
