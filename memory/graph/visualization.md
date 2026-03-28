---
name: cgb-visualization
description: 3D 그래프 시각화 설계 — react-force-graph-3d, 색상/효과/인터랙션
type: project
---

# 3D 그래프 시각화

## 라이브러리
- `react-force-graph-3d` (Three.js/WebGL)
- `'use client'` + `next/dynamic({ ssr: false })`
- `UnrealBloomPass` 네온 글로우 후처리

## 노드 스타일 (config/graph-styles.ts)
| 타입 | 색상 | 크기 | 글로우 |
|------|------|------|--------|
| Idea | #FFD700 금색 | 8 | 1.5 강 |
| Concept | #4FC3F7 하늘 | 5 | 1.0 중 |
| Domain | #66BB6A 초록 | 4 | 0.6 약 |
| Output | #AB47BC 보라 | 12 | 2.0 최강+펄스 |
| Session | #EF5350 빨강 | 6 | 1.0 중 |

## 인터랙션
- hover → 연결 노드만 하이라이트, 나머지 dim
- click → 카메라 줌인 + 사이드 패널
- 초기 → 자동 회전 (orbit)
- 검색 → 노드 찾기 → 카메라 이동

## 배경: #050510 (거의 검정)
