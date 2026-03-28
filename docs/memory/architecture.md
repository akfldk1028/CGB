---
name: creative-api-architecture
description: CreativeGraph AI 아키텍처 — 보안 하드닝 완료, dual-mode Graph, 4-tier 인증
type: project
---

# 아키텍처 (2026-03-25 업데이트)

## 인증 흐름 (보안 하드닝 적용)
```
요청 → middleware.ts
  1. 외부 x-user-id/x-user-tier 헤더 삭제 (스푸핑 차단)
  2. CREATIVEGRAPH_API_KEY 미설정 → free 티어 (개발용, 이전엔 pro였음)
  3. 마스터 키 → team 티어 즉시 통과
  4. cg_live_ 키 → route handler에서 Redis 해시 검증
→ route handler (authenticateRequest)
→ modules/ 비즈니스 로직
```

## Cypher Injection 방지
- `modules/graph/safe-cypher.ts` — `safeLabel()`, `safeRelType()`, `isReadOnlyCypher()`, `clampInt()`
- 모든 Cypher label/rel type은 whitelist 검증 후 interpolation
- `graph_query` 도구는 read-only만 허용 (write 키워드 차단)

## Graph: Dual-mode
- `NEO4J_URI` 있으면 Memgraph Bolt, 없으면 in-memory + file persistence
- `getRunQuery()` lazy async getter (cold start race condition 해결)
- In-memory store: 10K nodes / 30K edges 상한, 10% eviction
- File persistence: Vercel에서 `/tmp`, 로컬에서 `data/`

## MCP Server
- 티어 기반 도구 필터링: `tools/list`에서 허용 도구만 반환, `tools/call`에서 `isToolAllowed()` 체크
- Free: graph_search, brainstorm, evaluate_idea만
- Pro: 전체 11종

## API 키 시스템
- LemonSqueezy webhook → `cg_live_` + 32바이트 base64url (51자)
- SHA-256 해시만 Upstash Redis 저장, `/api/v1/keys/rotate`로 교체
- 티어: free (5회/월, 10/분) → pro (무제한, 60/분) → team (200/분) → enterprise (200/분, 최고 권한)

## LLM
- AI SDK 3프로바이더: Google (기본 gemini-2.5-flash), Anthropic, OpenAI
- `llmGenerateJSON`: balanced brace 추출 + trailing comma 정리 + 3-strategy fallback
- `convergentSelect`: maxTokens 8192, index bounds 검증, 파싱 실패 시 graceful fallback

## 핵심 lib
- `lib/redis.ts` — Upstash Redis dual-mode
- `lib/api-keys.ts` — 키 CRUD
- `lib/api-auth.ts` — 인증 + tierAtLeast (free < pro < team < enterprise)
- `lib/rate-limit.ts` — 티어별 sliding window
- `modules/graph/safe-cypher.ts` — Cypher injection 방지
