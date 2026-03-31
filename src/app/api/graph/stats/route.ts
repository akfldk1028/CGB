import { NextResponse } from 'next/server';
import { getStats } from '@/modules/graph/service';
import { ensureConnection } from '@/modules/graph/driver';
import { storeManager } from '@/modules/graph/store';
import type { ApiResponse } from '@/types/api';

const USE_MEMGRAPH = !!(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

/** GET /api/graph/stats — 그래프 전체 통계 + 연결 상태 */
export async function GET() {
  try {
    const stats = await getStats();
    const mode = storeManager.getMode();

    let connection: { connected: boolean; mode?: string; error?: string } = { connected: false, error: 'Not configured' };
    if (mode === 'supabase') {
      connection = { connected: true, mode: 'supabase' };
    } else if (USE_MEMGRAPH) {
      connection = await ensureConnection();
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...stats,
        connection: mode === 'supabase'
          ? connection
          : USE_MEMGRAPH
            ? connection
            : { connected: false, mode: 'in_memory' },
        config: {
          storeMode: mode,
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
