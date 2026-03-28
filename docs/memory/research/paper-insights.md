---
name: creative-api-paper-insights
description: TOP 논문 전문 읽고 뽑은 핵심 인사이트 — 코드 반영 + 차별화 전략
type: project
---

# 논문 전문 분석 인사이트 (2026-03-23)

## 1. TRIZ Agents (ICAART 2025) — 가장 유사한 경쟁자

### 그들의 구조
- **Agent 역할**: Problem Definer, Contradiction Analyst, Inventive Principle Selector, Solution Generator, Solution Evaluator
- **TRIZ 프로세스**: 문제 정의 → 모순 분석 → 발명 원리 선택 → 솔루션 생성 → 평가
- **도구**: TRIZ Contradiction Matrix, 40 Inventive Principles
- **단일 케이스 스터디** (엔지니어링 문제)

### 우리와의 핵심 차이 (차별화 포인트)
| TRIZ Agents | CreativeGraph AI |
|------------|-----------------|
| TRIZ 단일 이론 | **5 이론 통합** (Guilford+Amabile+Csikszentmihalyi+Geneplore+SCAMPER) |
| 단발성 솔루션 | **Graph DB에 영구 축적** → 쓸수록 더 창의적 |
| 엔지니어링 문제 해결 | **범용 창의성** (사업, 예술, 연구 등 모든 도메인) |
| 파이프라인 고정 | **4I's 유연 워크플로우** + 에이전트 자율 판단 |
| 단일 세션 | **iteration chain** — 아이디어가 세대를 걸쳐 진화 |
| 결과물만 출력 | **3D 그래프 시각화** — 아이디어 네트워크를 보여줌 |

### 논문에서 우리가 배울 것
- TRIZ의 39 Engineering Parameters + 40 Inventive Principles를 추가 도구로 넣으면 강화됨
- "Contradiction Analysis" 개념 → 우리 CONTRADICTS 엣지와 연결
- Solution Evaluator agent의 평가 기준 → 우리 Amabile 3요소 + Csikszentmihalyi Field로 더 이론적

## 2. Agent Ideate (IJCAI 2025) — 에이전트 아이디어 생성

### 그들의 구조 (전문 분석 완료)
5 에이전트:
1. **Patent Analyst** — 특허 요약
2. **Keyword Extractor** — 핵심 키워드 2개 추출
3. **Researcher** — DuckDuckGo 웹 검색 (이것이 핵심!)
4. **Idea Generator** — 특허+검색 결과 → 비즈니스 아이디어
5. **Business Validator** — 형식/독창성 검증

### 핵심 발견
- **Agent with Tool (검색 도구 있음) vs Agent without Tool**: CS 도메인에서 86% vs 14% 승률!
- **결론: 웹 검색 도구가 창의성을 극적으로 높임** → 우리 web_search 도구 설계가 옳았음
- **그러나**: NLP 도메인에서는 Tool 없이가 오히려 나음 (88% vs 12%) → 도메인별 도구 전략 필요
- **평가 기준 6가지**: Technical Validity, Innovativeness, Specificity, Need Validation, Market Size, Competitive Advantage

### 우리에게 적용할 것
1. **Keyword Extractor 에이전트 추가 필요** — 주제에서 핵심 키워드 뽑아서 검색 정확도 높이기
2. **평가 기준 확장**: Amabile 3요소에 + Specificity + Competitive Advantage 추가
3. **도메인별 도구 전략**: 기술 도메인 → 웹검색 강화, 창의 도메인 → 내부 Graph 우선
4. **LLM-as-Judge 평가**: 우리도 자동 비교 평가 파이프라인 필요

## 3. Lin & Riedl Co-Creative AI Ontology (NeurIPS 2023)

### Lubart's 4 카테고리 + 3 확장
**원래 (Lubart 2005)**:
- Computer-as-nanny: 관리/조직
- Computer-as-pen-pal: 대화/피드백
- Computer-as-coach: 가이드/멘토링
- Computer-as-colleague: 동등한 협업

**Lin & Riedl 확장 (2023)**:
- Computer-as-**subcontractor**: AI가 하위 작업 자동 수행 ← 우리 researcher 에이전트
- Computer-as-**critic**: AI가 평가/비판 ← 우리 evaluator + field_validator
- Computer-as-**teammate**: AI가 동등하게 참여 ← 우리 divergent_thinker + iterator

### 우리 에이전트 역할 매핑
| 에이전트 | Lubart/Lin 분류 |
|---------|----------------|
| creative_director | coach (가이드) |
| researcher | subcontractor (하위 작업 수행) |
| divergent_thinker | teammate (동등 협업) |
| evaluator | critic (비판적 평가) |
| iterator | teammate (동등 협업) |
| field_validator | critic (비판적 평가) |

## 4. Knowledge Distance (KBS 2022) — Graph 거리 = 창의성

### 핵심 가설
"의미적으로 먼 분야의 자극이 더 창의적인 아이디어를 촉발한다"

### 구현 아이디어
- **Novelty Score** = Graph에서 가장 가까운 기존 아이디어까지의 최단 경로 길이
- 경로 길이 1 (직접 연결) = 낮은 창의성 (파생)
- 경로 길이 3+ (먼 연결) = 높은 창의성 (교차 도메인)
- **Iteration 전략**: Graph에서 가장 먼 도메인의 아이디어를 찾아서 교차 적용

## 코드에 반영해야 할 TODO (2026-03-24 전부 완료)
1. [x] `keyword-extractor` 에이전트/도구 추가 — 도구 파일 + researcher/divergent/field 프롬프트에 워크플로우 명시
2. [x] 평가 기준에 Specificity + Competitive Advantage 추가 — evaluate-tool 6차원 + evaluator 프롬프트 동기화
3. [x] Graph 거리 기반 novelty score 함수 — novelty-tool + queries/novelty.ts BFS 구현
4. [x] 도메인별 도구 전략 분기 — registry TECH/CREATIVE_DOMAINS + runAgent()에 domain 파라미터 연결
5. [x] TRIZ 40 Inventive Principles를 선택적 도구로 추가 — triz-tool 40원리 + divergent/iterator 프롬프트 유도
6. [x] LLM-as-Judge 자동 비교 평가 파이프라인 — evaluation/judge.ts + multi-agent Phase 3.5에 tournamentSelect 통합
