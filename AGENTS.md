# Agents

This project follows the [gitagent](https://github.com/open-gitagent/gitagent) standard v0.1.0.

## Agent Hierarchy

```
creative-director (router)
├── researcher        — Immersion phase
├── divergent-thinker — Inspiration phase
├── evaluator         — Isolation phase (parallel)
├── field-validator   — Isolation phase (parallel)
└── iterator          — Iteration phase
```

## How Agents Communicate

Agents communicate through the **knowledge graph**, not string passing:
1. Each agent reads the graph state via `graph_search`
2. Each agent writes results as nodes/edges via `graph_add_node` / `graph_add_edge`
3. The next agent discovers previous work by querying the graph

## Workflow

The 4I's pipeline is defined in `workflows/four-is-heavy.yaml`:
- **Immersion** → researcher gathers domain context
- **Inspiration** → divergent-thinker generates ideas
- **Isolation** → evaluator + field-validator score independently (parallel)
- **Iteration** → iterator evolves top ideas

## Adding a New Agent

1. Create `agents/{name}/agent.yaml` with spec_version, tools, runtime config
2. Create `agents/{name}/SOUL.md` with identity and workflow instructions
3. Add tool mappings in `src/modules/agents/tools/registry.ts`
4. Add the agent to `workflows/` YAML if it participates in the pipeline
5. Update `agent.yaml` (root) agents section

## Tool Definitions

All 12 tools are defined in `tools/*.yaml` (MCP-compatible schemas).
Runtime implementations are in `src/modules/agents/tools/`.
