# Graph Schema — 7 Node Types, 22 Edge Types

## Node Hierarchy (4 levels + 3 auxiliary)
```
Level 0: Domain    — "Healthcare", "Fintech" (Csikszentmihalyi's domain knowledge)
Level 1: Topic     — "AI Financial Advisor" (one session = one topic)
Level 2: Idea      — Core unit. Has provenance, scores, maturity stage
Level 3: Artifact  — Concrete outputs (narrative, prototype, code)

Auxiliary:
  Concept  — Shared across ideas ("Transfer Learning", "Attention")
  Session  — Execution record (phases, timing, agent list)
  Agent    — First-class participant (role, theory, tools used, contribution count)
```

## Edge Types (3 categories)

### Creation (provenance — how was it made?)
INSPIRED_BY, ITERATED_FROM, COMBINED_FROM, SCAMPER_OF, DERIVED_FROM, GENERATED_BY, RESEARCHED_FROM

### Semantic (meaning — what's the relationship?)
CONTRADICTS, SUPPORTS, CAUSES, SIMILAR_TO, ALTERNATIVE_TO, PREREQUISITE_OF, EXTENDS

### Structural (hierarchy — where does it belong?)
PART_OF, GENERALIZES, SPECIALIZES, BELONGS_TO, PRODUCED_IN, USES_CONCEPT, ADDRESSES_TOPIC, PRODUCES

## Generation Methods
divergent_brainstorm, convergent_selection, scamper_*, role_storming, mind_mapping, iteration_semantic, iteration_structural, web_research, graph_traversal, human_input, agent_autonomous, visual_inspiration, scene_graph_extract

## Idea Maturity (Geneplore model)
raw → explored → refined → validated

## Evaluation Dimensions (6)
Amabile 3: domainRelevance, creativeThinking, intrinsicMotivation
Agent Ideate 3: specificity, marketNeed, competitiveAdvantage

## Novelty Score
BFS shortest path from new idea to nearest existing idea.
Path 1 = derivative (10), Path 3 = cross-domain (70), No path = fully novel (100).
Based on Knowledge Distance (Luo et al., KBS 2022).
