/** Graph DB 온톨로지 스키마 — 학술 근거 기반 계층적 설계
 *
 * 설계 근거:
 * 1. Barrios et al. (2020) — 아이디어 온톨로지: attributes, relations, contexts
 * 2. Csikszentmihalyi (1996) — Individual × Domain × Field 3계층
 * 3. Geneplore (Finke 1992) — Pre-inventive structures → refined ideas
 * 4. Rhodes (1961) — 4P's: Person, Process, Product, Press
 *
 * 핵심 원칙:
 * - 노드는 계층적: Domain > Topic > Idea > Artifact
 * - 엣지는 3계층: 생성관계(어떻게 만들어졌나) + 의미관계(어떤 관계인가) + 메타관계(구조)
 * - 모든 노드에 provenance(출처): 누가, 언제, 어떤 이론으로 만들었나
 * - 시간이 갈수록 그래프가 깊어짐 (breadth + depth)
 */

// ═══════════════════════════════════════════
// NODE TYPES — 4계층 온톨로지
// ═══════════════════════════════════════════

/** Level 0: Domain — Csikszentmihalyi의 "Domain" (규칙, 관습, 지식체계)
 *  예: "Healthcare", "Fintech", "Education"
 *  가장 상위. 모든 아이디어는 어떤 도메인에 속함. */
export interface DomainNode {
  id: string;
  type: 'Domain';
  name: string;
  description: string;
  /** 상위 도메인 (예: "Digital Health" → "Healthcare") */
  parentDomainId?: string;
  keywords: string[];
  createdAt: string;
}

/** Level 1: Topic — 도메인 안의 구체적 주제/문제
 *  예: "AI 개인 금융 비서", "원격 환자 모니터링"
 *  하나의 창의 세션은 하나의 Topic에 대해 진행. */
export interface TopicNode {
  id: string;
  type: 'Topic';
  title: string;
  description: string;
  domainId: string;
  /** 문제 정의 (Csikszentmihalyi: "what problem does this address?") */
  problemStatement?: string;
  /** 대상 사용자/시장 */
  targetAudience?: string;
  sessionId: string;
  createdAt: string;
}

/** Level 2: Idea — 핵심 단위. Geneplore의 "pre-inventive structure"
 *  생성 → 평가 → 변주의 대상.
 *  Barrios(2020)의 온톨로지: idea has attributes, context, evaluation. */
export interface IdeaNode {
  id: string;
  type: 'Idea';
  title: string;
  description: string;
  topicId: string;

  // ── Provenance (출처 추적) ──
  /** 어떤 이론/기법으로 생성? */
  generationMethod: GenerationMethod;
  /** 어떤 에이전트가 생성? */
  authorAgent: string;
  /** 원본 아이디어 (SCAMPER/Iteration의 경우) */
  parentIdeaId?: string;
  /** Geneplore 단계 */
  maturityStage: 'raw' | 'explored' | 'refined' | 'validated';

  // ── Amabile 3요소 평가 ──
  scores?: {
    domainRelevance: number;
    creativeThinking: number;
    intrinsicMotivation: number;
    overall: number;
  };

  // ── Csikszentmihalyi 3자 검증 ──
  validation?: {
    individual: number;   // 아이디어 내적 품질
    domain: number;       // 도메인 적합성
    field: number;        // 시장/전문가 검증
    approved: boolean;
  };

  // ── 메타데이터 ──
  tags: string[];
  /** 4I's 어느 단계에서 생성? */
  phase: 'immersion' | 'inspiration' | 'isolation' | 'iteration';
  createdAt: string;
  updatedAt: string;
}

/** Level 3: Artifact — 아이디어에서 파생된 구체적 산출물
 *  논문, 프로토타입, 비즈니스 모델, 코드 등.
 *  Rhodes(1961) 4P's의 "Product". */
export interface ArtifactNode {
  id: string;
  type: 'Artifact';
  title: string;
  description: string;
  ideaId: string;
  artifactType: 'narrative' | 'prototype' | 'business_model' | 'paper' | 'code' | 'design';
  /** Hero's Journey / 3-Act 구조로 포장된 내러티브 */
  narrative?: {
    structure: 'hero_journey' | 'three_act';
    content: Record<string, string>;
  };
  createdAt: string;
}

/** 보조 노드: Concept — 재사용 가능한 핵심 개념
 *  여러 아이디어에서 공유되는 개념 (예: "Transfer Learning", "Attention Mechanism")
 *  Csikszentmihalyi의 Domain "symbols and conventions"에 해당. */
export interface ConceptNode {
  id: string;
  type: 'Concept';
  name: string;
  description: string;
  /** 어떤 도메인에 속하는 개념? (복수 가능) */
  domainIds: string[];
  /** 학술 출처 */
  references?: string[];
  createdAt: string;
}

/** 보조 노드: Session — 창의 세션 기록 */
export interface SessionNode {
  id: string;
  type: 'Session';
  topicId: string;
  status: 'active' | 'completed' | 'failed';
  /** 참여한 에이전트 역할 */
  agents: string[];
  /** 4I's 단계별 진행 기록 */
  phases: {
    immersion?: { startedAt: string; completedAt?: string };
    inspiration?: { startedAt: string; completedAt?: string; ideaCount: number };
    isolation?: { startedAt: string; completedAt?: string; evaluatedCount: number };
    iteration?: { startedAt: string; completedAt?: string; iteratedCount: number };
  };
  createdAt: string;
  completedAt?: string;
}

/** 보조 노드: Agent — 에이전트 자체도 노드 (누가 뭘 했는지 추적)
 *  Rhodes(1961) 4P's의 "Person". AI 에이전트 맥락에서 재해석. */
