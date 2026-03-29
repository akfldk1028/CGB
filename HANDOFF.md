# HANDOFF — CGB (Creative Graph Brain)

## What This Is
AI creativity engine. Academic creativity theories → autonomous agents → knowledge graph. Ideas accumulate forever. Each session makes the next one smarter.

**Parent project**: [WMCP](https://github.com/akfldk1028/WMCP) — WebMCP 기반 비즈니스 프로젝트 모노레포. CGB는 여기서 분리된 독립 레포.

## WMCP 프로젝트 전체 구조
```
WMCP (D:\Data\28_WMCP) — pnpm monorepo
├── projects/bizscope/     — 기업분석 + 아이디어분석 AI SaaS (33섹션, 듀얼API, i18n)
├── projects/shopguard/    — 쇼핑몰 보안 모니터링 (Vercel 배포 완료)
├── projects/creative-api/ — [DEPRECATED] CGB 원본 (이제 독립 레포)
├── packages/              — 공유 라이브러리 (core, scanner, mcp-bridge)
├── webmcp/                — 공식 WebMCP 스펙 (GitHub clone)
├── workflows/             — n8n 자동화 모듈
└── docs/                  — 학습 문서 (한국어)

CGB (D:\Data\CGB) — 독립 레포 ← 지금 여기
├── src/                   — Next.js 15 앱 (137 ts/tsx 파일)
├── agents/                — 6 에이전트 (gitagent v0.1.0, 62 파일)
├── tools/                 — 13 MCP 호환 도구 스키마
├── skills/                — 6 스킬 모듈
├── workflows/             — 4I's YAML 워크플로우
├── submodules/brainstorm-mcp/ — 멀티모델 디베이트 참조 (git submodule)
├── memory/                — 24 파일 지식 베이스
└── docs/                  — 이론, 논문, 강의
```

## Quick Start
```bash
git clone --recurse-submodules https://github.com/akfldk1028/CGB.git
cd CGB
pnpm install
# .env.local에 최소 GOOGLE_GENERATIVE_AI_API_KEY 설정
pnpm dev  # localhost:3001
```

## Read These First
1. `HANDOFF.md` — 이 파일 (전체 맥락)
2. `CLAUDE.md` — 프로젝트 개요, 명령어, 규칙
3. `AGENTS.md` — 6 에이전트 구조, 통신 방식
4. `RULES.md` — 보안 제약 (Cypher injection, 헤더 스푸핑 등)
5. `memory/MEMORY.md` — 24파일 인덱스 (아키텍처, 스키마, 논문, 결정사항)

## 핵심 개념

### 1. 단일 그래프, 다중 뇌
모든 노드는 하나의 그래프. "뇌"는 필터 뷰:
- **Collective** = 전체 (메타 뇌)
- **Domain** = 도메인별 (AI, Design, Business...)
- **User** = userId 기반 개인
- **Agent** = GENERATED_BY 엣지 기반 에이전트별
- **Visual** = imageUrl 있는 노드

왜 분리 안 함: Knowledge Distance(핵심 metric)가 모든 노드 연결을 요구.

### 2. 에이전트 = 그래프 1등 시민
- Agent 노드 자동 생성 (`ensureAgentNode()`)
- GENERATED_BY 엣지로 기여 추적
- 각 에이전트 폴더에 tools/ + skills/ 포함 (포터블)

### 3. 13개 도구
graph CRUD (4) + web_search + brainstorm + scamper + triz + evaluate + keywords + novelty + image_analysis + multi_model_debate

### 4. 멀티모델 디베이트
`debate-tool.ts` — 그래프 지식 읽기 → Gemini+Claude+GPT 병렬 토론 → 결과 그래프 저장. `submodules/brainstorm-mcp/`가 원본 참조.

## 이번 세션 (2026-03-28~29) 전체 변경

### 코드
| 커밋 | 내용 |
|------|------|
| `49b44a5` | Agent 1등 시민 + Brain View 시스템 |
| `83a9cdf` | Multi-model debate + brainstorm-mcp submodule |
| `fc0d91a` | debate tool 그래프 연동 (읽기+쓰기) |
| `8326257` | 코드 리뷰 P0/P1 수정 (store interface, phantom agents) |
| `4544f59` | MCP 13/13 도구 + tsconfig submodule 제외 |
| `f920afe` | API brain view 파라미터 + 프론트엔드 연결 |
| `ceb79d6` | mock 데이터에 Agent/imageUrl/userId 추가 (뷰별 다른 그래프) |
| `e06faed` | 포터블 에이전트 (tools/ + skills/ 각 폴더 안에) |

### 메모리/문서
- memory/ 24파일 (WMCP에서 마이그레이션 + stale 참조 정리)
- HANDOFF.md, CLAUDE.md, AGENTS.md, RULES.md, SOUL.md
- 코드 리뷰 결과 + 결정사항 기록

## 아키텍처
```
API Route (POST /api/creative/session)
  ├── light mode → four-is.ts (Guilford diverge/converge, ~100s)
  └── heavy mode → multi-agent.ts (5 agents, AI SDK tool calling, ~191s)
       ├── researcher → graph_search + web_search
       ├── divergent_thinker → brainstorm + scamper + triz + multi_model_debate
       ├── evaluator + field_validator (parallel)
       └── iterator → scamper + triz + novelty

Graph:
  7 nodes: Domain > Topic > Idea > Artifact + Concept, Session, Agent
  22 edges: Creation(7) + Semantic(7) + Structural(8)
  Novelty = BFS shortest path (Knowledge Distance, Luo 2022)

Frontend (/graph):
  3D ForceGraph + 5탭 뷰 (Collective/My/Domain/Agent/Visual)
  mock/seed/live 모드 + 타입 필터 + 노드 클릭 디테일
```

## Known Issues
- `workflow-engine.ts` — YAML DAG 엔진 존재하지만 API 미연결. 실제 heavy mode는 `multi-agent.ts`
- Dead code: `clawteam-client.ts`, `roles/*.ts`, `orchestrator.ts`
- Zero tests (no vitest)
- Vercel 미배포
- userId 미구현 (전부 anonymous)

## Next Steps
1. 실제 세션 돌려보기 (`POST /api/creative/session` heavy mode)
2. `workflow-engine.ts` → API 라우트 연결 (multi-agent.ts 대체)
3. Vercel 배포
4. vitest 테스트 추가
5. userId 태깅 (My Brain 실제 동작)
6. LemonSqueezy 결제 연동
7. Dead code 정리
8. WebMCP 호환 래퍼 (WMCP packages/ 활용)

## Env Vars
```
GOOGLE_GENERATIVE_AI_API_KEY=<required>   # Gemini 2.5 Flash
OPENAI_API_KEY=<optional>                 # multi-model debate
ANTHROPIC_API_KEY=<optional>              # multi-model debate
UPSTASH_REDIS_REST_URL=<optional>         # API key storage
UPSTASH_REDIS_REST_TOKEN=<optional>
CREATIVEGRAPH_API_KEY=<optional>          # master key (free mode if unset)
```

## 개발자 정보
- GitHub: https://github.com/akfldk1028
- 1인 개발자 (Donghyeon Kim)
- 포트폴리오: BizScope (기업분석) + ShopGuard (보안) + CGB (창의성)
