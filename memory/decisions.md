# Key Design Decisions

## Single graph, not separate brain stores
**Decision**: All nodes in one graph. "Brains" are filter views.
**Why**: Knowledge Distance (core metric) requires all nodes connected. Separate stores break cross-domain creativity measurement. The `queryBrainView()` function filters by domain/user/agent/visual without splitting storage.

## Agent nodes as graph citizens
**Decision**: Agents are `Agent` type nodes with `GENERATED_BY` edges.
**Why**: Tracks provenance (who created what), enables Agent Brain view, supports future external agents via MCP. `ensureAgentNode()` auto-creates on first run, deduplicates by role ID.

## Csikszentmihalyi and Geneplore: cite, don't code
**Decision**: No separate `validateSystemsModel()` or `geneploreCycle()` in the pipeline.
**Why**: The pipeline already IS these theories. Forcing separate modules creates redundant evaluation (Csikszentmihalyi overlaps Amabile) or redundant cycles (Geneplore = Inspiration→Iteration). Academic rigor comes from citing correctly, not from having a file named after every theory.

## In-memory graph as default, Memgraph optional
**Decision**: `InMemoryGraphStore` with file persistence to `/tmp`.
**Why**: Zero infrastructure for dev/demo. Memgraph only needed at scale. `GraphStore` interface allows swapping without code changes.

## YAML-first agent definitions (gitagent standard)
**Decision**: `agents/{name}/agent.yaml` + `SOUL.md` instead of hardcoded TypeScript.
**Why**: Portable agent definitions. Any AI can read YAML to understand an agent's capabilities. Fallback to `definitions.ts` if YAML missing.

## Gemini 2.5 Flash as default LLM
**Decision**: Google Gemini for all LLM calls including VLM.
**Why**: Fast, cheap, multimodal (text+image in one model). No need for separate vision model. ~100s for full light mode pipeline.

## 6-dimension evaluation (not 3)
**Decision**: Amabile 3 (domainRelevance, creativeThinking, motivation) + Agent Ideate 3 (specificity, marketNeed, competitiveAdvantage).
**Why**: Agent Ideate (IJCAI 2025) proved that specificity and market validation matter for actionable ideas. Pure creativity metrics miss practical value.

## Tournament bracket with 10 matches (not 20)
**Decision**: Random-pairing LLM-as-Judge, capped at 10 comparisons.
**Why**: 20 matches = 20 LLM calls = too slow. 10 gives good enough ranking with half the cost. Winner determined by win count.