export interface AgentNode {
  id: string;
  type: 'Agent';
  role: string;
  name: string;
  /** 이 에이전트가 기반하는 이론 */
  theory: string;
  /** 생성한 아이디어 수 */
  totalIdeasGenerated: number;
  /** 사용한 도구 기록 */
  toolsUsed: string[];
  createdAt: string;
}

// ═══════════════════════════════════════════
// GENERATION METHOD — 어떻게 만들어졌는가
// ═══════════════════════════════════════════

export type GenerationMethod =
  // Guilford
  | 'divergent_brainstorm'
  | 'convergent_selection'
  // SCAMPER
  | 'scamper_substitute'
  | 'scamper_combine'
  | 'scamper_adapt'
  | 'scamper_modify'
  | 'scamper_put_to_other_use'
  | 'scamper_eliminate'
  | 'scamper_rearrange'
  // Other techniques
  | 'role_storming'
  | 'mind_mapping'
  | 'iteration_semantic'       // 의미적 변주 (universal themes)
  | 'iteration_structural'     // 구조적 변주 (SCAMPER 기반)
  // External
  | 'web_research'             // 웹 검색에서 발견
  | 'graph_traversal'          // 그래프 탐색에서 발견
  | 'human_input'              // 사용자 직접 입력
  | 'agent_autonomous'         // 에이전트 자율 생성
  | 'visual_inspiration'       // 이미지에서 영감 (VLM 분석)
  | 'scene_graph_extract';     // 이미지 Scene Graph 추출

// ═══════════════════════════════════════════
// EDGE TYPES — 3계층 관계
// ═══════════════════════════════════════════

/** 생성 관계 — 어떻게 만들어졌나 (Provenance) */
export type CreationEdge =
  | 'INSPIRED_BY'        // ~에서 영감
  | 'ITERATED_FROM'      // ~의 변주 (4I's Iteration)
  | 'COMBINED_FROM'      // 두 아이디어 결합 (SCAMPER Combine)
  | 'SCAMPER_OF'         // SCAMPER 기법 적용 결과
  | 'DERIVED_FROM'       // 일반적 파생
  | 'GENERATED_BY'       // 에이전트가 생성 (Agent → Idea)
  | 'RESEARCHED_FROM';   // 웹 검색에서 발견

/** 의미 관계 — 아이디어 간 의미 구조 (Barrios 2020) */
export type SemanticEdge =
  | 'CONTRADICTS'        // 반대/모순
  | 'SUPPORTS'           // 뒷받침/강화
  | 'CAUSES'             // 인과 (A이면 B)
  | 'SIMILAR_TO'         // 유사 (but 다른 아이디어)
  | 'ALTERNATIVE_TO'     // 대안 (같은 문제, 다른 접근)
  | 'PREREQUISITE_OF'    // 선행 조건 (A가 있어야 B 가능)
  | 'EXTENDS';           // 확장 (A를 더 발전시킨 것)

/** 구조 관계 — 계층/소속/분류 (온톨로지 골격) */
export type StructuralEdge =
  | 'PART_OF'            // 부분-전체
  | 'GENERALIZES'        // 일반화 (하위→상위)
  | 'SPECIALIZES'        // 특수화 (상위→하위)
  | 'BELONGS_TO'         // 도메인/세션 소속
  | 'PRODUCED_IN'        // 세션에서 생성
  | 'USES_CONCEPT'       // 아이디어가 개념을 사용
  | 'ADDRESSES_TOPIC'    // 아이디어가 주제를 다룸
  | 'PRODUCES';          // 아이디어에서 산출물 생성

/** 전체 엣지 타입 */
export type EdgeType = CreationEdge | SemanticEdge | StructuralEdge;

// ═══════════════════════════════════════════
// MEMGRAPH 스키마 초기화 Cypher
// ═══════════════════════════════════════════

export const SCHEMA_CYPHER = `
// ── 인덱스 (Memgraph) ──
CREATE INDEX ON :Domain(id);
CREATE INDEX ON :Domain(name);
CREATE INDEX ON :Topic(id);
CREATE INDEX ON :Topic(title);
CREATE INDEX ON :Idea(id);
CREATE INDEX ON :Idea(title);
CREATE INDEX ON :Idea(phase);
CREATE INDEX ON :Idea(maturityStage);
CREATE INDEX ON :Idea(createdAt);
CREATE INDEX ON :Artifact(id);
CREATE INDEX ON :Concept(id);
CREATE INDEX ON :Concept(name);
CREATE INDEX ON :Session(id);
CREATE INDEX ON :Session(status);
CREATE INDEX ON :Agent(id);
CREATE INDEX ON :Agent(role);
`;

/** 스키마 요약 (사람/에이전트 읽기용) */
export const SCHEMA_SUMMARY = `
CreativeGraph Ontology (4-level hierarchy):

Level 0: Domain → (HAS_TOPIC) → Topic
  "Healthcare", "Fintech" — Csikszentmihalyi's domain knowledge

Level 1: Topic → (ADDRESSES_TOPIC) ← Idea
  "AI 금융 비서" — one creative session = one topic

Level 2: Idea → (PRODUCES) → Artifact
  Core unit. Has: provenance, Amabile scores, validation.
  Connects via: INSPIRED_BY, ITERATED_FROM, SCAMPER_OF (creation)
                CONTRADICTS, SUPPORTS, SIMILAR_TO (semantic)
                PART_OF, GENERALIZES, SPECIALIZES (structural)

Level 3: Artifact
  Concrete outputs: narratives, prototypes, papers.

Auxiliary: Concept (shared across ideas), Session (history), Agent (who did what)
`;
