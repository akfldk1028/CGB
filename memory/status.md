# Implementation Status (2026-03-28)

## Done (verified working)
- [x] 4I's pipeline — light mode (~100s) and heavy mode (~191s, 5 agents)
- [x] Guilford divergent/convergent — core pipeline shape
- [x] Amabile 3-component evaluation + Agent Ideate 3 dimensions
- [x] TRIZ 40 inventive principles tool
- [x] SCAMPER 7 techniques tool
- [x] Knowledge Distance novelty scoring (BFS)
- [x] LLM-as-Judge tournament (10 matches)
- [x] gitagent v0.1.0 standard (YAML agents, SOUL.md, workflows)
- [x] DAG workflow engine (parallel support)
- [x] Image→Graph VLM pipeline (Gemini multimodal)
- [x] ForceGraph3D with image sprite nodes
- [x] 5-tab graph view system (Collective/My/Domain/Agent/Visual)
- [x] Agent first-class graph nodes + GENERATED_BY edges
- [x] Brain view query system (single graph, multiple filters)
- [x] Security hardening (Cypher injection, header spoofing, param clamping)
- [x] 33 API routes + 5 pages
- [x] Build passing

## Not Done
- [ ] Vercel deployment (never deployed)
- [ ] Tests (zero — no vitest setup)
- [ ] userId tagging (all nodes are anonymous)
- [ ] LemonSqueezy payment integration
- [ ] Dashboard page (stats + session history)
- [ ] Real-time graph polling during sessions

## Build & Run
```bash
# Install
pnpm install

# Dev
pnpm dev          # localhost:3000

# Build
pnpm build        # or: npx next build

# Required env
GOOGLE_GENERATIVE_AI_API_KEY=<key>   # Gemini 2.5 Flash (required)

# Optional env
OPENAI_API_KEY=<key>
UPSTASH_REDIS_REST_URL=<url>
UPSTASH_REDIS_REST_TOKEN=<token>
CREATIVEGRAPH_API_KEY=<master-key>
CRON_SECRET=<secret>
NEO4J_URI=bolt://<ip>:7687
BLOB_READ_WRITE_TOKEN=<token>
```

## Git History (7 commits)
```
49b44a5 feat: Agent first-class graph nodes + multi-brain view system
6447973 fix: DAG parallel parent ID tracking + deduplicate role mapping
b17e11c fix: code review — js-yaml parser, DAG workflow engine, Vercel file tracing
18994e4 feat: gitagent v0.1.0 standard — declarative agent architecture
5868c16 docs: add memory, lectures, and gitagent reference
f412060 init: Creative Graph Brain — extracted from wmcp monorepo
```
