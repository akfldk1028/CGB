/** API Key Management Endpoints
 *
 * POST /api/v1/keys — 새 키 생성 (team tier만 가능, 또는 자기 키 생성)
 * GET  /api/v1/keys — 내 키 정보 조회
 */

import { NextResponse } from 'next/server';
import { authenticateRequest, tierAtLeast } from '@/lib/api-auth';
import { generateApiKey, storeApiKey, getUserMeta } from '@/lib/api-keys';

/** POST — 키 생성 */
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try { body = await request.json(); } catch { /* empty body OK for self-key */ }

  const targetUserId = body.userId ?? auth.userId;
  const targetTier = body.tier ?? 'pro';

  // 다른 유저용 키 생성은 team만 가능
  if (targetUserId !== auth.userId && !tierAtLeast(auth.tier, 'team')) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only team tier can create keys for other users' } },
      { status: 403 }
    );
  }

  // 이미 키가 있으면 에러
  const existing = await getUserMeta(targetUserId);
  if (existing?.keyHash) {
    return NextResponse.json(
      { success: false, error: { code: 'KEY_EXISTS', message: 'User already has an API key. Use /api/v1/keys/rotate to replace.' } },
      { status: 409 }
    );
  }

  const { raw, hash } = generateApiKey();
  await storeApiKey(hash, targetUserId, targetTier, undefined, body.email);

  return NextResponse.json({
    success: true,
    data: {
      apiKey: raw,
      userId: targetUserId,
      tier: targetTier,
      note: 'Save this key securely. It will not be shown again.',
    },
  }, { status: 201 });
}

/** GET — 내 키 정보 조회 (원본은 노출하지 않음) */
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }

  const user = await getUserMeta(auth.userId);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No API key found for this user' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId: auth.userId,
      tier: user.tier,
      keyPrefix: `cg_live_...${user.keyHash.slice(-8)}`,
      subscriptionId: user.subscriptionId,
      createdAt: user.createdAt,
    },
  });
}
