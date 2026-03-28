---
name: creative-api-graph-schema
description: CreativeGraph 온톨로지 — 7노드 28엣지, 정확한 분류 + ASCII 관계도 + 구현 상태
type: project
---

# CreativeGraph 온톨로지 (2026-03-25)

```
================================================================
  NODE TYPES (7종, 4계층 + 보조 3종)
================================================================

  Level   Node        예시                    구현   생성자
  ─────   ────        ──────                  ────   ──────
  L0      Domain      "Healthcare"            ✅    persistSession (중복방지)
  L1      Topic       "AI 금융비서"           ✅    persistSession
  L2      Idea        핵심 아이디어           ✅    에이전트 + 파이프라인 + persistSession
  L3      Artifact    논문, 프로토타입        ❌    미구현
  보조    Concept     "Transfer Learning"     ✅    researcher 에이전트
  보조    Session     세션 기록               ✅    persistSession
  보조    Agent       에이전트 활동           ❌    미구현
```

```
================================================================
  EDGE TYPES — 정확한 3계층 분류
================================================================

  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  CREATION (7종) — "어떻게 만들어졌나" (provenance)      │
  │  ─────────────────────────────────────                  │
  │  Source         Edge              Target      구현      │
  │  ──────         ────              ──────      ────      │
  │  Idea     ──[INSPIRED_BY]──→     Idea        ✅ 에이전트│
  │  Idea     ──[ITERATED_FROM]──→   Idea        ✅ 자동*   │
  │  Idea     ──[COMBINED_FROM]──→   Idea        ✅ 에이전트│
  │  Idea     ──[SCAMPER_OF]──→      Idea        ✅ 자동*   │
  │  Idea     ──[DERIVED_FROM]──→    Idea        ✅ 에이전트│
  │  Idea     ──[GENERATED_BY]──→    Agent       ❌ 미구현  │
  │  Concept  ──[RESEARCHED_FROM]──→ Source       ❌ 미구현  │
  │                                                         │
  │  * persistSession이 parentId 기반으로 자동 생성         │
  │                                                         │
  │                                                         │
  │  SEMANTIC (7종) — "아이디어 간 의미 구조"               │
  │  ───────────────────────────────────────                 │
  │  Source         Edge               Target     구현      │
  │  ──────         ────               ──────     ────      │
  │  Idea     ←─[SIMILAR_TO]──→       Idea       ✅ 자동** │
  │  Idea     ──[CONTRADICTS]──→      Idea       ✅ 에이전트│
  │  Idea     ──[SUPPORTS]──→         Idea       ✅ 에이전트│
  │  Idea     ──[CAUSES]──→           Idea       ✅ 에이전트│
  │  Idea     ←─[ALTERNATIVE_TO]──→   Idea       ✅ 에이전트│
  │  Idea     ──[PREREQUISITE_OF]──→  Idea       ✅ 에이전트│
  │  Idea     ──[EXTENDS]──→          Idea       ✅ 에이전트│
  │                                                         │
  │  ** events.ts가 타이틀 토큰 30%+ 겹침 시 자동 (최대3)  │
  │                                                         │
  │                                                         │
  │  STRUCTURAL (8종) — "계층/소속/분류"                    │
  │  ──────────────────────────────────                      │
  │  Source         Edge               Target     구현      │
  │  ──────         ────               ──────     ────      │
  │  Topic    ──[BELONGS_TO]──→       Domain      ✅ 자동*  │
  │  Idea     ──[ADDRESSES_TOPIC]──→  Topic       ✅ 자동*  │
  │  Idea     ──[PRODUCED_IN]──→      Session     ✅ 자동*  │
  │  Idea     ──[USES_CONCEPT]──→     Concept     ✅ 에이전트│
  │  Idea     ──[PRODUCES]──→         Artifact    ❌ 미구현  │
  │  Idea     ──[PART_OF]──→          Idea        ✅ 에이전트│
  │  Idea     ──[GENERALIZES]──→      Idea        ✅ 에이전트│
  │  Idea     ──[SPECIALIZES]──→      Idea        ✅ 에이전트│
  │                                                         │
  │                                                         │
  │  AGENT-SPECIFIC (5종) — 에이전트 행동 전용              │
  │  ────────────────────────────────────────                │
  │  Source         Edge               Target     구현      │
  │  ──────         ────               ──────     ────      │
  │  Agent    ──[EXPLORES]──→         Idea        ❌ 미구현  │
  │  Agent    ──[EVALUATES]──→        Idea        ❌ 미구현  │
  │  Agent    ──[REFINES]──→          Idea        ❌ 미구현  │
  │  *any*    ──[USED_IN]──→          *any*       ✅ 범용   │
  │  *any*    ──[RELATES_TO]──→       *any*       ✅ 범용   │
  │                                                         │
  │  + COMBINES (= COMBINED_FROM alias)                     │
  │                                                         │
  │  합계: 7+7+8+5+1(alias) = 28종                         │
  │  safe-cypher.ts에 28종 전부 등록됨                      │
  └─────────────────────────────────────────────────────────┘
```

