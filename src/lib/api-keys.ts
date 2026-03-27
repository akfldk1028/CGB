/** API Key Management — 생성, 해시 저장, 검증, 폐기
 *
 * 보안 원칙:
 * - 원본 키는 저장하지 않음 (SHA-256 해시만)
 * - 유저에게 키 원본은 생성 시 1회만 노출
 * - prefix "cg_live_"로 식별 가능
 *
 * 참고: https://www.freecodecamp.org/news/best-practices-for-building-api-keys-97c26eabfea9/
 */

import crypto from 'crypto';
import { kv, PREFIX } from './redis';

export type Tier = 'free' | 'pro' | 'enterprise' | 'team';

export interface KeyMeta {
  userId: string;
  tier: Tier;
  createdAt: string;
  lastUsedAt: string;
}

export interface UserMeta {
  tier: Tier;
  keyHash: string;
  subscriptionId?: string;
  email?: string;
  createdAt: string;
}

const KEY_PREFIX = 'cg_live_';

/** API 키 생성 — prefix + 32바이트 base64url */
export function generateApiKey(): { raw: string; hash: string } {
  const bytes = crypto.randomBytes(32);
  const raw = KEY_PREFIX + bytes.toString('base64url');
  const hash = hashKey(raw);
  return { raw, hash };
}

/** 키 → SHA-256 해시 */
export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/** 키가 우리 형식인지 확인 */
export function isValidKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length >= 40;
}

/** 키 저장 (해시만 Redis에) */
export async function storeApiKey(
  hash: string,
  userId: string,
  tier: Tier,
  subscriptionId?: string,
  email?: string
): Promise<void> {
  const now = new Date().toISOString();

  // 키 메타데이터
  await kv.set(`${PREFIX.KEY}${hash}`, {
    userId,
    tier,
    createdAt: now,
    lastUsedAt: now,
  } satisfies KeyMeta);

  // 유저 메타데이터
  await kv.set(`${PREFIX.USER}${userId}`, {
    tier,
    keyHash: hash,
    subscriptionId,
    email,
    createdAt: now,
  } satisfies UserMeta);
}

/** Bearer token 검증 → userId + tier 반환 */
export async function validateApiKey(rawKey: string): Promise<KeyMeta | null> {
  if (!isValidKeyFormat(rawKey)) return null;

  const hash = hashKey(rawKey);
  const meta = await kv.get<KeyMeta>(`${PREFIX.KEY}${hash}`);
  if (!meta) return null;

  // lastUsedAt 업데이트 (fire-and-forget)
  kv.set(`${PREFIX.KEY}${hash}`, { ...meta, lastUsedAt: new Date().toISOString() }).catch(() => {});

  return meta;
}

/** 키 폐기 */
export async function revokeApiKey(hash: string): Promise<boolean> {
  const meta = await kv.get<KeyMeta>(`${PREFIX.KEY}${hash}`);
  if (!meta) return false;

  await kv.del(`${PREFIX.KEY}${hash}`);
  return true;
}

/** 유저 정보 조회 */
export async function getUserMeta(userId: string): Promise<UserMeta | null> {
  return kv.get<UserMeta>(`${PREFIX.USER}${userId}`);
}

/** 키 교체 — 기존 폐기 + 새 키 생성 */
export async function rotateApiKey(
  userId: string
): Promise<{ raw: string; hash: string } | null> {
  const user = await getUserMeta(userId);
  if (!user) return null;

  // 기존 키 폐기
  if (user.keyHash) {
    await revokeApiKey(user.keyHash);
  }

  // 새 키 생성 + 저장
  const { raw, hash } = generateApiKey();
  await storeApiKey(hash, userId, user.tier, user.subscriptionId, user.email);

  return { raw, hash };
}
