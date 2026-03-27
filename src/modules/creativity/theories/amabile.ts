/** Amabile's Componential Theory — 3요소 평가 체계 */

import type { IdeaScores } from '@/types/creativity';
import { DEFAULTS } from '@/config/creativity';

/** 3요소 가중 평균 계산 */
export function calculateOverallScore(scores: Omit<IdeaScores, 'overall'>): IdeaScores {
  const w = DEFAULTS.amabileWeights;
  const overall = Math.round(
    scores.domainRelevance * w.domainRelevance +
    scores.creativeThinking * w.creativeThinking +
    scores.motivation * w.motivation
  );
  return { ...scores, overall };
}

/** 도메인 적합성 추정 (Graph DB 관련 노드 수 기반) */
export function estimateDomainRelevance(relatedNodeCount: number, maxExpected = 20): number {
  return Math.min(100, Math.round((relatedNodeCount / maxExpected) * 100));
}

/** 창의적 사고 추정 (기존 아이디어와의 거리) */
export function estimateCreativeThinking(similarityToExisting: number): number {
  // similarityToExisting 0~1, 높을수록 기존과 비슷 → 창의성 낮음
  return Math.round((1 - similarityToExisting) * 100);
}

/** Amabile 이론 요약: 내재적 동기가 핵심 */
export const AMABILE_INSIGHT = {
  key: 'Intrinsic motivation enhances creativity more than extrinsic rewards',
  implication: 'Score motivation based on genuine interest and feasibility, not just market size',
} as const;
