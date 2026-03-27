/** Rate Limiting — sliding window counter
 *
 * Redis 있으면 Redis, 없으면 in-memory.
 * 프로덕션: Upstash @upstash/ratelimit로 교체 가능.
 */

import { kv, PREFIX } from './redis';
import type { Tier } from './api-keys';

const LIMITS: Record<Tier, { windowSec: number; max: number }> = {
  free: { windowSec: 60, max: 10 },
  pro: { windowSec: 60, max: 60 },
  enterprise: { windowSec: 60, max: 200 },
  team: { windowSec: 60, max: 200 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSec?: number;
}

export async function checkRateLimit(userId: string, tier: Tier): Promise<RateLimitResult> {
  const config = LIMITS[tier] ?? LIMITS.free;
  const minute = Math.floor(Date.now() / (config.windowSec * 1000));
  const key = `${PREFIX.RATE}${userId}:${minute}`;

  const count = await kv.incr(key);

  // 첫 번째 요청이면 TTL 설정
  if (count === 1) {
    await kv.expire(key, config.windowSec + 5); // 여유 5초
  }

  if (count > config.max) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.max,
      retryAfterSec: config.windowSec,
    };
  }

  return {
    allowed: true,
    remaining: config.max - count,
    limit: config.max,
  };
}
