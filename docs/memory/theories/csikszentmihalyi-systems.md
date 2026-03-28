---
name: theory-csikszentmihalyi-systems
description: Csikszentmihalyi 시스템 모델 → individual+domain+field 3자 검증 매핑
type: project
---

# Csikszentmihalyi's Systems Model of Creativity

## 이론 요약 (슬라이드 5)
창의성 = 개인 × 도메인 × 필드의 시스템적 상호작용:
- **Individual**: 개인의 재능, 기술, 지식
- **Domain**: 특정 분야의 규칙, 상징, 관습 (예: 미술, 과학, 음악)
- **Field**: 문지기들 — 아이디어가 창의적인지 판단하는 전문가/동료

**Key Idea:** 창의성은 개인만의 것이 아님. 사회, 문화, 환경과의 상호작용에서 나옴. "필드"의 인정이 있어야 진짜 창의적.

## 코드 매핑
- `modules/creativity/theories/csikszentmihalyi.ts`
- **Individual** → 생성 에이전트 (divergent-thinker)
- **Domain** → Graph DB의 도메인 지식 노드 (Concept, Domain 타입)
- **Field** → `field-validator` 에이전트 (시장성, 기존 작품 대비, 전문가 시선)

## 에이전트 역할
- `field-validator` role → Csikszentmihalyi의 "Field" 역할
- `researcher` role → Domain 지식 수집
