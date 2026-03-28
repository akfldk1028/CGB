# Academic Papers — What Matters

## Core (actually implemented in code)

| Paper | What it gave us |
|-------|----------------|
| **Knowledge Distance** (Luo 2022, KBS) | THE thesis: graph distance = creativity. Implemented as BFS novelty score in `queries/novelty.ts` |
| **Agent Ideate** (IJCAI 2025) | 6-dimension evaluation + proof that web search tools boost creativity 86%. Implemented in `evaluation/judge.ts` |
| **Guilford SI** (1967) | Diverge→converge pipeline shape. Implemented in `theories/guilford.ts` |
| **Amabile Componential** (1996) | 3-component evaluation (domain, creativity, motivation). Implemented in `theories/amabile.ts` |
| **TRIZ** (Altshuller 1999) + TRIZ-GPT (2024) | 40 inventive principles for contradiction resolution. Implemented in `tools/triz-tool.ts` |
| **SCAMPER** (Eberle 1971) | 7 systematic variation techniques. Implemented in `techniques/scamper.ts` |

## Cite-only (shaped design but no separate code module needed)

| Paper | Why cite-only |
|-------|--------------|
| **Csikszentmihalyi Systems** (1996) | Individual×Domain×Field is a social model, not AI-simulable. Our pipeline IS the systems model (agents=individuals, graph=domain, evaluator=field). No separate `validateSystemsModel()` needed. |
| **Geneplore** (Finke 1992) | Generate→Explore = our Inspiration→Iteration. The 4I's pipeline IS Geneplore. No separate `geneploreCycle()` needed. |
| **Lin & Riedl Co-Creative Ontology** (NeurIPS 2023) | Agent role taxonomy (coach, critic, teammate). Maps to our 6 agents. Documentation only. |
| **Barrios Multi-agent Ontology** (2020) | Graph edge design (CONTRADICTS, SUPPORTS, SIMILAR_TO). Already in schema. |

## Differentiation from competitors

| Competitor | Their limit | Our advantage |
|-----------|------------|--------------|
| TRIZ Agents (ICAART 2025) | Single theory, single session | 5 theories + graph accumulation |
| Agent Ideate (IJCAI 2025) | One-directional patent→idea | Bidirectional graph + iteration chains |
| KG-Agent (2024) | QA-purpose KG reasoning | Creativity-purpose KG generation |

## Papers on disk
- `clone/papers/` — 25 PDFs (full collection)
- `docs/papers/` — 6 PDFs (image→graph specific)
