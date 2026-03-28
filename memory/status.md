# Implementation Status (2026-03-28)

## Source Files: 113 TypeScript files

## Done (verified working, build passing)
- [x] 4I's pipeline — light mode (~100s, orchestrator.ts → four-is.ts)
- [x] 4I's pipeline — heavy mode (~191s, multi-agent.ts → agent-runner.ts)
- [x] Guilford divergent/convergent — guilford.ts, core pipeline shape
- [x] Amabile 3-component evaluation — amabile.ts + evaluate-tool.ts 6-dim
- [x] TRIZ 40 inventive principles — triz-tool.ts (full 40 principles)
- [x] SCAMPER 7 techniques — scamper-tool.ts + techniques/scamper.ts
- [x] Knowledge Distance novelty scoring — novelty-tool.ts + queries/novelty.ts BFS
- [x] LLM-as-Judge tournament — evaluation/judge.ts (10 matches)
- [x] gitagent v0.1.0 standard — YAML agents, SOUL.md, workflows
- [x] DAG workflow engine — workflow-engine.ts (YAML parser + parallel exec)
- [x] Image→Graph VLM pipeline — vision/analyze.ts + scene-graph.ts
- [x] ForceGraph3D with image sprite nodes — components/graph/
- [x] 5-tab graph view system — Collective/My/Domain/Agent/Visual
- [x] Agent first-class graph nodes + GENERATED_BY edges — queries/agents.ts
- [x] Brain view query system — queries/brain-views.ts
- [x] Multi-model debate tool — debate-tool.ts (13th tool)
- [x] Security hardening — safe-cypher.ts, middleware header strip, param clamp
- [x] API routes — 33 v1 + legacy + system
- [x] MCP server — mcp/server.ts + transport-sse.ts (13 tools exposed)
- [x] Build passing (Next.js 15)

## Dead Code (exists but not called from live paths)
- `workflow-engine.ts` — DAG engine implemented but NEVER called. multi-agent.ts is the actual heavy mode runner
- `roles/*.ts` (6 files) — old prompt constants, only re-exported from index.ts but never imported by anything
- `clawteam-client.ts` — Python server client, no Python server exists in CGB
- `orchestrator.ts` — legacy simple pipeline, only used by `four-is.ts` internally
- `theories/csikszentmihalyi.ts` — `validateSystemsModel()` exists but never called from pipeline
- `theories/geneplore.ts` — `geneploreCycle()` exists but never called from pipeline
- `techniques/story-structure.ts` — exists but never imported outside index.ts
- `techniques/role-storming.ts` — exists but never imported outside index.ts
- `mcp/tools.ts` — wraps only 11 tools (missing image-tool, debate-tool)

## Key Architecture Issue
**workflow-engine.ts vs multi-agent.ts**: Both exist for heavy mode.
- `multi-agent.ts` is what API routes ACTUALLY call (hardcoded agent sequence)
- `workflow-engine.ts` parses YAML workflows but is never invoked from any route
- The DAG engine was built but never wired in

## Not Done
- [ ] Vercel deployment (never deployed)
- [ ] Tests (zero — no vitest setup)
- [ ] userId tagging (all nodes are anonymous)
- [ ] LemonSqueezy payment integration
- [ ] Dashboard page data (static placeholder)
- [ ] Real-time graph polling during sessions
- [x] MCP tools.ts sync (13/13 tools exposed)
- [ ] workflow-engine.ts integration into API routes

## Build & Run
```bash
pnpm install
pnpm dev          # localhost:3000
pnpm build        # or: npx next build

# Required env
GOOGLE_GENERATIVE_AI_API_KEY=<key>

# Optional env
OPENAI_API_KEY, ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL/TOKEN,
CREATIVEGRAPH_API_KEY, CRON_SECRET, NEO4J_URI/USER/PASSWORD, BLOB_READ_WRITE_TOKEN
```

## Code Review (2026-03-28, commit 8326257)
Fixed P0/P1 issues:
- P0: `agents.ts`, `debate-tool.ts` — store interface 사용 (직접 array push 제거)
- P1: debate tool이 마지막 라운드 아이디어 저장 (round1 고정 버그)
- P1: API 키 없으면 early return (실패 메시지를 Idea로 저장하지 않음)
- P2: persistSession phantom agent 제거 (theory명 → light_pipeline)
- P2: edge ID 8자 랜덤 (충돌 방지), 2자 토큰 허용 (AI/ML)

Remaining known issues:
- workflow-engine.ts still not wired to API routes
- roles/*.ts still dead code
- brain-views filterByDomain is O(V*E) for large graphs

## Git History (14 commits)
```
8326257 fix: code review P0/P1 — store interface, last-round save, phantom agents
fc0d91a fix: debate tool reads graph context + saves results to graph
4544f59 fix: MCP 13/13 tools + tsconfig exclude submodules
e101c9e docs: honest status update — dead code identified, architecture corrected
83a9cdf feat: multi-model debate tool + brainstorm-mcp submodule
af670c6 fix: clean stale WMCP references in memory files
3c9151d docs: complete memory system — 25 files from WMCP migration
8563341 docs: comprehensive memory system for AI agent onboarding
49b44a5 feat: Agent first-class graph nodes + multi-brain view system
6447973 fix: DAG parallel parent ID tracking + deduplicate role mapping
b17e11c fix: code review — js-yaml, DAG workflow engine, Vercel file tracing
18994e4 feat: gitagent v0.1.0 standard — declarative agent architecture
5868c16 docs: add memory, lectures, and gitagent reference
f412060 init: Creative Graph Brain — extracted from wmcp monorepo
```
