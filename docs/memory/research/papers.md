---
name: creative-api-papers
description: CreativeGraph AI 관련 학술 논문 17편 + 원전 참고문헌 — clone/papers/
type: reference
---

# 학술 논문 근거 (총 17편 다운로드)

## 핵심 논문 (우리 프로젝트에 직접 근거)

| # | 파일 | ID | 제목 | 핵심 연결 |
|---|------|-----|------|----------|
| 4 | 04-multi-agent-ontology-creativity.pdf | 2009.05282 | **Multi-agent + Ontology for Ideas** (Barrios 2020) | **가장 유사** — 멀티에이전트 + 아이디어 온톨로지. 우리 그래프 스키마의 주요 근거 |
| 12 | 12-ontology-co-creative-ai-systems.pdf | 2310.07472 | **Ontology of Co-Creative AI** (Lin & Riedl 2023, NeurIPS) | **온톨로지 설계** — Lubart의 creativity support tools 분류를 AI로 확장. Human-AI 역할 분담 |
| 13 | 13-triz-gpt-llm-problem-solving.pdf | 2408.05897 | **TRIZ-GPT** (Chen 2024) | **SCAMPER의 원조 TRIZ를 LLM에 적용** — 모순 분석→해결 프레임워크 |
| 16 | 16-knowledge-distance-design-ideation.pdf | 2210.10104 | **Knowledge Distance for Ideation** (Luo 2022, KBS journal) | **그래프 거리 = 창의성** — 의미적으로 먼 개념을 연결할수록 더 창의적. 우리 Graph DB 설계 핵심 근거 |
| 15 | 15-aideation-human-ai-ideation.pdf | 2502.14747 | **AIdeation** (Wang 2025, ACM CHI) | **최신(2025)** Human-AI 협업 아이디어 생성 시스템. 포매틱 연구 12명 디자이너 |

## AI 창의성 이론/평가

| # | 파일 | ID | 제목 | 핵심 |
|---|------|-----|------|------|
| 1 | 01-can-ai-be-creative-as-humans.pdf | 2401.01623 | Can AI Be as Creative as Humans? | "Relative Creativity" + "Statistical Creativity" 정의. 이론적 증명 |
| 3 | 03-steering-llm-evaluate-amplify-creativity.pdf | 2412.06060 | Steering LLMs to Evaluate Creativity (NeurIPS 2024 Spotlight) | LLM 내부 상태로 창의성 측정. Amabile 평가 근거 보강 |
| 5 | 05-ai-creative-partner-divergent-thinking.pdf | 2501.18778 | AI as Creative Partner in Divergent Thinking | Guilford 발산 사고에서 AI 역할. UI/UX 디자이너 대상 연구 |

## 멀티에이전트 / KG

| # | 파일 | ID | 제목 | 핵심 |
|---|------|-----|------|------|
| 2 | 02-llm-brainstorming-creative-thoughts.pdf | 2410.11877 | LLM Brainstorming Framework | LLM 협업 브레인스토밍 프레임워크 |
| 6 | 06-multi-agent-research-ideation.pdf | 2510.20844 | TrustResearcher: Multi-Agent Ideation | 멀티에이전트 아이디어 생성 + 투명성 |
| 7 | 07-balancing-creativity-imitation-agent-model.pdf | 1705.00107 | Balancing Creativity and Imitation (Agent-based) | Iteration의 학술 근거 — 창의성과 모방의 균형 |
| 8 | 08-extended-creativity-human-ai-framework.pdf | 2506.10249 | Extended Creativity Framework | Human-AI 창의 관계 개념적 프레임워크 |

## TRIZ / Design

| # | 파일 | ID | 제목 | 핵심 |
|---|------|-----|------|------|
| 14 | 14-triz-ragner-patent-contradiction.pdf | 2602.23656 | TRIZ-RAGNER (2026) | **최신** TRIZ + RAG + NER로 특허 모순 추출. 우리 SCAMPER 확장 근거 |
| 17 | 17-design-creativity-innovation-yannou.pdf | 1303.5061 | Design Creativity & Innovation in Companies | 기업 맥락 창의성. 실무 관점 |

## KG 구축

| # | 파일 | ID | 제목 | 핵심 |
|---|------|-----|------|------|
| 9 | 09-automated-knowledge-graph-construction.pdf | 2511.11017 | Automated Product KG Construction | AI 에이전트 기반 자동 KG 구축 패턴 |
| 10 | 10-semantic-mapping-knowledge-graph.pdf | 2511.06455 | Semantic Mapping to KG | 멀티에이전트 시맨틱 매핑 |
| 11 | 11-design-creativity-innovation-companies.pdf | 1303.5061 | (17번과 동일) | — |

## 원전 참고문헌 (수업자료 기반)

