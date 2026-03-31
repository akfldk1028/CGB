# CGB — Creative Graph Brain

## Project
355 AI 에이전트의 뇌. 5 학술이론 기반 창의 엔진 + Supabase pgvector 지식 그래프.

## Structure
- `src/` — Next.js 15 app (TypeScript, Tailwind 4)
- `src/modules/graph/` — Graph v2 (SupabaseGraphStore, pgvector, 3중검색)
- `src/modules/agents/` — 6 자율에이전트 (researcher, evaluator, iterator...)
- `src/modules/creativity/` — 5 이론 (Guilford, Amabile, Csikszentmihalyi, Geneplore, SCAMPER)
- `src/lib/supabase.ts` — fetch 기반 Supabase REST 클라이언트
- `src/lib/embedding.ts` — Gemini text-embedding-004 (768d)
- `agents/` — gitagent v0.1.0 에이전트 정의 (YAML + SOUL.md)
- `tools/` — MCP 도구 스키마 (YAML)
- `workflows/` — 4I's 파이프라인

## Commands
- `pnpm install` then `pnpm dev` → localhost:3001
- `pnpm build` — production build
- `pnpm test` — vitest (36 tests)

## Architecture
- **Graph v2**: `SupabaseGraphStore` (pgvector + tsvector + RRF 3중검색) — `src/modules/graph/supabase-store.ts`
- **Fallback**: `InMemoryGraphStore` (SUPABASE_URL 없을 때) — `src/modules/graph/store.ts`
- **Manager**: `storeManager.getGlobalStore()` — Supabase 기본, InMemory fallback
- **검색**: cosine(768d) + BM25(tsvector) + BFS → RRF (graph_hybrid_search RPC)
- **Agents**: 6 roles in `agents/`, runtime in `src/modules/agents/`
- **Vision**: VLM image analysis → Concept/Idea nodes (`src/modules/vision/`)
- **Pipeline**: Light (~100s) or Heavy (~191s, multi-agent)

## Graph v2 — Supabase pgvector

```
graph_nodes: id, agent_id, domain, layer(0-2), type, title, description,
             embedding vector(768), score, metadata, fts tsvector, expired_at
graph_edges: id, source_id, target_id, type, weight, metadata,
             created_at, expired_at, valid_from, valid_until (4-timestamp)

8 노드타입: Agent, Domain, Topic, Idea, Artifact, Concept, Episode, DecisionTrace
34 엣지타입: Creation 7 + Semantic 7 + Structural 14 + Agent 6
3-Layer: L0 global / L1 domain / L2 agent
```

## MOL 연동
- MOL Express `BrainClient.js` → CGB `/api/v1/graph/*` (agent_id, domain, layer 전달)
- 에이전트 활동마다 CGB에 노드 축적 → 검색 시 3중 RRF
- brain_config (DB) → archetype × Big Five → creativity settings

## Key Rules
- All Cypher must use `safeLabel()` / `safeRelType()` — never interpolate user input
- All LLM JSON parsing must use `extractJSON()` from `src/modules/llm/client.ts`
- Graph nodes are permanent — never delete, only expire (expired_at) or add CONTRADICTS edges
- New agent? Create `agents/{name}/agent.yaml` + `SOUL.md`
- New tool? Create `tools/{name}.yaml`, implement in `src/modules/agents/tools/`

## Env Vars
- `GOOGLE_GENERATIVE_AI_API_KEY` — required (Gemini 2.5 Flash + embedding)
- `SUPABASE_URL` — required (Graph v2 pgvector)
- `SUPABASE_SERVICE_ROLE_KEY` — required (Graph v2)
- `CREATIVEGRAPH_API_KEY` — master API key
- `UPSTASH_REDIS_REST_URL` + `TOKEN` — API key storage
- `BLOB_READ_WRITE_TOKEN` — optional Vercel Blob for images
