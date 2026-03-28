---
name: creative-api-graph-architecture
description: Graph 시스템 전체 아키텍처 — dual-mode, 3뷰(My/Collective/Neighborhood), 데이터 흐름
type: project
---

# Graph 아키텍처 (2026-03-25)

```
================================================================
              GRAPH SYSTEM OVERVIEW
================================================================

  ┌─────────────────────────────────────────────────────┐
  │                  DATA SOURCES                       │
  │                                                     │
  │  light mode         heavy mode          MCP/API     │
  │  (four-is.ts)       (multi-agent.ts)    (외부)      │
  │       │                   │                │        │
  │       ▼                   ▼                ▼        │
  │  ┌─────────────────────────────────────────────┐    │
  │  │          graph-tools.ts (in-memory store)   │    │
  │  │  memoryStore = { nodes: MemNode[],          │    │
  │  │                   edges: MemEdge[] }         │    │
  │  │  MAX: 10K nodes / 30K edges + 10% eviction  │    │
  │  └──────────┬──────────────────┬───────────────┘    │
  │             │                  │                     │
  │     ┌───────▼──────┐  ┌───────▼──────┐             │
  │     │  events.ts   │  │ persistence  │             │
  │     │  (자동반응)   │  │ .ts (파일)   │             │
  │     │              │  │              │             │
  │     │ node:created │  │ /tmp (Vercel)│             │
  │     │ → novelty    │  │ data/ (로컬) │             │
  │     │ → SIMILAR_TO │  │ 3초 debounce │             │
  │     └──────────────┘  └──────────────┘             │
  │             │                                       │
  │     ┌───────▼──────────────────────────────┐       │
  │     │         service.ts (고수준 API)       │       │
  │     │  addNode / addEdge / listNodes        │       │
  │     │  searchGraph / getNeighborhood        │       │
  │     │  getVisualizationData / persistSession│       │
  │     │                                       │       │
  │     │  USE_MEMGRAPH? ──yes──→ driver.ts     │       │
  │     │       │                 (Bolt:7687)   │       │
  │     │       no                              │       │
  │     │       │                               │       │
  │     │       ▼                               │       │
  │     │  in-memory store (fallback)           │       │
  │     └───────┬───────────────────────────────┘       │
  │             │                                       │
  │     ┌───────▼──────────────────────────────┐       │
  │     │    transform.ts → Graph3DData         │       │
  │     │    (노드 색상/크기 + 엣지 스타일)     │       │
  │     └───────┬───────────────────────────────┘       │
  │             │                                       │
  │     ┌───────▼──────────────────────────────┐       │
  │     │  API Routes                           │       │
  │     │  /api/graph/visualize  ← 3D 렌더     │       │
  │     │  /api/graph/nodes      ← CRUD        │       │
  │     │  /api/graph/edges      ← CRUD        │       │
  │     │  /api/graph/search     ← 키워드+BFS  │       │
  │     │  /api/graph/stats      ← 통계        │       │
  │     └───────┬───────────────────────────────┘       │
  │             │                                       │
  │     ┌───────▼──────────────────────────────┐       │
  │     │  ForceGraph3D (react-force-graph-3d)  │       │
  │     │  5초 폴링 / WebGL+Bloom / 3D 인터랙션│       │
  │     └───────────────────────────────────────┘       │
  └─────────────────────────────────────────────────────┘
```

---

## 3가지 뷰 모드

```
================================================================
  /api/graph/visualize?scope=___&mode=___&userId=___
================================================================

  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │  1. COLLECTIVE BRAIN (기본)                     │
  │     scope=collective                            │
  │     → 모든 유저의 모든 노드                     │
  │     → listNodes(limit) + listEdges(limit*3)     │
  │     → 전체 그래프 시각화                        │
  │                                                 │
  │  2. MY BRAIN                                    │
  │     scope=my&userId=user-123                    │
  │     → store.nodes.filter(n.userId === userId)   │
  │     → 해당 유저 노드 + 그 사이 엣지만          │
  │     → 개인 아이디어 맵                          │
  │                                                 │
  │  3. NEIGHBORHOOD (노드 상세에서)                │
  │     /api/graph/search?nodeId=xxx&hops=2         │
  │     → BFS 2홉 이웃 탐색                        │
  │     → 특정 노드 중심 서브그래프                 │
  │     → 노드 클릭 → "Explore Neighbors" 버튼     │
  │                                                 │
  │  + mode=mock  → 개발용 랜덤 그래프             │
  │  + mode=seed  → 수업 예시 Iteration 체인       │
  │  + mode=live  → 실제 데이터 (기본)             │
  │                                                 │
  └─────────────────────────────────────────────────┘


  그래프 페이지 UI:

  ┌───────────────────────────────────────────────┐
  │ ┌──────────────┐                              │
  │ │ BRAIN        │                              │
  │ │ [🧠My] [🌐Col]│    ← scope 토글            │
  │ │              │                              │
  │ │ 107 nodes    │         3D Graph             │
  │ │ 223 edges    │      (ForceGraph3D)          │
  │ │ Source: file │                              │
  │ │ +5 new nodes │                              │
  │ │              │                              │
  │ │ [live][mock] │    ← mode 토글               │
  │ │ [seed]       │                              │
  │ └──────────────┘                              │
  │                          ┌──────────────────┐ │
  │                          │ Node Detail      │ │
  │                          │ "AI Tutor"       │ │
  │                          │ Type: Idea       │ │
  │                          │ Score: 85/100    │ │
  │                          │ Method: scamper  │ │
  │                          │                  │ │
  │                          │ [Explore 2-hop]  │ │
  │                          └──────────────────┘ │
  └───────────────────────────────────────────────┘
```

