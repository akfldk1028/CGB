/** Cron 반추(Reflection) — Graph 정리 + 프루닝
 *
 * 매일 1회 실행 — Supabase RPC 기반
 * 1. 고아 노드 expire (엣지 없고 7일 이상)
 * 2. 중복 노드 expire (같은 에이전트, cosine > 0.95)
 */

import { NextResponse } from 'next/server';
import { supabaseRpc } from '@/lib/supabase';
import { storeManager } from '@/modules/graph/store';

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    orphansExpired: 0,
    duplicatesExpired: 0,
    mode: storeManager.getMode(),
  };

  try {
    // 1. Expire orphan nodes (no edges, > 7 days old)
    const orphanResult = await supabaseRpc<number>('graph_expire_orphans', {
      min_age: '7 days',
    });
    results.orphansExpired = orphanResult ?? 0;

    // 2. Expire duplicate nodes (same agent, cosine > 0.95)
    const dupResult = await supabaseRpc<number>('graph_expire_duplicates', {
      threshold: 0.95,
    });
    results.duplicatesExpired = dupResult ?? 0;

    console.log(`[cron/reflect] orphans=${results.orphansExpired}, duplicates=${results.duplicatesExpired}`);
  } catch (err) {
    console.error('[cron/reflect] error:', (err as Error).message);
    return NextResponse.json({ ...results, error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json(results);
}
