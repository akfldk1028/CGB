/** API 인증 미들웨어
 *
 * 역할: Bearer token 존재 여부 + 형식 검증 (빠른 게이트)
 * 실제 키 검증(Redis/해시)은 각 route handler에서 수행 (Edge 제약 회피)
 *
 * Public:    /api/health, /api/webhooks/*, /api/mcp/*
 * Cron:      /api/cron/* → CRON_SECRET 검증 (미설정 시 차단)
 * Protected: /api/v1/*, /api/creative/*, /api/graph/* → Bearer token 필수
 */

import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PREFIXES = ['/api/health', '/api/webhooks/', '/api/mcp'];
const PROTECTED_PREFIXES = ['/api/v1/', '/api/creative/', '/api/graph/'];

function isPublic(p: string) { return PUBLIC_PREFIXES.some((x) => p.startsWith(x)); }
function isProtected(p: string) { return PROTECTED_PREFIXES.some((x) => p.startsWith(x)); }

/** Strip any externally-injected internal headers to prevent spoofing */
function stripInternalHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete('x-user-id');
  headers.delete('x-user-tier');
  headers.delete('x-api-key-raw');
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/')) return NextResponse.next();

  // Public → 통과
  if (isPublic(pathname)) return NextResponse.next();

  // Cron → CRON_SECRET (미설정 시 차단)
  if (pathname.startsWith('/api/cron/')) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing cron secret' } },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Protected → Bearer token 존재 확인
  if (isProtected(pathname)) {
    const headers = stripInternalHeaders(request);
    const masterKey = process.env.CREATIVEGRAPH_API_KEY;

    // 키 미설정 = open mode (개발 환경) → free 티어로 제한
    if (!masterKey) {
      headers.set('x-user-id', 'anonymous');
      headers.set('x-user-tier', 'free');
      return NextResponse.next({ request: { headers } });
    }

    // Bearer token 추출
    const auth = request.headers.get('authorization');
    const apiKey = auth?.startsWith('Bearer ') ? auth.slice(7) : request.nextUrl.searchParams.get('key');

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'API key required. Use Authorization: Bearer <key>' },
      }, { status: 401 });
    }

    // 마스터 키 = 즉시 통과 (관리자)
    if (apiKey === masterKey) {
      headers.set('x-user-id', 'admin');
      headers.set('x-user-tier', 'team');
      return NextResponse.next({ request: { headers } });
    }

    // cg_live_ 형식 검증 (실제 Redis 검증은 route handler에서)
    if (!apiKey.startsWith('cg_live_') || apiKey.length < 40) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_KEY_FORMAT', message: 'Invalid API key format' },
      }, { status: 401 });
    }

    // 형식 OK → route handler로 전달 (거기서 Redis 검증)
    headers.set('x-api-key-raw', apiKey);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
