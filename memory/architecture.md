# CGB Architecture

## What This Is
AI creativity engine that turns academic creativity theories into autonomous agents. Ideas accumulate forever in a knowledge graph. Text and images both feed the brain. API for sale.

## Core Thesis
**"Graph distance = creativity"** (Luo et al., KBS 2022). Ideas connecting semantically distant concepts score higher. The graph grows every session, making each subsequent session more creative.

## Pipeline: 4I's
```
Immersion → Inspiration → Isolation → Iteration
(research)   (diverge)     (evaluate)   (evolve)
```

### Light Mode (~100s)
Sequential function calls. No agents. Guilford divergent→convergent.

### Heavy Mode (~191s)
5 autonomous agents with AI SDK tool calling:
```
researcher (10s) → divergent_thinker (23s) → [evaluator (41s) + field_validator (5s)] parallel → iterator (19s)
```
Runs via `multi-agent.ts` (hardcoded agent sequence).
NOTE: `workflow-engine.ts` (YAML DAG parser) exists but is NOT wired into any API route yet. The actual heavy mode uses `multi-agent.ts`.

## 6 Agents (gitagent v0.1.0 standard)
Each has `agents/{name}/agent.yaml` + `SOUL.md`.

| Agent | Role | Theory Basis |
|-------|------|-------------|
| researcher | Domain immersion, web search | Csikszentmihalyi Domain |
| divergent-thinker | Generate 10+ ideas | Guilford Divergent Production |
| evaluator | 6-dimension scoring | Amabile 3 + Agent Ideate 3 |
| field-validator | Market reality check | Csikszentmihalyi Field |
| iterator | Evolve top ideas | Geneplore Exploratory Phase |
| creative-director | Orchestrate pipeline | Router/coordinator |

## Graph: Single Graph, Multiple Brain Views
All nodes live in ONE graph. "Brains" are filter views, not separate stores.

```
┌─────────────── Single Graph ───────────────┐
│                                             │
│  Collective = no filter (meta brain)        │
│  Domain     = filter by BELONGS_TO edges    │
│  User       = filter by userId field        │
│  Agent      = filter by GENERATED_BY edges  │
│  Visual     = filter by imageUrl != null    │
│                                             │
└─────────────────────────────────────────────┘
```

Why single graph: Knowledge Distance requires all nodes connected. Separate stores break cross-domain creativity measurement.

## Agent as First-Class Graph Citizen
- Agent nodes auto-created when an agent runs (`ensureAgentNode()`)
- GENERATED_BY edges link agents to ideas they created
- External agents register the same way (via MCP tools)
- `getAgentStats()` tracks contributions per agent

## Git Clone (submodule 포함)
```bash
git clone --recurse-submodules https://github.com/akfldk1028/CGB.git
# 이미 clone 했으면:
git submodule update --init --recursive
```
`submodules/brainstorm-mcp/` — 멀티모델 디베이트 참조 구현 (v1.5.4). CGB는 이걸 직접 import하지 않고, 같은 패턴을 AI SDK 기반으로 `debate-tool.ts`에 네이티브 구현. submodule은 참조용.

**주의**: `tsconfig.json`에서 `"exclude": ["submodules"]` 설정됨. submodule 소스가 빌드에 잡히지 않음.

## Tech Stack
- Next.js 15, TypeScript strict
- AI SDK (`generateText` + `stopWhen: stepCountIs(N)`)
- Gemini 2.5 Flash (default LLM, multimodal)
- Graph: in-memory (dev) or Memgraph (prod)
- Persistence: JSON file (`/tmp` on Vercel)
- Image: Vercel Blob (prod) or base64 (dev)
- Payment: LemonSqueezy (planned)

## Key Files
```
src/modules/
├── agents/runtime/
│   ├── agent-runner.ts    — Autonomous agent loop + agent node registration
│   ├── workflow-engine.ts — DAG execution from YAML
│   └── loader.ts          — YAML→AgentDefinition + SOUL.md→systemPrompt
├── agents/tools/          — 13 MCP-compatible tools (registry.ts)
├── creativity/
│   ├── theories/          — guilford.ts, amabile.ts (code that runs)
│   └── techniques/        — scamper.ts, brainstorming.ts, mind-mapping.ts
├── graph/
│   ├── store.ts           — GraphStore interface + InMemoryGraphStore + StoreManager
│   ├── service.ts         — High-level API (addNode, search, getBrainVisualization)
│   ├── schema.ts          — 7 node types, 22 edge types, Cypher indexes
│   ├── queries/
│   │   ├── agents.ts      — Agent node CRUD + GENERATED_BY linking
│   │   ├── brain-views.ts — 5 brain view filters
│   │   ├── novelty.ts     — BFS shortest path → novelty score
│   │   └── ...
│   ├── safe-cypher.ts     — Injection prevention (whitelist)
│   ├── transform.ts       — → 3D visualization data
│   └── persistence.ts     — File-based save/load
├── vision/
│   ├── analyze.ts         — Gemini VLM image analysis
│   └── scene-graph.ts     — VLM output → Concept/Idea nodes
└── llm/client.ts          — Multi-provider (Gemini/Anthropic/OpenAI)
```
