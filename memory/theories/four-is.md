---
name: theory-four-is
description: 4I's (Immersion/Inspiration/Isolation/Iteration) → 워크플로우 4단계 매핑
type: project
---

# The Four "I"s (슬라이드 10-16)

## 이론 요약
아이디어 발상의 4단계 순환:

1. **Immersion** (몰입): 리서치에 깊이 몰입. 관련 자료로 둘러싸기.
   - "매일 지나다보면 잠재의식에 스며든다"

2. **Inspiration** (영감): 예상치 못한 순간에 찾아옴. 기록 필수.
   - "가장 쉽지만 가장 마스터하기 어려움"

3. **Isolation** (격리): Immersion의 반대. 모든 것에서 벗어나기.
   - "명상과 비슷. 억지로 하지 말 것."

4. **Iteration** (반복): 기존 것의 변주. 복사가 아닌 보편적 테마 찾기.
   - 수업 예시: Raimondi(1515) → Manet(1863) → Picasso(1961) → Deandrea(1982) → YSL 광고
   - BAYC NFT도 영화 혹성탈출의 iteration

## 코드 매핑
- `modules/creativity/pipeline/four-is.ts` — 메인 워크플로우
- `FourIsPhase` 타입: 'immersion' | 'inspiration' | 'isolation' | 'iteration'

### Phase → Agent 매핑
| Phase | 에이전트 | 행동 |
|-------|---------|------|
| Immersion | researcher | Graph DB 검색 + 웹 리서치 |
| Inspiration | divergent-thinker | SCAMPER + 브레인스토밍으로 대량 생성 |
| Isolation | evaluator | 독립 평가 (다른 에이전트 결과 안 봄) |
| Iteration | iterator | Graph DB에서 과거 아이디어 찾아 변주 |

- `creative-director` role → 4단계 조율, 최종 큐레이션
- `field-validator` role → 전 단계에서 시장 검증 (Csikszentmihalyi Field)
