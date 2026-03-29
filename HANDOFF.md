# HANDOFF — CGB (Creative Graph Brain)

## What This Is
AI creativity engine. 5 academic theories coded into 6 autonomous agents. Ideas accumulate forever in a knowledge graph. The graph makes each session more creative than the last.

## Quick Start
```bash
git clone --recurse-submodules https://github.com/akfldk1028/CGB.git
cd CGB
pnpm install
# Set at minimum: GOOGLE_GENERATIVE_AI_API_KEY in .env.local
pnpm dev  # localhost:3000
```

## Read These First
1. `CLAUDE.md` — project overview, commands, rules
2. `AGENTS.md` — 6 agents, how they communicate via graph
3. `memory/MEMORY.md` — 24-file knowledge base (architecture, schema, papers, decisions)

## What Was Done (2026-03-28 session)

### Agent First-Class Graph Nodes
- `ensureAgentNode()` — auto-creates Agent node when agent runs
- `linkAgentToNodes()` — GENERATED_BY edges track who created what
- `queries/agents.ts`, `queries/brain-views.ts` — new modules

### 5 Brain Views (Single Graph, Multiple Filters)
- Collective (no filter), Domain, User, Agent, Visual
- `getBrainVisualization()` in service.ts
- NOT separate stores — single graph, Knowledge Distance requires it

### Multi-Model Debate Tool (13th tool)
- `debate-tool.ts` — Gemini + Claude + GPT parallel debate
- Reads existing graph nodes as context → debate → saves results back
- `submodules/brainstorm-mcp/` — reference implementation (git submodule)
- MCP exposed: 13/13 tools

### Memory System (24 files)
- Migrated from WMCP monorepo, cleaned stale references
- All `creative-api-*` prefixes → `cgb-*`
- Theories, agents, research, graph, API spec, deployment, security

### Code Review Fixes (P0/P1)
- Store interface used everywhere (no direct array push)
- Last-round debate ideas saved (not always round 1)
- Phantom agent names fixed (light_pipeline, not theory names)
- Edge ID collision prevention (8-char random)

## Known Issues
- `workflow-engine.ts` — YAML DAG engine exists but NOT wired to API routes. `multi-agent.ts` is the actual heavy mode runner
- Dead code: `clawteam-client.ts`, `roles/*.ts`, `orchestrator.ts`
- Zero tests (no vitest setup)
- Never deployed to Vercel
- userId tagging not implemented (all nodes anonymous)

## Architecture (short version)
```
API Route (POST /api/creative/session)
  ├── light mode → orchestrator → four-is.ts (Guilford diverge/converge)
  └── heavy mode → multi-agent.ts → agent-runner.ts (5 agents, AI SDK tool calling)
       ├── researcher → graph_search + web_search
       ├── divergent_thinker → brainstorm + scamper + triz + multi_model_debate
       ├── evaluator + field_validator (parallel) → evaluate_idea + measure_novelty
       └── iterator → scamper + triz + graph_add_node

Graph (single store, multiple views):
  7 node types: Domain > Topic > Idea > Artifact + Concept, Session, Agent
  22 edge types: Creation (7) + Semantic (7) + Structural (8)
  Novelty = BFS shortest path (Knowledge Distance, Luo 2022)

13 Tools: graph CRUD (4) + web_search + brainstorm + scamper + triz
          + evaluate + keywords + novelty + image_analysis + multi_model_debate
```

## Env Vars
```
GOOGLE_GENERATIVE_AI_API_KEY=<required>   # Gemini 2.5 Flash
OPENAI_API_KEY=<optional>                 # for multi-model debate
ANTHROPIC_API_KEY=<optional>              # for multi-model debate
UPSTASH_REDIS_REST_URL=<optional>         # API key storage
UPSTASH_REDIS_REST_TOKEN=<optional>
CREATIVEGRAPH_API_KEY=<optional>          # master key (free mode if unset)
```

## Next Steps
1. Wire `workflow-engine.ts` into API routes (replace multi-agent.ts)
2. Vercel deploy
3. Add vitest tests
4. userId tagging (My Brain vs Collective Brain)
5. LemonSqueezy payment integration
6. Clean dead code (clawteam, roles/, orchestrator)