```
================================================================
  ASCII 전체 관계도 — 노드 간 엣지 연결 맵
================================================================

                        ┌──────────┐
                        │  DOMAIN  │ L0
                        └─────▲────┘
                              │
                         BELONGS_TO
                              │
                        ┌─────┴────┐
                        │  TOPIC   │ L1
                        └─────▲────┘
                              │
                       ADDRESSES_TOPIC
                              │
  ┌───────────────────────────┼───────────────────────────┐
  │                           │                           │
  │  ┌────────┐         ┌────┴───┐         ┌────────┐    │
  │  │  IDEA  │◄───────►│  IDEA  │◄───────►│  IDEA  │    │ L2
  │  └───┬────┘         └───┬────┘         └───┬────┘    │
  │      │                  │                   │         │
  │      │    Idea ←→ Idea  엣지들:             │         │
  │      │    ─────────────────────             │         │
  │      │    CREATION:                         │         │
  │      │      INSPIRED_BY ──→                 │         │
  │      │      ITERATED_FROM ──→               │         │
  │      │      SCAMPER_OF ──→                  │         │
  │      │      COMBINED_FROM ──→               │         │
  │      │      DERIVED_FROM ──→                │         │
  │      │    SEMANTIC:                         │         │
  │      │      SIMILAR_TO ←→ (자동)            │         │
  │      │      CONTRADICTS ──→                 │         │
  │      │      SUPPORTS ──→                    │         │
  │      │      CAUSES ──→                      │         │
  │      │      ALTERNATIVE_TO ←→               │         │
  │      │      PREREQUISITE_OF ──→             │         │
  │      │      EXTENDS ──→                     │         │
  │      │    STRUCTURAL:                       │         │
  │      │      PART_OF ──→                     │         │
  │      │      GENERALIZES ──→                 │         │
  │      │      SPECIALIZES ──→                 │         │
  │      │                                      │         │
  └──────┼──────────────────────────────────────┼─────────┘
         │                                      │
    PRODUCED_IN                           USES_CONCEPT
         │                                      │
         ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │ SESSION  │ 보조                     │ CONCEPT  │ 보조
   └──────────┘                          └──────────┘


  미구현 관계:
  Idea ──[PRODUCES]──→ Artifact (L3)
  Idea ──[GENERATED_BY]──→ Agent (보조)
  Agent ──[EXPLORES|EVALUATES|REFINES]──→ Idea
```

```
================================================================
  persistSession() 자동 생성 패턴
================================================================

  호출 시점: 세션 완료 후 (light/heavy 둘 다)

  Step 1: Domain (중복방지)
    domain-{name} [Domain]

  Step 2: Topic
    topic-{sessionId} [Topic]
    Topic ──[BELONGS_TO]──→ Domain

  Step 3: Session
    {sessionId} [Session]

  Step 4: 각 Idea:
    Idea ──[ADDRESSES_TOPIC]──→ Topic
    Idea ──[PRODUCED_IN]──→ Session
    IF parentId && method.includes('scamper'):
      Idea ──[SCAMPER_OF]──→ Parent
    ELIF parentId:
      Idea ──[ITERATED_FROM]──→ Parent
```

```
================================================================
  events.ts 자동 트리거
================================================================

  ON node:created:
    1. novelty = BFS(새 노드 → 가장 가까운 다른 Idea)
       node.score = novelty (0~100)
    2. 타이틀 토큰 30%+ 겹침인 기존 노드 최대 3개:
       NewIdea ──[SIMILAR_TO]──→ ExistingIdea
```

```
================================================================
  에이전트 자율 생성 (heavy mode)
================================================================

  researcher (4 steps):
    [Concept] 노드 생성 (도메인 지식)

  divergent_thinker (16 steps):
    [Idea] 노드 8~15개
    Idea ──[INSPIRED_BY]──→ Idea
    Idea ──[SCAMPER_OF]──→ Idea
    Idea ──[COMBINED_FROM]──→ Idea

  iterator (10 steps):
    [Idea] 노드 3~5개
    Idea ──[ITERATED_FROM]──→ Parent
    Idea ──[CONTRADICTS]──→ Idea

  evaluator / field_validator:
    노드/엣지 생성 없음 (평가만)
```

```
================================================================
  Novelty Score 공식
================================================================

  BFS 최단경로 (새 Idea → 가장 가까운 다른 Idea):

  거리        점수    의미
  ────        ────    ──────
  연결 없음   100     고립 = 완전히 새로운 개념
  1홉          20     직접 이웃 = 파생
  2홉          40     2차 연결
  3홉          60     적당히 먼
  4홉          80     상당히 먼
  5홉+         95     매우 먼 = 높은 창의성

  근거: Luo et al. (2022) "Knowledge Distance"
```

```
================================================================
  요약 카운트
================================================================

  노드: 7종 (구현 5 + 미구현 2)
    ✅ Domain, Topic, Idea, Concept, Session
    ❌ Artifact, Agent

  엣지: 28종 (safe-cypher 등록 기준)
    스키마 22종: Creation 7 + Semantic 7 + Structural 8
    에이전트 5종: EXPLORES, EVALUATES, REFINES, USED_IN, RELATES_TO
    Alias 1종: COMBINES (= COMBINED_FROM)

  자동 생성: BELONGS_TO, ADDRESSES_TOPIC, PRODUCED_IN,
            ITERATED_FROM, SCAMPER_OF, SIMILAR_TO (6종)
  에이전트 자율: 나머지 전부

  파일:
    schema.ts       7노드 interface + 22엣지 type
    safe-cypher.ts  28종 whitelist (동기화 완료)
    connections.ts  classifyEdge() → creation/semantic/structural
    events.ts       SIMILAR_TO 자동 + novelty 자동
    novelty.ts      BFS + Cypher
    graph-styles.ts 노드 7색 + 엣지 스타일
    service.ts      persistSession() 자동 생성
    graph-tools.ts  graphAddNodeTool, graphAddEdgeTool
```
