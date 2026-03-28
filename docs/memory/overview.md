---
name: creative-api-overview
description: CreativeGraph AI — light + heavy 모드 둘 다 검증, 보안 하드닝 완료, Vercel 배포 대기
type: project
---

# CreativeGraph AI (2026-03-25)

학술 창의성 이론 5가지를 AI 에이전트로 코드화. Graph DB에 아이디어 영구 축적.

## 현재 상태: 로컬 검증 완료 → Vercel 배포 대기

### 검증 완료
- **Light mode**: 4I's 파이프라인 (Immersion→Inspiration→Isolation→Iteration), ~100초
- **Heavy mode**: 5 에이전트 자율 실행 (researcher→divergent→evaluator+validator→iterator), ~191초
- **보안 하드닝**: 6 critical + 8 warning 수정 (Cypher injection, auth bypass, MCP tier 등)
- **그래프 축적**: 세션마다 노드/엣지 영구 저장, 다음 세션에서 재활용

### 다음 단계
1. Vercel 배포 (in-memory 모드로 충분)
2. Google VM에 Memgraph 설치 (선택)
3. LemonSqueezy 결제 연동

## 핵심 차별점
- 5이론 통합 (Guilford + Amabile + Csikszentmihalyi + Geneplore + SCAMPER)
- Graph 축적 ("ideas compound forever", Knowledge Distance Luo 2022)
- 자율 에이전트 11종 도구 (TRIZ 40원리 전체)
- 3D 시각화 (react-force-graph-3d, 5초 폴링)

## 기술 스택
- Next.js 15.5, React 19, Tailwind 4, react-force-graph-3d
- AI SDK (Gemini 2.5 Flash 기본), 멀티 프로바이더
- Memgraph or in-memory + file persistence (dual-mode)
- LemonSqueezy + Upstash Redis (키/rate limit)

## 커밋 이력 (이번 세션)
- `dea1209` — 보안 하드닝 (safe-cypher.ts, middleware, MCP tier)
- `451bc42` — LLM JSON 파싱 견고화 + convergent fallback
- `1e69d97` — heavy mode 검증 (maxDuration 300, context truncate, judge fallback)

## 위치
- 코드: `projects/creative-api/`
- 수업자료: `docs/DigitalCreativity/`
- ClawTeam: `projects/DigitalCreativity/ClawTeam/` (Python, 선택적)
