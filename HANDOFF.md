# HANDOFF — CGB (Creative Graph Brain)

## Goal
**CCG(create-context-graph, Neo4j Labs) 패턴을 CGB에 적용**하여 그래프 기반 창의성 엔진을 고도화.
특히 YAML 온톨로지, Reasoning Trace, SSE 실시간 스트리밍을 브레인스토밍 Plan Mode로 통합.

---

## Current Progress (2026-03-28~29, 3 sessions)

### Session 1 (03-28): 인프라 구축
- Agent 1등 시민 (ensureAgentNode + GENERATED_BY)
- 5 Brain Views (Collective/Domain/User/Agent/Visual)
- brainstorm-mcp submodule + debate-tool.ts (13th tool)
- Memory 24파일 + HANDOFF + 포터블 에이전트 62파일
- 코드 리뷰 P0/P1 수정
- 프론트엔드 5탭 뷰 연결 (mock 데이터 포함)
- **21 commits, 전부 GitHub 푸쉬**

### Session 2 (03-29): CCG 분석
- create-context-graph 전체 분석 완료 (`memory/research/ccg-comparison.md`)
- 빼올 패턴 5개 식별, CGB 우위 7개 확인

### Session 3 (03-29): P0 + P1-1 구현
- **P0-1 Reasoning Trace**: DecisionTrace + TraceStep 노드, queries/traces.ts, agent-runner에 자동 저장
- **P0-2 SSE 스트리밍**: SessionEmitter 콜백, /api/creative/session/stream, useSessionStream 훅
- **P1-1 YAML 온톨로지**: _base.yaml + creativity.yaml, ontology-loader.ts (Zod 검증 + base 머지)
- **P1-2 GDS 알고리즘**: PageRank + Louvain + KNN Similarity (순수 TypeScript)
- **Vitest 36 tests**: algorithms(12) + traces(12) + ontology(6) + seed(6), 전부 통과
- **합성 데이터 파이프라인**: seed/generate.ts (3 domains × 20 ideas + concepts + traces)
- 코드 리뷰: 중복 reduce 수정, 미사용 타입 제거, PageRank dangling node fix
- **22→27 commits, GitHub 동기화**

---

## What Worked
- **Brain View = 필터, 분리 아님**: Knowledge Distance 보존하면서 다중 뷰 가능
- **Agent-as-Node**: 다른 프로젝트(CCG 포함)에 없는 고유 패턴
- **store 인터페이스 통일**: P0 리뷰 후 모든 코드가 store.addNode() 사용
- **gitagent 표준**: 에이전트 폴더가 자립적 (tools/skills/ 포함)

## What Didn't Work
- **workflow-engine.ts**: YAML DAG 엔진을 만들었지만 API에 안 물림. multi-agent.ts가 실제 runner
- **mock 데이터 초기**: Agent/userId/imageUrl 없어서 모든 뷰가 동일했음 → 수정 완료
- **Explore 에이전트**: 컨텍스트가 커서 "Prompt too long" 에러 → 직접 Read/Grep 탐색

---

## CCG에서 빼올 패턴 (진행 상황)

### P0 — ✅ 완료

#### 1. ✅ Reasoning Trace (DecisionTrace → TraceStep)
```
현재: 에이전트 실행 → steps[] 배열로만 기록, 세션 끝나면 사라짐
목표: DecisionTrace 노드 + HAS_STEP 엣지로 그래프에 영구 저장
```
- CCG 참조: `docs/explanation/three-memory-types.md`
- 구현: `src/modules/graph/queries/traces.ts` 신규
- Agent runner에서 각 step을 TraceStep 노드로 저장
- Session → HAS_TRACE → DecisionTrace → HAS_STEP → TraceStep

#### 2. ✅ SSE 실시간 스트리밍 (CypherResultCollector 패턴)
```
현재: 세션 POST → 5분 기다림 → 결과 한번에 반환
목표: 에이전트 실행 중 tool_start/tool_end/graph_change 이벤트를 SSE로 프론트에 실시간 전송
```
- CCG 참조: `templates/backend/shared/context_graph_client.py.j2` (CypherResultCollector)
- 구현: `/api/creative/session/stream` SSE 엔드포인트 신규
- 프론트: 그래프가 세션 진행 중 실시간으로 자라는 모습 렌더링

### P1 — 중기

#### 3. ✅ YAML 온톨로지 전환
```
현재: schema.ts에 TypeScript 하드코딩 (7 nodes, 22 edges)
목표: creativity.yaml + _base.yaml 상속 구조
```
- CCG 참조: `src/create_context_graph/ontology.py` + `domains/_base.yaml`
- 스키마 검증: Zod (CGB) 또는 Pydantic-style
- 장점: 음악, 산업디자인, 연구 등 커스텀 창의성 도메인 무한 확장

