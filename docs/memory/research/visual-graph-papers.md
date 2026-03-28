---
name: visual-graph-papers
description: 이미지→Graph DB 관련 논문 — Scene Graph, Multimodal KG, VLM+Graph, 창의성+이미지 (2024-2026)
type: project
---

# 이미지 → Graph DB 논문 리서치 (2026-03-25)

## Tier 1: 직접 적용 가능

### Visual Generation Unlocks Human-Like Reasoning (Wu 2026)
- **ID**: `2601.19834` | 2026-01 | cs.AI
- **핵심**: 인간은 내부 world model로 추론. VLM이 이미지 속 개념을 조작해서 추론 — 텍스트만으론 부족
- **적용**: 에이전트가 이미지를 보고 시각적 개념을 Graph 노드로 변환. cross-domain 시각 유추 → 높은 Knowledge Distance
- **URL**: https://arxiv.org/abs/2601.19834

### AI Agent-Driven KG Construction (Peshevski 2025)
- **ID**: `2511.11017` | 2025-11 | cs.AI | GOBLIN Workshop
- **핵심**: AI 에이전트가 비정형 데이터(텍스트+이미지)에서 자동으로 Knowledge Graph 구축. 멀티 에이전트 파이프라인
- **적용**: 우리 구조와 거의 동일. 에이전트가 이미지 분석 → 개념 추출 → Graph 저장
- **URL**: https://arxiv.org/abs/2511.11017

### KG-Agent (Jiang 2024)
- **ID**: `2402.11163` | 2024-02 | cs.CL
- **핵심**: LLM 기반 자율 에이전트가 KG 위에서 multi-hop 추론. toolbox + executor + knowledge memory
- **적용**: 우리 agent-runner.ts 구조와 유사. 이미지 도구 추가로 확장 가능
- **URL**: https://arxiv.org/abs/2402.11163

### Enhancing VLM with Scene Graphs (Lohner 2024)
- **ID**: `2407.05910` | 2024-07 | cs.CV | Best Paper Runner-up IAVVC 2024
- **핵심**: VLM + Scene Graph 결합 — 이미지를 그래프로 변환 → VLM 추론 정확도 향상
- **적용**: 이미지 → Scene Graph → 우리 온톨로지의 Concept/Idea 노드로 매핑
- **URL**: https://arxiv.org/abs/2407.05910

## Tier 2: Scene Graph 방법론

### Triplet-Aware Scene Graph Embeddings (Schroeder 2019)
- **ID**: `1909.09256` | cs.CV
- **핵심**: 이미지 → (subject, predicate, object) 트리플릿 → 그래프 임베딩
- **적용**: 이미지 속 객체 관계를 우리 엣지 타입으로 매핑

### Unbiased Scene Graph Generation (Tang 2020)
- **ID**: `2002.11949` | cs.CV
- **핵심**: SGG 데이터 편향 해결 — "on/at" 대신 다양한 관계 예측
- **적용**: 에이전트가 이미지에서 풍부한 관계 추출하게 할 때 참고

### Informative SGG via Debiasing (Gao 2023)
- **ID**: `2308.05286` | cs.CV
- **핵심**: 흔한 관계 편향 극복 → 풍부한 scene graph 생성

### Bird's-Eye-View Scene Graph (Liu 2023)
- **ID**: `2308.04758` | cs.CV
- **핵심**: 3D 공간 scene graph — 우리 3D 그래프 시각화와 연결 가능

### Panoptic Video Scene Graph (Yang 2023)
- **ID**: `2311.17058` | cs.CV
- **핵심**: 비디오 → scene graph (시간 관계 포함)

## Tier 3: 멀티모달 + 창의성

### XAI4Wind: Multimodal KG Database (Chatterjee 2020)
- **ID**: `2012.10489` | cs.AI
- **핵심**: 센서 + 이미지 + 텍스트 → 하나의 Multimodal Knowledge Graph Database
- **적용**: 멀티모달 노드 설계 참고 (이미지 URL을 노드 속성으로)

### InkIdeator (Wu 2026)
- **ID**: `2601.18193` | 2026-01 | cs.HC
- **핵심**: 중국화 탐색 → 디자인 아이디에이션. 시각 영감 → 아이디어 파이프라인
- **적용**: 이미지 영감 → Idea 생성 워크플로우

### TalkSketch (Shi 2025)
- **ID**: `2511.05817` | cs.HC
- **핵심**: 스케치+음성 → 멀티모달 아이디어 생성

### Visual Graph for Creative Writing (Sood 2025)
- **ID**: `2507.08260` | cs.HC
- **핵심**: 시각적 노드 그래프 + LLM 체이닝 → 창의적 글쓰기

### Creative Image Generation with Diffusion (Song 2026)
- **ID**: `2601.22125` | cs.CV
- **핵심**: Diffusion 모델로 창의적 이미지 생성

### Can AI Be Creative? (Wang 2024)
- **ID**: `2401.01623` | cs.AI
- **핵심**: AI 창의성 평가 프레임워크 — 우리 Amabile 평가와 비교 가능

### LinkQ: LLM-Assisted KG QA (Li 2024)
- **ID**: `2406.06621` | cs.CL
- **핵심**: LLM으로 자연어 → KG 쿼리 생성. 시각적 인터페이스

### LLMs for Design Ideation (Kokate 2025)
- **ID**: `2512.00010` | cs.HC
- **핵심**: LLM 기반 디자인 아이디에이션 도구

---

## 우리 플랫폼 확장 설계

```
현재:  텍스트 ──→ VLM ──→ Idea 노드 ──→ Graph

확장:  이미지 ──→ VLM (Gemini 2.5 Flash, 이미 multimodal)
                    │
                    ├─ Scene Graph 추출 (2407.05910)
                    │   객체 → Concept 노드
                    │   관계 → SIMILAR_TO / RELATES_TO 엣지
                    │
                    ├─ Visual Inspiration (2601.18193 InkIdeator)
                    │   색상/구도/분위기 → Idea.metadata.visual
                    │   "이 이미지에서 영감" → INSPIRED_BY 엣지
                    │
                    └─ World Model 추론 (2601.19834)
                        시각 개념 조작 → 새 아이디어
                        cross-domain 시각 유추 → 높은 novelty
```

### 필요한 코드 변경
1. `schema.ts` — `visual_inspiration` GenerationMethod 추가
2. `types/graph.ts` — Idea 노드에 `imageUrl?: string` 필드
3. 새 도구 `analyze_image` — VLM으로 이미지 → 개념/관계 추출
4. `definitions.ts` — researcher에 이미지 분석 능력 추가
5. Vercel Blob — 이미지 저장 (URL을 노드에 연결)
6. Graph 시각화 — 노드에 이미지 썸네일 표시

### Gemini가 이미 multimodal → 추가 모델 불필요
`generateText({ model: google('gemini-2.5-flash'), messages: [{ role: 'user', content: [{ type: 'image', image: imageBuffer }, { type: 'text', text: 'Extract concepts...' }] }] })`

**Why:** 텍스트만으로는 창의성의 절반. 이미지 영감이 핵심 차별점.
**How to apply:** Gemini multimodal + Vercel Blob + 기존 온톨로지 확장으로 최소 변경.