---

## My Brain vs Collective Brain 설계 차이

```
================================================================
                    BRAIN MODES
================================================================

  COLLECTIVE BRAIN                MY BRAIN
  ──────────────                  ────────
  모든 유저의 모든 노드           userId 필터링
  전체 그래프 구조 보임           내 노드 + 내 노드 간 엣지만
  크고 복잡                       작고 개인화

  ┌────────────────────┐         ┌────────────────────┐
  │   ●A ──── ●B       │         │   ●A ──── ●B       │
  │   │       │        │         │           │        │
  │   ●C ──── ●D       │         │           ●D       │
  │   │       │        │         │                    │
  │   ●E ──── ●F (다른유저)│     │  (E,F는 안 보임)   │
  └────────────────────┘         └────────────────────┘

  현재 구현 상태:
  ─ Collective: ✅ listNodes + listEdges (전체)
  ─ My Brain:   ⚠️ store.nodes.filter(userId) 동작하지만
                   userId가 세션 생성 시 태깅되지 않는 문제
                   (anonymous로 들어가서 필터 무의미)

  해결 필요:
  1. 세션 생성 시 userId를 Idea 노드에 태깅
  2. graphAddNodeTool에서 userId 전달
  3. 인증된 유저만 My Brain 사용 가능
```

---

## 데이터 흐름 상세

```
================================================================
  SESSION → GRAPH 저장 흐름
================================================================

  사용자: POST /api/creative/session { topic, domain, mode }
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  mode=light: runFourIsPipeline()            │
  │    Immersion → getImmersionContext(topic)    │
  │      ↓ graphContext (기존 지식)              │
  │    Inspiration → divergentGenerate()        │
  │      ↓ ideas[] → 즉시 memoryStore에 저장    │
  │      ↓ emitNodeCreated → novelty + SIMILAR  │
  │    Isolation → convergentSelect()           │
  │      ↓ ranked ideas with scores             │
  │    Iteration → semantic + SCAMPER           │
  │      ↓ iterated ideas                       │
  │                                             │
  │  mode=heavy: runMultiAgentPipeline()        │
  │    researcher → graph_add_node (Concept)    │
  │    divergent  → graph_add_node (Idea) ×8~15 │
  │              → graph_add_edge ×3~6          │
  │    evaluator  → evaluate_idea (점수만)      │
  │    validator  → measure_novelty (점수만)    │
  │    iterator   → graph_add_node (Idea) ×3~5  │
  │              → graph_add_edge ×3~5          │
  └──────────────────┬──────────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────────┐
  │  persistSession(session)                    │
  │                                             │
  │  Domain (중복방지) ←[BELONGS_TO]── Topic    │
  │                                    │        │
  │  Session ←[PRODUCED_IN]── Idea ────┘        │
  │                           │  ADDRESSES_TOPIC│
  │                           │                 │
  │  Parent ←[ITERATED_FROM|SCAMPER_OF]── Idea  │
  │                                             │
  │  scheduleAutoSave() → 3초 후 파일 저장      │
  └─────────────────────────────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────────┐
  │  /graph 페이지 (5초 폴링)                   │
  │  fetch(/api/graph/visualize?mode=live)      │
  │  → 새 노드 감지 → "+N new nodes" 표시       │
  │  → ForceGraph3D 렌더링                      │
  └─────────────────────────────────────────────┘
```

---

## 파일 매핑

```
아키텍처 레이어          파일
──────────────          ─────
In-memory store      → agents/tools/graph-tools.ts (memoryStore)
이벤트 시스템         → modules/graph/events.ts
파일 영속성           → modules/graph/persistence.ts
Cypher 안전검증       → modules/graph/safe-cypher.ts
서비스 레이어         → modules/graph/service.ts
Memgraph 드라이버     → modules/graph/driver.ts
3D 변환              → modules/graph/transform.ts
Novelty 계산         → modules/graph/queries/novelty.ts
엣지 분류            → modules/graph/queries/connections.ts
BFS 탐색             → modules/graph/queries/traversal.ts
검색                 → modules/graph/queries/search.ts
시각화 스타일         → config/graph-styles.ts
3D 컴포넌트          → components/graph/ForceGraph3D.tsx
그래프 페이지         → app/(app)/graph/page.tsx
API 라우트           → app/api/graph/{nodes,edges,search,visualize,stats}/
```
