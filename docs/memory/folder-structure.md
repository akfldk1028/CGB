---
name: creative-api-folder-structure
description: CreativeGraph AI 폴더 구조 설명 — 왜 이렇게 나눴는지
type: project
---

# 폴더 구조 설계 원칙

## 4계층 모듈 아키텍처
1. **app/** — 라우팅만. 얇은 레이어. request 파싱 + modules 호출 + response.
2. **modules/** — 비즈니스 로직 전부. 이론, 기법, 파이프라인, 에이전트, 결제.
3. **components/** — UI만. 그래프, 랜딩, 세션, 대시보드.
4. **config/** + **types/** — 설정과 타입 정의.

## modules/ 내부 구조
- `creativity/theories/` — 이론 5개 각각 독립 파일
- `creativity/techniques/` — SCAMPER, brainstorming, role-storming, mind-mapping
- `creativity/pipeline/` — 4I's, diverge-converge 오케스트레이션
- `creativity/prompts/` — LLM 프롬프트 템플릿 (이론별 분리)
- `graph/` — Memgraph 드라이버 + Cypher 쿼리 + 변환
- `agents/` — 6 역할 + orchestrator + ClawTeam 클라이언트
- `payment/` — 결제 티어 + LemonSqueezy

## 왜 이렇게?
- **API route에 로직 넣지 않음** → 테스트, 재사용, ClawTeam 연동이 쉬움
- **이론/기법/파이프라인 분리** → 새 이론 추가 시 theories/에 파일 하나만 추가
- **prompts/ 분리** → 프롬프트 엔지니어링을 독립적으로 반복 가능
