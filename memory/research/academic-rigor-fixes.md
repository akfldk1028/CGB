---
name: cgb-academic-rigor-fixes
description: 2차 검토에서 발견된 학술적 정확성 이슈 5개 수정 내역 (2026-03-23)
type: project
---

# 학술적 정확성 수정 (2차 검토 결과)

## 수정 완료 5건

### 1. Amabile motivation 프롬프트 — "feasible" → "intrinsically interesting"
- **파일**: `prompts/convergent.ts`
- **문제**: motivation을 "실현가능성"으로 물었는데, Amabile가 말한 건 "내재적 동기(순수한 흥미)"
- **수정**: "How intrinsically interesting and compelling..." + "intrinsic > extrinsic" 명시
- **근거**: Amabile (1996) Key Idea: "Intrinsic motivation enhances creativity more than extrinsic"

### 2. Iteration 파이프라인 — buildIterationPrompt 연결
- **파일**: `pipeline/four-is.ts`
- **문제**: Phase 4에서 SCAMPER만 호출, "universal themes" 기반 의미적 변주 누락
- **수정**: 2단계 Iteration (Step A: 의미적 변주 via buildIterationPrompt, Step B: 구조적 SCAMPER)
- **근거**: 슬라이드 14 "Iteration is NOT copying — find universal themes"

### 3. Csikszentmihalyi Individual — 항상 통과 → 품질 기반 점수
- **파일**: `theories/csikszentmihalyi.ts`
- **문제**: "에이전트가 만들었으면 OK" = Individual 검증 생략
- **수정**: `estimateIndividualScore()` 추가 (구체성, 논리성, 완성도 기반)
- **근거**: Csikszentmihalyi (1996) Individual = "개인의 재능, 기술, 지식"

### 4. 의미 엣지 타입 — 온톨로지 강화
- **파일**: `types/graph.ts`, `config/graph-styles.ts`
- **문제**: 아이디어 간 "반대/인과/부분-전체" 같은 의미 관계 없음
- **수정**: 6종 추가 — CONTRADICTS, CAUSES, PART_OF, SIMILAR_TO, GENERALIZES, SPECIALIZES
- **근거**: Barrios et al. (2020) arxiv:2009.05282 — 온톨로지로 아이디어 의미 구조 정형화

### 5. Guilford SI 6가지 인지 작업 — 학술 주석 추가
- **파일**: `theories/guilford.ts`
- **문제**: 6가지 중 2개(divergent/convergent)만 구현, 나머지 매핑 설명 없음
- **수정**: 모듈 헤더에 6가지 전부 나열 + 각각 어떻게 구현/대체했는지 주석
- **근거**: Guilford (1967) SI Model 원전

## 논문에서 활용할 때 주의
- Isolation 재해석은 반드시 "Computational reinterpretation" 섹션에서 명시
- Amabile 가중치(0.3/0.5/0.2)는 경험적 선택 — 논문에서 "tunable parameter" 언급 필요
- Individual 점수의 텍스트 길이 기반 추정은 heuristic — 향후 임베딩 기반 개선 가능
