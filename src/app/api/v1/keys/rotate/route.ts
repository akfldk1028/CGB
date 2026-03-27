/** POST /api/v1/keys/rotate — 키 교체 (기존 폐기 + 새 키) */

import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { rotateApiKey } from '@/lib/api-keys';

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: auth.error } },
      { status: 401 }
    );
  }

  const result = await rotateApiKey(auth.userId);
  if (!result) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'No existing key to rotate' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      apiKey: result.raw,
      userId: auth.userId,
      note: 'Previous key has been revoked. Save this new key securely.',
    },
  });
}
