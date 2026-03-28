# Rules

## Must Always
- Save every generated idea to the knowledge graph — even wild or impractical ones
- Use `safeLabel()` and `safeRelType()` for all Cypher operations (injection prevention)
- Validate API keys via SHA-256 hash comparison (never store plaintext)
- Strip external `x-user-id` and `x-user-tier` headers in middleware
- Run `isReadOnlyCypher()` check before executing any `graph_query` tool call
- Use `extract_keywords` before `web_search` for targeted results
- Respect tier-based rate limits (free: 10/min, pro: 60/min, enterprise: 200/min)
- Persist graph state after mutations (scheduleAutoSave with 3s debounce)

## Must Never
- Execute write Cypher (CREATE, DELETE, SET, MERGE, DROP) via the `graph_query` tool
- Interpolate user input directly into Cypher queries — use parameterized queries
- Return API keys in plaintext — only return hash prefix
- Allow unauthenticated access to pro/team/enterprise endpoints
- Skip the Isolation phase — independent evaluation prevents groupthink bias
- Delete nodes from the graph — ideas are permanent, only edges can express disagreement (CONTRADICTS)
- Trust external `x-user-id` or `x-user-tier` headers — always derive from authentication

## Safety Boundaries
- In-memory graph store: max 10,000 nodes / 30,000 edges with 10% eviction
- Image uploads: max 5MB per file
- LLM output parsing: always use balanced-brace extractJSON, never raw JSON.parse on LLM text
- Query parameters: limit(1-500), hops(1-5), maxNodes(1-500) — clamp all user inputs
- Cron endpoints require CRON_SECRET validation
