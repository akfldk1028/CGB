---
name: cgb-agent-roles
description: 6 에이전트 역할 정의 — 이론 기반 역할 분담 (gitagent v0.1.0)
type: project
---

# 에이전트 역할 (6종)

| 역할 | 이론 근거 | 4I's 단계 | 행동 |
|------|----------|----------|------|
| creative-director | 전체 조율 | 전 단계 | 4I's 파이프라인 관리, 최종 큐레이션 |
| researcher | Csikszentmihalyi Domain | Immersion | Graph DB 탐색 + 웹 리서치, 맥락 수집 |
| divergent-thinker | Guilford 발산 + SCAMPER | Inspiration | 아이디어 대량 생성, 양 > 질 |
| evaluator | Guilford 수렴 + Amabile 3요소 | Isolation | 독립 평가, 편향 없이, 점수 부여 |
| iterator | Geneplore 탐색 + 4I's Iteration | Iteration | 과거 아이디어 변주, Graph 기반 진화 |
| field-validator | Csikszentmihalyi Field | 전 단계 | 시장성/실현가능성/독창성 검증 |

## 구현 위치
- gitagent YAML: `agents/{name}/agent.yaml` + `SOUL.md` (역할 정의)
- TypeScript: `src/modules/agents/runtime/agent-runner.ts` (실행 엔진)
- TypeScript: `src/modules/agents/runtime/loader.ts` (YAML 로더, fallback: definitions.ts)
- TypeScript: `src/modules/agents/runtime/workflow-engine.ts` (DAG 실행)
- 도구: `src/modules/agents/tools/registry.ts` (12종 MCP 호환 도구)
