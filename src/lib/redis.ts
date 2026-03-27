/** Upstash Redis 클라이언트 싱글턴 — dual mode
 *
 * Redis 설정됨 → Upstash Redis (프로덕션)
 * Redis 미설정 → in-memory Map (로컬 개발)
 *
 * BizScope와 동일 인스턴스 공유, prefix로 분리:
 * - BizScope: bsai:*
 * - CreativeGraph: cgai:*
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

/** Redis 연결 여부 (환경변수 설정됨?) */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required');
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

// ── In-memory fallback (로컬 개발용) ──

const memStore = new Map<string, string>();

export const kv = {
  async get<T = unknown>(key: string): Promise<T | null> {
    if (isRedisConfigured()) {
      return getRedis().get<T>(key);
    }
    const val = memStore.get(key);
    return val ? (JSON.parse(val) as T) : null;
  },

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    if (isRedisConfigured()) {
      if (opts?.ex) {
        await getRedis().set(key, JSON.stringify(value), { ex: opts.ex });
      } else {
        await getRedis().set(key, JSON.stringify(value));
      }
      return;
    }
    memStore.set(key, JSON.stringify(value));
    if (opts?.ex) {
      setTimeout(() => memStore.delete(key), opts.ex * 1000);
    }
  },

  async del(key: string): Promise<void> {
    if (isRedisConfigured()) {
      await getRedis().del(key);
      return;
    }
    memStore.delete(key);
  },

  async incr(key: string): Promise<number> {
    if (isRedisConfigured()) {
      return getRedis().incr(key);
    }
    const val = parseInt(memStore.get(key) ?? '0', 10) + 1;
    memStore.set(key, String(val));
    return val;
  },

  async expire(key: string, seconds: number): Promise<void> {
    if (isRedisConfigured()) {
      await getRedis().expire(key, seconds);
      return;
    }
    setTimeout(() => memStore.delete(key), seconds * 1000);
  },
};

// ── Key Prefixes ──

export const PREFIX = {
  KEY: 'cgai:key:',       // cgai:key:{hash} → 키 메타데이터
  USER: 'cgai:user:',     // cgai:user:{userId} → 유저 정보
  USAGE: 'cgai:usage:',   // cgai:usage:{userId}:{month} → 월별 사용량
  RATE: 'cgai:rate:',     // cgai:rate:{userId}:{minute} → rate limit 카운터
} as const;
