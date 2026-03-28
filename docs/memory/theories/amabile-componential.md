---
name: theory-amabile-componential
description: Amabile 3요소 이론 → domain+thinking+motivation 점수 체계 매핑
type: project
---

# Amabile's Componential Theory of Creativity

## 이론 요약 (슬라이드 4)
창의성 = 3가지 요소의 교차:
1. **Domain-relevant skills**: 특정 분야의 지식, 기술, 재능
2. **Creative thinking skills**: 새로운 아이디어에 대한 개방성, 위험 감수
3. **Motivation**: 내재적 동기(즐거움) > 외재적 동기(보상, 마감)

**Key Idea:** 내재적 동기가 가장 중요. 본질적 흥미에서 나오는 창의성이 진짜.

## 코드 매핑
- `modules/creativity/theories/amabile.ts`
- `IdeaScores` 타입 (types/creativity.ts):
  - `domainRelevance` (0-100): Graph DB에서 관련 도메인 노드 수/깊이로 측정
  - `creativeThinking` (0-100): 기존 아이디어와의 거리(novelty)로 측정
  - `motivation` (0-100): 실현 가능성/시장성으로 측정
- 가중 평균: domain 0.3 + thinking 0.5 + motivation 0.2

## 에이전트 역할
- `evaluator` role → Amabile 3요소 기준으로 아이디어 평가
- `field-validator` role → 도메인 적합성 검증
