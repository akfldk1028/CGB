---
name: theory-guilford-si
description: Guilford SI 모델 → divergent/convergent 에이전트 행동 매핑
type: project
---

# Guilford's Structure of Intellect (SI) Model

## 이론 요약 (슬라이드 3)
6가지 인지 작업 중 **발산적 생산(Divergent Production)**이 창의성의 핵심.
- 발산적 사고: 하나의 문제에서 다양한 해결책 생성 (양 > 질)
- 수렴적 사고: 하나의 정답을 찾는 사고 (기존 문제해결)

**Key Idea:** 창의성을 높이려면 발산적 사고를 연습해야 함. 처음엔 양, 나중에 질.

## 코드 매핑
- `modules/creativity/theories/guilford.ts`
- `DivergentAgent` → 주제에서 N개 아이디어 독립 생성 (비판 없이)
- `ConvergentAgent` → 생성된 아이디어를 기준에 따라 선별/순위
- `modules/creativity/pipeline/diverge-converge.ts` → 발산→수렴 사이클 오케스트레이션

## 에이전트 역할
- `divergent-thinker` role → Guilford 발산 담당
- `evaluator` role → Guilford 수렴 담당
