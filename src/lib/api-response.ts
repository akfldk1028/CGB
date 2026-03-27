/** API 응답 표준화 — v1 라우트에서 사용 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import type { Tier } from './api-keys';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta: {
    requestId: string;
    tier?: string;
    usage?: { remaining: number; limit: number };
  };
}

export function ok<T>(data: T, opts?: { tier?: Tier; remaining?: number; limit?: number }): NextResponse {
  const envelope: ApiEnvelope<T> = {
    success: true,
    data,
    meta: {
      requestId: crypto.randomUUID(),
      tier: opts?.tier,
      usage: opts?.remaining !== undefined ? { remaining: opts.remaining, limit: opts.limit ?? 0 } : undefined,
    },
  };
  return NextResponse.json(envelope);
}

export function created<T>(data: T, opts?: { tier?: Tier }): NextResponse {
  const envelope: ApiEnvelope<T> = {
    success: true,
    data,
    meta: { requestId: crypto.randomUUID(), tier: opts?.tier },
  };
  return NextResponse.json(envelope, { status: 201 });
}

export function fail(code: string, message: string, status: number = 400): NextResponse {
  const envelope: ApiEnvelope = {
    success: false,
    error: { code, message },
    meta: { requestId: crypto.randomUUID() },
  };
  return NextResponse.json(envelope, { status });
}
