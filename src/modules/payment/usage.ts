/** 세션 사용량 추적 + 티어별 제한
 *
 * In-memory store (Vercel 배포 시 Upstash Redis로 교체 예정)
 * Free: 5회/월, Pro: 무제한, Enterprise: 무제한
 *
 * TODO: Upstash Redis로 교체 전까지 serverless 인스턴스 간 공유 안 됨 (pre-launch blocker)
 */

interface UserUsage {
  userId: string;
  tier: 'free' | 'pro' | 'enterprise';
  sessionsThisMonth: number;
  monthKey: string; // "2026-03"
  subscriptionId?: string;
  subscribedAt?: string;
}

// In-memory store — 프로덕션에서는 Redis/KV로 교체
const usageStore = new Map<string, UserUsage>();

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getOrCreate(userId: string): UserUsage {
  const existing = usageStore.get(userId);
  const month = currentMonthKey();

  if (existing) {
    // 월이 바뀌면 카운터 리셋
    if (existing.monthKey !== month) {
      existing.sessionsThisMonth = 0;
      existing.monthKey = month;
    }
    return existing;
  }

  const usage: UserUsage = {
    userId,
    tier: 'free',
    sessionsThisMonth: 0,
    monthKey: month,
  };
  usageStore.set(userId, usage);
  return usage;
}

/** 세션 실행 가능 여부 확인 */
export function canCreateSession(userId: string): { allowed: boolean; reason?: string; remaining?: number } {
  const usage = getOrCreate(userId);

  if (usage.tier === 'pro' || usage.tier === 'enterprise') {
    return { allowed: true };
  }

  // Free tier: 5회/월
  const limit = 5;
  if (usage.sessionsThisMonth >= limit) {
    return {
      allowed: false,
      reason: `Free tier limit reached (${limit} sessions/month). Upgrade to Pro for unlimited.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining: limit - usage.sessionsThisMonth };
}

/** 세션 사용량 증가 */
export function recordSessionUsage(userId: string): void {
  const usage = getOrCreate(userId);
  usage.sessionsThisMonth++;
}

/** 티어 업그레이드 (결제 웹훅에서 호출) */
export function upgradeTier(userId: string, tier: 'pro' | 'enterprise', subscriptionId: string): void {
  const usage = getOrCreate(userId);
  usage.tier = tier;
  usage.subscriptionId = subscriptionId;
  usage.subscribedAt = new Date().toISOString();
}

/** 티어 다운그레이드 (구독 취소 시) */
export function downgradeTier(userId: string): void {
  const usage = getOrCreate(userId);
  usage.tier = 'free';
  usage.subscriptionId = undefined;
}

/** 사용자 사용량 조회 */
export function getUserUsage(userId: string): UserUsage {
  return getOrCreate(userId);
}

/** MCP 티어별 도구 접근 제한 */
export function getMcpToolsForTier(tier: 'free' | 'pro' | 'enterprise'): string[] {
  switch (tier) {
    case 'free':
      return ['graph_search', 'brainstorm', 'evaluate_idea'];
    case 'pro':
      return [
        'graph_search', 'graph_query', 'graph_add_node', 'graph_add_edge',
        'web_search', 'brainstorm', 'scamper_transform', 'evaluate_idea',
        'extract_keywords', 'measure_novelty', 'triz_principle',
      ];
    case 'enterprise':
      return [
        'graph_search', 'graph_query', 'graph_add_node', 'graph_add_edge',
        'web_search', 'brainstorm', 'scamper_transform', 'evaluate_idea',
        'extract_keywords', 'measure_novelty', 'triz_principle',
      ];
  }
}