#### 4. ✅ GDS 알고리즘 (순수 TypeScript, Neo4j 불필요)
- ✅ Louvain: 아이디어 클러스터 자동 발견 (modularity 최적화)
- ✅ PageRank: 가장 핵심적인 노드 식별 (power iteration, damping 0.85)
- ✅ KNN Similarity: Jaccard on neighbor sets (FastRP 대체, 구조적 유사도)

### P2 — 나중

#### 5. 합성 데이터 파이프라인
- entity seed → relationship weave → document gen → trace
- 리얼한 데모 데이터 자동 생성 (mock보다 정교)

---

## 프로젝트 전체 구조
```
WMCP (D:\Data\28_WMCP) — pnpm monorepo
├── projects/bizscope/     — 기업분석 + 아이디어분석 AI SaaS
├── projects/shopguard/    — 쇼핑몰 보안 모니터링
├── clone/create-context-graph/ — [참조] Neo4j Labs CCG
├── packages/              — 공유 라이브러리
├── webmcp/                — 공식 WebMCP 스펙
└── docs/

CGB (D:\Data\CGB) — 독립 레포
├── src/ (137 ts/tsx)      — Next.js 15 앱
├── agents/ (62 파일)       — 6 에이전트 (gitagent v0.1.0 포터블)
├── tools/ (13 YAML)       — MCP 도구 스키마
├── skills/ (6)            — 스킬 모듈
├── workflows/ (2 YAML)    — 4I's 파이프라인
├── submodules/brainstorm-mcp/ — 멀티모델 디베이트 참조
├── memory/ (25 md)        — 지식 베이스
└── docs/                  — 이론, 논문
```

## 아키텍처
```
API (POST /api/creative/session)
  ├── light → four-is.ts (Guilford, ~100s)
  └── heavy → multi-agent.ts (5 agents, AI SDK, ~191s)
       ├── researcher → graph_search + web_search
       ├── divergent_thinker → brainstorm + scamper + triz + multi_model_debate
       ├── evaluator + field_validator (parallel)
       └── iterator → scamper + triz + novelty

Graph (single store, 5 brain views):
  7 nodes: Domain > Topic > Idea > Artifact + Concept, Session, Agent
  22 edges: Creation(7) + Semantic(7) + Structural(8)
  Novelty = BFS shortest path (Knowledge Distance, Luo 2022)

13 Tools: graph(4) + web + brainstorm + scamper + triz
          + evaluate + keywords + novelty + image + debate

Frontend (/graph): 3D ForceGraph + 5탭 + mock/seed/live
```

## Session 4 (03-31): MOL 연동 + Graph v2 설계

### MOL 연동 완료 (MOL 쪽)
- BrainClient.js — CGB REST API 래퍼 (addToGraph, searchGraph, brainstorm, evaluate)
- BrainEvolution.js — brain_config (archetype × Big Five), HR 진화, 경험치
- 366명 brain_config 초기화, /brain/status API
- AgentLifecycle + TaskWorker에서 BrainClient 호출 (non-blocking)
- CGB 마스터키 설정 + Vercel 재배포 (team tier)

### CGB 쪽 미완료 → Graph v2로 해결
- ❌ API가 agent_id/layer/domain 파라미터 안 받음
- ❌ InMemory → Supabase pgvector 전환 필요
- ❌ 검색 3중화 필요 (cosine + BM25 + BFS)
- ❌ SIMILAR_TO 임베딩 기반 변경 필요
- ❌ Agent 최상위 노드 + Temporal Edge

### Graph v2 설계 문서
→ `docs/memory/graph-v2-migration.md` (전체 설계 + SQL 스키마 + 구현 순서)
→ `docs/memory/mol-integration-status.md` (MOL 연동 현황)

---

## Known Issues
- `workflow-engine.ts` — YAML DAG 존재하나 API 미연결
- Dead code: `clawteam-client.ts`, `roles/*.ts`, `orchestrator.ts`
- Vercel: 배포됨 (cgb-brain-lemon.vercel.app, team tier)
- **Graph: InMemory + /tmp → 프로덕션 불안정, v2(pgvector)로 전환 필요**
- **MOL 연동: 파이프 연결됨 but CGB 쪽 파라미터 미지원**

## Env Vars
```
GOOGLE_GENERATIVE_AI_API_KEY=<required>
OPENAI_API_KEY=<optional>
ANTHROPIC_API_KEY=<optional>
UPSTASH_REDIS_REST_URL/TOKEN=<optional>
CREATIVEGRAPH_API_KEY=<optional>
```

## 개발자
- GitHub: akfldk1028 (Donghyeon Kim)
- 포트폴리오: BizScope + ShopGuard + CGB
