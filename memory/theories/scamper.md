---
name: theory-scamper
description: SCAMPER 7기법 → 에이전트 도구 7개 매핑
type: project
---

# SCAMPER (Bob Eberle)

## 이론 요약 (슬라이드 9)
7가지 구조적 변환 질문으로 창의적 아이디어 도출:
- **S**ubstitute: 뭘 대체할 수 있나?
- **C**ombine: 뭘 합칠 수 있나?
- **A**dapt: 다른 맥락에 어떻게 적응시키나?
- **M**odify/Magnify: 뭘 확대/축소/변형하나?
- **P**ut to other use: 완전히 다른 용도는?
- **E**liminate: 뭘 제거하면 단순해지나?
- **R**earrange/Reverse: 순서를 바꾸면?

## 코드 매핑
- `modules/creativity/techniques/scamper.ts`
- `ScamperType` 타입 (types/creativity.ts): 7가지 enum
- `scamperTransform(idea, technique)` → 원본에 technique 적용한 새 아이디어 반환
- 새 아이디어는 `SCAMPER_OF` 엣지로 원본과 연결 (Graph DB)
- `modules/creativity/prompts/scamper.ts` → 기법별 LLM 프롬프트

## 에이전트 역할
- `divergent-thinker` role → SCAMPER 7기법을 도구로 사용
