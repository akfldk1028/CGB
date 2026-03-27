/** Csikszentmihalyi's Systems Model — Individual × Domain × Field 검증
 *
 * 학술 근거: Csikszentmihalyi, M. (1996). Creativity: Flow and the Psychology of Discovery.
 * 수업자료 슬라이드 5:
 *   - Individual: 개인의 재능, 기술, 지식
 *   - Domain: 특정 분야의 규칙, 상징, 관습
 *   - Field: 문지기들 — 아이디어가 창의적인지 판단하는 전문가/동료
 *
 * Key Idea: "창의성은 개인만의 것이 아님. 사회, 문화, 환경과의 상호작용에서 나옴."
 */

/** 시스템 모델의 3자 검증 결과 */
export interface SystemsValidation {
  individual: { score: number; notes: string };
  domain: { score: number; notes: string };
  field: { score: number; notes: string };
  approved: boolean;
}

/**
 * Individual 점수 계산 — 아이디어의 내적 품질 평가
 *
 * Csikszentmihalyi의 "Individual"은 개인의 재능/기술/지식.
 * AI 에이전트 맥락에서는 "아이디어 자체의 품질"로 재해석:
 * - 구체성: 모호하지 않고 실행 가능한 수준으로 구체적인가?
 * - 논리성: 내부적으로 일관성 있는가?
 * - 완성도: 충분히 발전된 아이디어인가?
 */
export function estimateIndividualScore(idea: {
  title: string;
  description: string;
  scores?: { overall?: number };
}): number {
  let score = 30;

  // 제목 구체성 (너무 짧으면 모호)
  if (idea.title.length >= 5 && idea.title.length <= 50) score += 15;
  else if (idea.title.length > 50) score += 5;

  // 설명 충실도 (구체성 프록시)
  if (idea.description.length >= 50) score += 20;
  else if (idea.description.length >= 20) score += 10;

  // 기존 평가 점수 반영 (다른 이론의 평가 결과가 있으면)
  if (idea.scores?.overall) {
    score += Math.round(idea.scores.overall * 0.35);
  }

  return Math.min(100, score);
}

/**
 * 시스템 모델 3자 검증
 *
 * Csikszentmihalyi: "창의성은 3자의 교차점에서만 발생"
 * 3자 모두 최소 threshold를 넘어야 approved.
 */
export function validateSystemsModel(
  individualScore: number,
  domainNodeCount: number,
  fieldValidationScore: number
): SystemsValidation {
  const domainScore = Math.min(100, domainNodeCount * 10);
  const approved = individualScore >= 40 && domainScore >= 20 && fieldValidationScore >= 50;

  return {
    individual: {
      score: individualScore,
      notes: individualScore >= 60
        ? 'Idea is well-formed, specific, and internally consistent'
        : individualScore >= 40
        ? 'Idea has potential but needs more development'
        : 'Idea is too vague or underdeveloped — needs refinement',
    },
    domain: {
      score: domainScore,
      notes: domainNodeCount > 5
        ? `Rich domain context: ${domainNodeCount} related nodes in knowledge graph`
        : domainNodeCount > 0
        ? `Limited domain context: ${domainNodeCount} nodes — deeper immersion recommended`
        : 'No domain knowledge found — immersion phase critical before proceeding',
    },
    field: {
      score: fieldValidationScore,
      notes: fieldValidationScore >= 70
        ? 'Strong field validation — market viable and original'
        : fieldValidationScore >= 50
        ? 'Field validation passed with reservations'
        : 'Field rejection — idea may be derivative, impractical, or poorly timed',
    },
    approved,
  };
}
