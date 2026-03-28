---
name: creative-api-mcp-server
description: MCP Server 구현 현황 — 도구 11종 외부 노출, BizScope 패턴 재사용
type: project
---

# MCP Server (2026-03-24 구현)

## 구조
```
src/mcp/
├── server.ts         — JSON-RPC 2.0 (initialize, tools/list, tools/call, ping)
├── tools.ts          — 에이전트 도구 11종 → MCP tool 스키마 래핑
├── transport-sse.ts  — SSE transport (CREATIVEGRAPH_API_KEY 인증)
└── index.ts          — barrel export

src/app/api/mcp/route.ts — GET: SSE / POST: JSON-RPC
```

## 노출 도구 11종
graph_search, graph_query, graph_add_node, graph_add_edge, web_search,
brainstorm, scamper_transform, evaluate_idea, extract_keywords,
measure_novelty, triz_principle

## 연결 방법
```json
{ "mcpServers": { "creativegraph": { "url": "http://localhost:3001/api/mcp" } } }
```

## 완료 (2026-03-24)
- [x] 개인뇌/전체뇌 분리 엔드포인트 (/api/mcp, /api/mcp/collective)
- [x] 티어별 도구 접근 제한 (Free 3도구 / Pro 11도구 / Team collective 접근)
- [x] auth.ts + tiers.ts 인증 레이어

## TODO
- [ ] LemonSqueezy API Key 연동 (현재는 단일 마스터키 방식)
- [ ] 이벤트 트리거 (새 노드 추가 시 자동 novelty 계산)

**Why:** BizScope의 검증된 MCP 패턴 그대로 복사. 외부 의존성 0.
