# CGB — Creative Graph Brain

## Project
AI creativity engine. 5 academic theories → autonomous agents → knowledge graph accumulation.

## Structure
- `src/` — Next.js 15 app (TypeScript, Tailwind 4)
- `agents/` — gitagent v0.1.0 agent definitions (YAML + SOUL.md)
- `tools/` — MCP-compatible tool schemas (YAML)
- `workflows/` — 4I's pipeline definitions (YAML)
- `skills/` — reusable capability modules
- `docs/` — theories, research, lectures

## Commands
- `pnpm install` then `pnpm dev` → localhost:3001
- `pnpm build` — production build

## Architecture
- **Agents**: 6 roles defined in `agents/` (gitagent standard), runtime in `src/modules/agents/`
- **Graph**: `GraphStore` interface (`src/modules/graph/store.ts`) — InMemoryGraphStore now, pluggable
- **Vision**: VLM image analysis → Concept/Idea nodes (`src/modules/vision/`)
- **Pipeline**: Light (single-thread ~100s) or Heavy (multi-agent ~191s)
- **Loader**: `src/modules/agents/runtime/loader.ts` — reads YAML, falls back to definitions.ts

## Key Rules
- All Cypher must use `safeLabel()` / `safeRelType()` — never interpolate user input
- All LLM JSON parsing must use `extractJSON()` from `src/modules/llm/client.ts`
- New agent? Create `agents/{name}/agent.yaml` + `SOUL.md`, add tools in `tools/registry.ts`
- New tool? Create `tools/{name}.yaml`, implement in `src/modules/agents/tools/`
- Graph nodes are permanent — never delete, only add CONTRADICTS edges

## Env Vars
- `GOOGLE_GENERATIVE_AI_API_KEY` — required (Gemini 2.5 Flash)
- `UPSTASH_REDIS_REST_URL` + `TOKEN` — API key storage
- `CREATIVEGRAPH_API_KEY` — master API key
- `NEO4J_URI` + `USER` + `PASSWORD` — optional Memgraph
- `BLOB_READ_WRITE_TOKEN` — optional Vercel Blob for images
