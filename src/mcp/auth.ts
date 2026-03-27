/** MCP 인증 — lib/api-auth 및 lib/api-keys에서 re-export
 *
 * MCP 라우트 호환성을 위해 authenticateApiKey도 제공.
 */
export { authenticateRequest, extractApiKey, unauthorizedResponse, type AuthResult, type Tier } from '@/lib/api-auth';
export { validateApiKey } from '@/lib/api-keys';

// MCP 라우트 호환 — 동기식 마스터 키 체크 (legacy)
import type { Tier } from '@/lib/api-keys';

interface LegacyAuthResult {
  authenticated: boolean;
  userId?: string;
  tier: Tier;
  error?: string;
}

export function authenticateApiKey(apiKey: string | null): LegacyAuthResult {
  if (!process.env.CREATIVEGRAPH_API_KEY) {
    return { authenticated: true, userId: 'anonymous', tier: 'free' };
  }
  if (!apiKey) {
    return { authenticated: false, tier: 'free', error: 'API key required' };
  }
  if (apiKey === process.env.CREATIVEGRAPH_API_KEY) {
    return { authenticated: true, userId: 'admin', tier: 'team' };
  }
  return { authenticated: false, tier: 'free', error: 'Invalid API key' };
}
