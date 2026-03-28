---
name: creative-api-agent-roles
description: 6 에이전트 역할 정의 — 이론 기반 역할 분담 + ClawTeam 템플릿
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
- TypeScript: `modules/agents/roles/*.ts` (각 역할별 시스템 프롬프트 + 행동)
- TypeScript: `modules/agents/orchestrator.ts` (가벼운 세션용 조율)
- Python: `scripts/clawteam-server/templates/creative-session.toml` (heavy 세션용)
- Python: `modules/agents/clawteam-client.ts` (HTTP 호출)
