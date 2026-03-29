---
name: ccg-comparison
description: create-context-graph (Neo4j Labs) vs CGB 비교 — 빼올 패턴 5개, CGB 우위 7개
type: reference
---

# create-context-graph (CCG) vs CGB (2026-03-29)

## CCG란?
Neo4j Labs 공식 프로젝트. Python CLI로 Neo4j 기반 context graph 앱을 즉시 scaffolding.
22개 산업 도메인 + 8개 에이전트 프레임워크 지원. 900+ tests.
GitHub: neo4j-labs/create-context-graph
로컬: D:\Data\28_WMCP\clone\create-context-graph

## 빼올 것 (우선순위)
1. **YAML 온톨로지**: _base.yaml + 도메인 상속. CGB 스키마를 creativity.yaml로 전환하면 확장성 대폭 향상
2. **Reasoning Trace**: DecisionTrace→TraceStep 체인. 에이전트 사고과정 감사/재현 가능
3. **GDS 알고리즘**: Louvain(아이디어 클러스터), PageRank(핵심 Concept), FastRP+KNN(벡터 유사도)
4. **SSE CypherResultCollector**: 도구 실행→그래프 변화 실시간 프론트 전송
5. **합성 데이터 파이프라인**: entity seed→relationship weave→document gen→trace

## CGB 우위
1. 학술 이론 기반 (5개 창의성 이론)
2. 3카테고리 엣지 분류
3. BFS Novelty (그래프 거리=창의성)
4. Agent-as-Node + GENERATED_BY
5. 5 Brain Views
6. 아이디어 성숙도
7. Zero-dependency (In-memory)
