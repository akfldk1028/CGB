---
name: creative-api-deployment
description: CreativeGraph AI 배포 정보 — 33 routes, Upstash Redis 연결 완료, 환경변수 전체
type: project
---

# 배포 정보 (2026-03-24)

## 웹앱 (Vercel)
- 프로젝트: `projects/creative-api/`
- dev: `pnpm --filter @wmcp/creative-api dev` → localhost:3001
- Vercel URL: (아직 미배포)
- **33 routes** (v1 13개 + legacy 10개 + system 5개 + pages 5개)
- **테스트 완료**: 키 생성 → Redis 저장 → 키로 API 호출 → 키 정보 조회 → 사용량 조회 전부 통과

## Upstash Redis (creativegraph 전용 DB)
- DB 이름: **creativegraph** (modest-worm)
- 계정: 새 계정 (BizScope와 별도)
- 리전: GCP Asia-Northeast1 (Tokyo)
- 플랜: Free (256MB, 500k commands/month)
- Endpoint: `modest-worm-38961.upstash.io`

## Google Cloud VM
- VM: creative-graph, asia-northeast3-a, e2-medium
- Memgraph: 7687 (Bolt), ClawTeam: 8000 (HTTP)

## 환경변수 (.env.local 설정 완료)

### LLM (설정 완료 ✅)
- `GOOGLE_GENERATIVE_AI_API_KEY` ✅
- `OPENAI_API_KEY` ✅
- `ANTHROPIC_API_KEY` — 미설정 (선택)
- `CREATIVE_MODEL` — 미설정 (기본: google/gemini-2.5-flash)

### Redis (설정 완료 ✅)
- `UPSTASH_REDIS_REST_URL` ✅ (modest-worm-38961.upstash.io)
- `UPSTASH_REDIS_REST_TOKEN` ✅

### API 인증
- `CREATIVEGRAPH_API_KEY` — 미설정 (open mode = 개발용, 배포 시 필수)

### Graph DB (선택)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` — 미설정 (in-memory + JSON 폴백)

### 웹 검색 (선택)
- `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` — 미설정

### 결제 (배포 시)
- `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_PRO_VARIANT_ID`, `LEMONSQUEEZY_ENTERPRISE_VARIANT_ID`

### Cron
- `CRON_SECRET`
