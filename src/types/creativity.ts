/** 창의성 이론 엔진 타입 정의 */

/** SCAMPER 7가지 기법 */
export type ScamperType =
  | 'substitute'
  | 'combine'
  | 'adapt'
  | 'modify'
  | 'put_to_other_use'
  | 'eliminate'
  | 'rearrange';

/** 창의성 이론 */
export type TheoryName =
  | 'guilford_si'
  | 'amabile_componential'
  | 'csikszentmihalyi_systems'
  | 'geneplore'
  | 'scamper'
  | 'four_is';

/** 4I's 단계 */
export type FourIsPhase = 'immersion' | 'inspiration' | 'isolation' | 'iteration';

/** 브레인스토밍 방식 */
export type BrainstormMethod = 'nominal_group' | 'direct' | 'role_storming' | 'mind_mapping';

/** 아이디어 (Graph DB의 Idea 노드와 매핑) */
export interface Idea {
  id: string;
  title: string;
  description: string;
  /** 생성에 사용된 이론/기법 */
  theory: TheoryName;
  method?: string;
  /** SCAMPER 적용 시 원본 아이디어 ID */
  parentId?: string;
  /** 평가 점수 (Amabile 3요소 기준) */
  scores?: IdeaScores;
  tags?: string[];
  createdAt: string;
}

/** Amabile 3요소 기반 점수 */
export interface IdeaScores {
  /** 도메인 적합성 (0-100) */
  domainRelevance: number;
  /** 창의적 사고 (0-100) */
  creativeThinking: number;
  /** 실현 동기/가능성 (0-100) */
  motivation: number;
  /** 종합 (가중 평균) */
  overall: number;
}

/** Guilford 발산/수렴 결과 */
export interface DivergentResult {
  ideas: Idea[];
  totalGenerated: number;
  method: BrainstormMethod;
}

export interface ConvergentResult {
  ranked: Idea[];
  criteria: string[];
  eliminated: string[];
}

/** Geneplore 2단계 결과 */
export interface GeneploreResult {
  generativePhase: Idea[];
  exploratoryPhase: Idea[];
  refined: Idea[];
}
