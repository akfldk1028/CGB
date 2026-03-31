---
name: Graph v2 Migration Plan
description: InMemory→Supabase pgvector 전환, Agent 최상위 노드, 3-Memory, Temporal Edge, 3중 검색 — Zep/Neo4j Agent Memory/MAGMA 근거
type: project
---

# Graph v2 Migration — CGB

## 현재 문제
1. **InMemory + /tmp JSON** — Vercel serverless에서 요청마다 날아갈 수 있음
2. **토큰 매칭 검색** — 의미적 검색 아님, 355명 규모에서 노이즈
3. **SIMILAR_TO 스파게티** — 타이틀 토큰 30% 겹침 → false positive 폭발
4. **Agent 노드 미구현** — 누가 뭘 만들었는지 추적 불가
5. **시간 관리 없음** — createdAt만, 모순 정보 처리 불가
6. **유저/에이전트별 격리 없음** — 전부 globalStore에 섞임
7. **API가 agent_id/layer/domain 안 받음** — 3-layer 격리 불가

## 수정 방향 (논문 근거)

### 근거 논문/시스템
- **Zep (2025)**: Episode>Entity>Community + 4-timestamp + cosine+BM25+BFS 3중
- **Neo4j Agent Memory**: 3-Memory (short/long/reasoning) + POLE+O 노드
- **MAGMA (2026)**: Relation Graph + Vector DB dual-stream
- **Luo 2022**: Knowledge Distance = Novelty Score
- **Csikszentmihalyi**: Individual × Domain × Field

### 1. Agent를 최상위 노드로

```
현재: Domain > Topic > Idea > Artifact
수정: Agent > Domain > Topic > Idea > Artifact
```

이유: Csikszentmihalyi의 Individual이 핵심. 355명 각각 자기 서브그래프 필요.

### 2. 노드 8종

| Level | Type | 설명 |
|-------|------|------|
| L-1 | **Agent** | 355+명, 최상위 (신규) |
| L0 | Domain | 8개 도메인 |
| L1 | Topic | 세션별 주제 |
| L2 | Idea | 핵심 단위 |
| L3 | Artifact | 산출물 (미구현→구현) |
| 보조 | Concept | 재사용 개념 |
| 보조 | Episode | 활동 세션 (Zep 패턴, 신규) |
| 보조 | DecisionTrace | 사고 과정 |

### 3. 엣지 34종 (기존 28 + 신규 6)

신규:
- Agent ──[OWNS]──→ Idea/Concept/Episode
- Agent ──[ACTIVE_IN]──→ Domain
- Agent ──[COLLABORATED_WITH]──→ Agent
- Episode ──[CONTAINS]──→ Idea
- Episode ──[FOLLOWED_BY]──→ Episode
- Idea ──[EVOLVED_INTO]──→ Idea

### 4. 3-Memory 구조

```
Agent
  ├── Short-term: Episode (활동 세션, TTL 7일)
  ├── Long-term: Concept + Idea (영구 지식)
  └── Reasoning: DecisionTrace (사고 과정)
```

### 5. Temporal Edge (Zep 4-timestamp)

```
created_at  — 시스템 입력 시점
expired_at  — 무효화 시점 (null=현재 유효)
valid_from  — 사실 시작 시점
valid_until — 사실 종료 시점
```

모순 정보 → 기존 엣지 자동 expire (삭제 아님)

### 6. 검색 3중 (Zep 패턴)

1. cosine similarity — Gemini text-embedding-004 (768차원)
2. BM25 full-text — PostgreSQL tsvector
3. BFS graph traversal — 2홉 이웃
4. RRF(Reciprocal Rank Fusion)로 합산

### 7. 영속성 — Supabase pgvector

```sql
-- MOL과 같은 Supabase 프로젝트 사용 가능
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  agent_id UUID,
  domain TEXT,
  layer INT DEFAULT 2,        -- 0=global, 1=domain, 2=agent
  type TEXT NOT NULL,          -- Agent/Domain/Topic/Idea/Artifact/Concept/Episode/DecisionTrace
  title TEXT NOT NULL,
  description TEXT,
  embedding vector(768),       -- Gemini text-embedding-004
  score FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ
);

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES graph_nodes(id),
  target_id TEXT REFERENCES graph_nodes(id),
  type TEXT NOT NULL,          -- 34종
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expired_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ
);

CREATE INDEX idx_nodes_agent ON graph_nodes(agent_id);
CREATE INDEX idx_nodes_domain ON graph_nodes(domain);
CREATE INDEX idx_nodes_layer ON graph_nodes(layer);
CREATE INDEX idx_nodes_type ON graph_nodes(type);
CREATE INDEX idx_nodes_embedding ON graph_nodes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_edges_source ON graph_edges(source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_id);
CREATE INDEX idx_edges_type ON graph_edges(type);
```

### 8. 3-Layer 격리

| Layer | 필터 | 쓰기 | 읽기 |
|-------|------|------|------|
| L2 Agent | agent_id | 모든 에이전트 | 본인만 |
| L1 Domain | domain + score>=40 | auto/trusted/full | 같은 도메인 |
| L0 Global | score>=70 + 참조3+ | full만 직접 | 전체 |

### 9. 품질 관리

- score < 40 → L2만 (개인뇌)
- score >= 40 → L1 승격 (도메인뇌)
- score >= 70 + 참조 3회+ → L0 승격 (전체뇌)
- 30일 참조 0 + score < 30 → L1에서 expire
- SIMILAR_TO: 임베딩 cosine > 0.8만 연결 (현재 토큰 매칭 → 폐기)

## 구현 순서

1. Supabase에 graph_nodes + graph_edges 테이블 생성 (pgvector)
2. CGB GraphStore 인터페이스에 Supabase 구현 추가 (SupabaseGraphStore)
3. API route에 agent_id/layer/domain 파라미터 지원
4. 검색 3중화 (cosine + BM25 + BFS → RRF)
5. SIMILAR_TO를 임베딩 기반으로 변경
6. Temporal Edge 4-timestamp 적용
7. Agent 노드 타입 활성화 + OWNS/ACTIVE_IN 엣지
8. Episode 노드 추가 (에이전트 활동 세션)
9. InMemory → Supabase 데이터 마이그레이션
10. 테스트 + Vercel 재배포

## MOL 연동 포인트

- BrainClient가 CGB API 호출할 때 agent_id/layer/domain 전달 → 자동 격리
- CGB 프로덕션: https://cgb-brain-lemon.vercel.app
- 마스터키: Vercel env CREATIVEGRAPH_API_KEY
- MOL .env.local: CGB_API_URL + CGB_API_KEY

## 참고 자료
- Zep: https://arxiv.org/abs/2501.13956
- MAGMA: https://arxiv.org/pdf/2601.03236
- Neo4j Agent Memory: https://github.com/neo4j-labs/agent-memory
- Graphiti: https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/
- Vector DB vs Graph RAG: https://machinelearningmastery.com/vector-databases-vs-graph-rag-for-agent-memory-when-to-use-which/
- Luo 2022 Knowledge Distance: Knowledge-Based Systems 218
