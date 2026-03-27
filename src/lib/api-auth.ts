/** 공통 API 인증 — route handler에서 사용
 *
 * 흐름:
 * 1. middleware가 형식 검증 → x-api-key-raw 또는 x-user-id/x-user-tier 헤더 주입
 * 2. route handler에서 authenticateRequest() 호출 → Redis 키 검증
 */

import { NextResponse } from 'next/server';
import { validateApiKey, type Tier } from './api-keys';

export type { Tier } from './api-keys';

export interface AuthResult {
  authenticated: boolean;
  userId: string;
  tier: Tier;
  error?: string;
}

/** route handler에서 호출 — middleware가 주입한 헤더 기반 인증 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  // Case 1: middleware가 이미 검증 완료 (마스터 키 또는 open mode)
  const userId = request.headers.get('x-user-id');
  const userTier = request.headers.get('x-user-tier') as Tier | null;
  if (userId && userTier) {
    return { authenticated: true, userId, tier: userTier };
  }

  // Case 2: middleware가 raw key를 전달 → Redis 검증
  const rawKey = request.headers.get('x-api-key-raw');
  if (rawKey) {
    const meta = await validateApiKey(rawKey);
    if (meta) {
      return { authenticated: true, userId: meta.userId, tier: meta.tier };
    }
    return { authenticated: false, userId: '', tier: 'free', error: 'Invalid API key' };
  }

  // Case 3: 인증 정보 없음
  return { authenticated: false, userId: '', tier: 'free', error: 'Not authenticated' };
}

/** 인증 실패 시 표준 에러 응답 */
export function unauthorizedResponse(error: string) {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: error } },
    { status: 401 }
  );
}

/** tier 부족 시 표준 에러 응답 */
export function forbiddenResponse(requiredTier: Tier) {
  return NextResponse.json(
    { success: false, error: { code: 'TIER_REQUIRED', message: `This endpoint requires ${requiredTier} tier or above` } },
    { status: 403 }
  );
}

/** tier 계층 비교 */
export function tierAtLeast(userTier: Tier, requiredTier: Tier): boolean {
  const levels: Record<Tier, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };
  return levels[userTier] >= levels[requiredTier];
}

/** Bearer token 추출 (middleware 없이 직접 사용할 때) */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const url = new URL(request.url);
  return url.searchParams.get('key');
}
