/** 창의성 엔진 기본 파라미터 */

import type { ScamperType } from '@/types/creativity';

/** SCAMPER 7기법 설명 */
export const SCAMPER_DESCRIPTIONS: Record<ScamperType, { name: string; question: string; description: string }> = {
  substitute:       { name: 'Substitute',        question: 'What can be replaced?',                    description: '구성요소, 재료, 사람, 프로세스를 대체' },
  combine:          { name: 'Combine',            question: 'What can be merged or blended?',           description: '두 개 이상의 요소를 결합하여 새로운 것 창조' },
  adapt:            { name: 'Adapt',              question: 'What can be adapted for a new context?',   description: '다른 맥락이나 용도에 맞게 변형' },
  modify:           { name: 'Modify / Magnify',   question: 'What can be enlarged or emphasized?',      description: '크기, 형태, 속성을 확대/축소/변형' },
  put_to_other_use: { name: 'Put to other use',   question: 'How else can this be used?',               description: '완전히 다른 용도로 전용' },
  eliminate:        { name: 'Eliminate',           question: 'What can be removed or simplified?',       description: '불필요한 요소 제거로 단순화' },
  rearrange:        { name: 'Rearrange / Reverse', question: 'What if we reversed the order?',          description: '순서, 패턴, 레이아웃을 재배치/역전' },
};

/** 4I's 단계 설명 */
export const FOUR_IS_DESCRIPTIONS = {
  immersion:   { name: 'Immersion',   icon: '🔍', description: '도메인에 깊이 몰입, 관련 지식 수집, 기존 아이디어 탐색' },
  inspiration: { name: 'Inspiration', icon: '💡', description: '발산적 사고로 대량 아이디어 생성, 양이 질을 이김' },
  isolation:   { name: 'Isolation',   icon: '🧘', description: '독립적 평가, 편향 없이 각 아이디어 검증' },
  iteration:   { name: 'Iteration',   icon: '🔄', description: '과거 아이디어 기반 변주, 진화, 새로운 조합' },
} as const;

/** 기본 파라미터 */
export const DEFAULTS = {
  /** 발산 단계에서 생성할 아이디어 수 */
  divergentCount: 10,
  /** 수렴 단계에서 선별할 상위 수 */
  convergentTopK: 3,
  /** Amabile 3요소 가중치 */
  amabileWeights: { domainRelevance: 0.3, creativeThinking: 0.5, motivation: 0.2 },
  /** 반복 횟수 (iteration phase) */
  iterationRounds: 2,
} as const;
