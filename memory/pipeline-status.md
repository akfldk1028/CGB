---
name: creative-api-pipeline-status
description: CreativeGraph AI 파이프라인 — light + heavy 둘 다 검증 완료 (2026-03-25)
type: project
---

# 파이프라인 동작 현황 (2026-03-25)

## Light Mode — 검증 완료
4단계 전부 동작, 세션당 ~100초, Gemini 2.5 Flash.

| Phase | 동작 | 산출물 |
|-------|------|--------|
| Immersion | Graph 검색 + 웹 검색(선택) | graphContext + webContext |
| Inspiration | divergentGenerate (10개) | Idea 노드 → 즉시 Graph 저장 |
| Isolation | convergentSelect (Amabile 3요소, maxTokens 8192) | 순위 + 점수 |
| Iteration | semantic iteration + SCAMPER 7기법 | 변주 아이디어 |

**실측**: 2세션 → 0→107 nodes, 0→223 edges. 세션2가 세션1 아이디어 참조 확인.

## Heavy Mode — 검증 완료 (2026-03-25)
5 에이전트 자율 실행, 세션당 ~191초.

| Agent | Steps | Nodes | Edges | Tools | Time |
|-------|-------|-------|-------|-------|------|
| researcher | 4 | 0 | 0 | extract_keywords, web_search, graph_search | 10s |
| divergent_thinker | 16 | 8 | 3 | brainstorm, graph_add_node, scamper_transform, graph_add_edge | 23s |
| evaluator | 9 | 0 | 0 | graph_search, graph_query, evaluate_idea, measure_novelty | 41s |
| field_validator | 2 | 0 | 0 | graph_search | 5s |
| iterator | 10 | 5 | 3 | measure_novelty, graph_add_node, graph_add_edge, scamper_transform | 19s |

**결과**: 130 ideas, 13 nodes + 6 edges 에이전트 자율 생성, maxDuration 300s.

## 수정 이력
- `llmGenerateJSON`: balanced brace 추출 + trailing comma 정리 + 3-strategy fallback
- `convergentSelect`: maxTokens 8192, index bounds 검증, 파싱 실패 graceful fallback
- `compareIdeas`: maxTokens 2048, 파싱 실패 시 random winner fallback
- `tournamentSelect`: 매치 수 20→10 (속도 개선)
- `multi-agent.ts`: 단계간 context 500자 truncate (context window 초과 방지)
- `session/route.ts`: maxDuration 120→300

**Why:** light가 빠른 기본 모드, heavy가 자율 에이전트 프리미엄 모드.
**How to apply:** 새 에이전트/도구 추가 시 definitions.ts에 정의 + tools/registry.ts에 매핑.
