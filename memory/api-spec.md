---
name: cgb-spec
description: CreativeGraph AI API 스펙 — v1 비즈니스 API (33 routes, 인증+rate limit+표준응답)
type: project
---

# API Endpoints (33 routes, 2026-03-24)

## v1 비즈니스 API (인증 필수, rate limit, 표준 응답)

### Creative Engine
| Method | Path | Tier | 설명 |
|--------|------|------|------|
| POST | `/api/v1/creative/session` | free+ | 4I's 파이프라인 (light/heavy) |
| POST | `/api/v1/creative/brainstorm` | free+ | 발산→수렴 사이클 |
| POST | `/api/v1/creative/evaluate` | free+ | 6차원 평가 |
| POST | `/api/v1/creative/iterate` | free+ | SCAMPER 변주 |

### Graph
| Method | Path | Tier | 설명 |
|--------|------|------|------|
| GET/POST | `/api/v1/graph/nodes` | GET: free+ / POST: pro+ | 노드 CRUD |
| GET/POST | `/api/v1/graph/edges` | GET: free+ / POST: pro+ | 엣지 CRUD |
| GET | `/api/v1/graph/search` | free+ | 키워드 검색 + 이웃 탐색 |
| GET | `/api/v1/graph/stats` | free+ | 그래프 통계 |
| GET | `/api/v1/graph/visualize` | free+ | 3D 렌더용 데이터 |

### 키 관리
| Method | Path | Tier | 설명 |
|--------|------|------|------|
| GET | `/api/v1/keys` | 인증 필수 | 내 키 정보 조회 (해시 prefix만) |
| POST | `/api/v1/keys` | team (타 유저) | 새 키 생성 |
| POST | `/api/v1/keys/rotate` | 인증 필수 | 키 교체 (기존 폐기 + 새 키) |

### 사용량
| Method | Path | Tier | 설명 |
|--------|------|------|------|
| GET | `/api/v1/usage` | 인증 필수 | 월별 세션 사용량 + 남은 횟수 |

## System (인증 별도)
| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/health` | 없음 (public) | LLM 프로바이더, Graph 모드, Redis 상태 |
| GET | `/api/cron/reflect` | CRON_SECRET | 매일 03:00 UTC 반추 에이전트 |
| GET/POST | `/api/mcp` | 자체 Bearer 인증 | MCP Server (11도구, 개인뇌) |
| GET/POST | `/api/mcp/collective` | 자체 Bearer 인증 | MCP Server (전체뇌) |
| POST | `/api/webhooks/lemonsqueezy` | HMAC-SHA256 | 결제 이벤트 → 키 자동 발급 + 티어 변경 |

## Legacy (deprecated, Sunset: 2026-06-30)
- `/api/creative/*` → `/api/v1/creative/` 사용 권장
- `/api/graph/*` → `/api/v1/graph/` 사용 권장
- `/api/pipeline/heavy` → 삭제됨

## 응답 형식 (v1)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "tier": "pro",
    "usage": { "remaining": 47, "limit": 5 }
  }
}
```

## Rate Limit (분당)
| Tier | 한도 |
|------|------|
| free | 10/분 |
| pro | 60/분 |
| enterprise | 200/분 |
| team | 200/분 |
