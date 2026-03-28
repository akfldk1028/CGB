---
name: theory-geneplore
description: Geneplore 모델 → generate+explore 2단계 파이프라인 매핑
type: project
---

# Geneplore Model (Finke, Ward, Smith)

## 이론 요약 (슬라이드 6)
창의성 = 2단계 프로세스:
1. **Generative phase**: 아이디어, 이미지, 개념의 정신적 표상 대량 생성 (날 것 OK)
2. **Exploratory phase**: 생성된 표상을 정제, 발전시켜 실현 가능한 아이디어로

**Key Idea:** 처음엔 질이 낮아도 다양하게 생성. "흥미로운" 것이 나오면 그걸 파고들어 발전.

## 코드 매핑
- `modules/creativity/theories/geneplore.ts`
- Generative → `divergentGenerate()` (raw 아이디어 대량)
- Exploratory → `exploratoryRefine()` (선별 + SCAMPER 적용 + 구체화)
- `modules/creativity/pipeline/session-runner.ts`에서 2단계 순차 실행

## 에이전트 역할
- `divergent-thinker` role → Generative phase
- `iterator` role → Exploratory phase (기존 아이디어 변주/발전)
