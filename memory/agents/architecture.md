---
name: creative-api-agent-architecture
description: 자율 에이전트 아키텍처 — 도구 시스템, 런타임 루프, 멀티에이전트 오케스트레이션
type: project
---

# 자율 에이전트 아키텍처 (2026-03-24)

## 핵심: "프롬프트 한번 호출" → "자율 루프 + 도구 사용"

### Agent Runner (v2)
```
Agent Runner (자율 루프)
  ├── observe: 현재 상태 파악 (Graph DB 검색)
  ├── think: LLM이 다음 행동 결정
  ├── act: 도구 사용 (web_search, graph_add_node, scamper_transform 등)
  └── repeat until DONE or maxSteps
```
에이전트가 스스로 어떤 도구를 쓸지 결정.

## 파일 구조
```
modules/agents/
├── tools/                    — 에이전트 도구 (11종)
│   ├── registry.ts           — 전체 도구 레지스트리 + 역할별 필터링
│   ├── web-search.ts         — Google 웹 검색
│   ├── graph-tools.ts        — Graph DB CRUD (4도구) + 이벤트 emit
│   ├── scamper-tool.ts       — SCAMPER 7기법 변환
│   ├── evaluate-tool.ts      — 6차원 평가
│   ├── brainstorm-tool.ts    — 발산적 아이디어 생성
│   ├── keyword-extractor.ts  — 키워드 추출
│   ├── novelty-tool.ts       — Graph 거리 = 창의성 측정
│   └── triz-tool.ts          — TRIZ 40 발명 원리
├── runtime/
│   ├── agent-runner.ts       — 단일 에이전트 자율 루프 (AI SDK tool calling)
│   ├── definitions.ts        — 6 에이전트 선언적 정의
│   └── multi-agent.ts        — 4I's 멀티에이전트 파이프라인
├── roles/                    — 역할별 프롬프트
├── orchestrator.ts           — (legacy) 단순 파이프라인
└── clawteam-client.ts        — Python 서버 호출 (heavy)
```

## LLM: AI SDK 멀티프로바이더 (3종)
- **Google** Gemini 2.5 Flash (기본) — @ai-sdk/google
- **Anthropic** Claude — @ai-sdk/anthropic
- **OpenAI** GPT — @ai-sdk/openai
- `modules/llm/client.ts` — getModel(), getAvailableProviders(), llmGenerate(), llmGenerateJSON()
- 직접 SDK 의존 없음 (legacy @anthropic-ai/sdk, openai 제거 완료)

## 도메인별 도구 전략 (Agent Ideate 근거)
- 기술도메인(CS, Engineering) → web_search 강화
- 창의도메인(Art, Design) → scamper + triz 강화

## 멀티에이전트 파이프라인 흐름
```
researcher (Immersion, 8 steps)
  → divergent_thinker (Inspiration, 12 steps)
    → evaluator + field_validator (Isolation, 병렬 각 8 steps)
      → LLM-as-Judge tournament (Phase 3.5)
        → iterator (Iteration, 10 steps)
```
