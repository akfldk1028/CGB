---
name: cgb-security-hardening
description: CreativeGraph AI 보안 하드닝 내역 — 6 critical + 8 warning 수정 (2026-03-25)
type: project
---

# 보안 하드닝 (2026-03-25)

커밋 `dea1209` — 3명의 코드 리뷰어가 발견한 이슈 전부 수정.

## CRITICAL 6건 (수정 완료)
1. **Cypher injection** — service.ts 6곳 + graph-tools.ts 4곳에서 `${type}` 직접 삽입 → `safeLabel()`/`safeRelType()` whitelist
2. **graph_query raw Cypher** — LLM이 생성한 임의 Cypher 실행 가능 → `isReadOnlyCypher()` 체크
3. **Auth 헤더 스푸핑** — 외부에서 `x-user-id` 주입 가능 → `stripInternalHeaders()` 선처리
4. **Open mode = pro 권한** — env 빠지면 모든 요청이 pro → **free**로 변경
5. **MCP 도구 티어 미검증** — `tools/call`에 `isToolAllowed()` 추가
6. **Cron 무인증** — `CRON_SECRET` 미설정 시 401 반환

## WARNING 5건 (수정 완료)
- `runQuery` race condition → lazy async `getRunQuery()`
- In-memory store 무한 성장 → 10K/30K 상한 + 10% eviction
- Vercel read-only fs → `/tmp` 경로
- `/api/health` 정보 노출 → team 티어만 상세
- Query params 미제한 → limit(1~500), hops(1~5), maxNodes(1~500) 클램핑

## 핵심 파일
- `modules/graph/safe-cypher.ts` — 신규 (validation 유틸리티)
- `middleware.ts` — 헤더 스트리핑 + cron 강화 + free 기본
- `mcp/server.ts` — 티어 enforce
- `mcp/auth.ts` — free 기본

**Why:** Memgraph 연결 전 사전 방어. 프로덕션 배포 전 필수.
**How to apply:** 새 Cypher 쿼리 추가 시 반드시 `safeLabel()`/`safeRelType()` 사용.