| 이론 | 원전 | 연도 |
|------|------|------|
| Guilford SI Model | Guilford, J.P. "The Nature of Human Intelligence" | 1967 |
| Amabile Componential | Amabile, T.M. "Creativity in Context" | 1996 |
| Csikszentmihalyi Systems | Csikszentmihalyi, M. "Creativity: Flow and the Psychology" | 1996 |
| Geneplore Model | Finke, R.A., Ward, T.B., Smith, S.M. "Creative Cognition" | 1992 |
| SCAMPER | Eberle, B. "SCAMPER: Games for Imagination Development" | 1996 |
| Hero's Journey | Campbell, J. "The Hero with a Thousand Faces" | 1949 |
| Brainstorming | Osborn, A.F. "Applied Imagination" | 1953 |
| 4P's of Creativity | Rhodes, M. "An Analysis of Creativity" | 1961 |
| TRIZ | Altshuller, G. "The Innovation Algorithm" | 1999 |
| Creativity Support Tools | Lubart, T. "How can computers be partners in the creative process" | 2005 |
| Knowledge Distance | Luo, J. et al. "Guiding Design Ideation by Knowledge Distance" (KBS) | 2021 |

## 논문에서 우리 스키마에 직접 반영된 것

### Barrios (2020) → 그래프 엣지 설계
- **semantic relations**: CONTRADICTS, SUPPORTS, SIMILAR_TO, ALTERNATIVE_TO
- **composition**: PART_OF, GENERALIZES, SPECIALIZES

### Lin & Riedl (2023) → 에이전트 역할 온톨로지
- Lubart's 4 categories 확장: nanny(관리), coach(가이드), pen-pal(협업), colleague(동료)
- 우리의 6 에이전트 역할이 이 분류에 매핑됨

### Luo (2022) → Graph 거리 = 창의성
- **Knowledge Distance 가설**: 의미적으로 먼 개념을 연결할수록 더 창의적
- 우리 Graph DB에서 이걸 측정 가능: SIMILAR_TO 엣지의 부재 = 높은 거리 = 높은 창의성
- **향후 구현**: Graph 기반 novelty score = 가장 가까운 기존 아이디어까지의 최단 경로 길이

### TRIZ-GPT (2024) → SCAMPER 강화
- TRIZ의 39 파라미터 + 40 발명 원리를 LLM으로 자동화
- SCAMPER 7기법은 TRIZ의 단순화 버전 — 향후 TRIZ 39원리로 확장 가능

## 2025-2026 최신 핵심 논문 (추가)

| # | 파일 | ID | 제목 | 학회 | 핵심 |
|---|------|-----|------|------|------|
| 18 | 18-kg-agent-autonomous-reasoning.pdf | 2402.11163 | **KG-Agent** | — | 자율 에이전트 + KG 추론. agent-runner.ts 설계 근거 |
| 19 | 19-kicss-2025-proceedings.pdf | 2512.20628 | **KICSS 2025 Proceedings** | KICSS 2025 | 창의성 지원 시스템 학회 논문집 |
| 20 | 20-kg-rag-knowledge-creativity.pdf | 2405.12035 | **KG-RAG: Knowledge & Creativity** | — | KG+RAG로 사실성/창의성 균형 |
| 21 | 21-visual-graph-creative-writing.pdf | 2507.08260 | **Visual Graph Creative Writing** | — | 노드 기반 비주얼 UI → 3D 그래프 근거 |
| 22 | 22-cross-domain-creativity.pdf | 2206.01328 | **Cross-Domain Retrieval** | — | 다른 도메인 노출 → 창의성 향상 |
| 23 | 23-triz-agents.pdf | 2506.18783 | **TRIZ Agents** | ICAART 2025 | **멀티에이전트 + TRIZ. 가장 유사한 경쟁자** |
| 24 | 24-agent-ideate.pdf | 2507.01717 | **Agent Ideate** | IJCAI 2025 | 에이전트 특허→아이디어 생성 |
| 25 | 25-multi-agent-ideation.pdf | 2507.08350 | **Multi-Agent Ideation** | SIGDIAL 2025 | 에이전트 수/역할/대화 깊이 최적 설계 |

## 경쟁/유사 시스템 차별화

| 논문 | 그들 | 우리 차별점 |
|------|------|-----------|
| TRIZ Agents (ICAART 2025) | TRIZ 40원리 단일 문제 | **5이론 통합 + Graph DB 영구 축적 + 4I's** |
| Agent Ideate (IJCAI 2025) | 특허→아이디어 단방향 | **양방향 Graph + iteration chain 진화** |
| KG-Agent (2024) | QA 목적 KG 추론 | **창의성 목적 KG 생성+탐색+진화** |
| Barrios (2020) | 규칙 기반 멀티에이전트 | **LLM 자율 에이전트 + tool calling** |
| KG-RAG (2024) | RAG로 사실성 보장 | **RAG + 창의성 이론 프레임워크** |

총 25편 다운로드. clone/papers/ 위치.
