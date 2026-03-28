---
name: creative-api-event-driven-agent
description: 자율 에이전트 운영 아키텍처 — 이벤트 드리븐 + Cron + MCP 트리거 (구현 완료)
type: project
---

# 자율 에이전트 운영 아키텍처 (2026-03-24 구현 완료)

## 핵심 원칙
"에이전트가 24시간 도는 게 아니라, 이벤트가 에이전트를 깨운다"

**Why:** 상시 실행은 비용 폭탄. Event-Driven이 업계 표준.

## 5가지 트리거 — 구현 현황

| 트리거 | 상태 | 구현 |
|--------|------|------|
| 사용자 세션 | ✅ | POST /api/creative/session (light/heavy) |
| 그래프 이벤트 | ✅ | modules/graph/events.ts — node:created → novelty 자동 + SIMILAR_TO 자동 |
| Cron 스케줄 | ✅ | GET /api/cron/reflect — 매일 03:00 UTC (vercel.json 등록) |
| MCP 외부 호출 | ✅ | /api/mcp (SSE transport, 티어별 접근) |
| 웹훅 | ✅ | POST /api/webhooks/lemonsqueezy — 결제 → 티어 자동 변경 |

## 이벤트 버스 (modules/graph/events.ts)
```
graph_add_node() → emitNodeCreated()
  ├── handleNodeCreated() → novelty score 자동 태깅
  └── handleSuggestRelated() → SIMILAR_TO 엣지 자동 생성 (상위 3개, dedup)
```
- EventEmitter 기반, try/catch로 핸들러 에러 격리
- scheduleAutoSave()는 실제 엣지 추가 시에만 호출

## Cron 반추 에이전트 (GET /api/cron/reflect)
- Stanford Generative Agents (Park et al., UIST 2023) 패턴
- 3가지 작업: 고아 노드 → SIMILAR_TO, 교차 도메인 → INSPIRED_BY, LLM → Theme 노드 생성
- CRON_SECRET 인증

## 알려진 한계
- graph-tools ↔ events 순환 참조 — 런타임 동작하나 store 분리 권장 (추후)
- usage store가 in-memory — Upstash Redis 전환은 배포 시 필수
