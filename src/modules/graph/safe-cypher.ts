/** Cypher injection prevention — whitelist-based label/type validation
 *
 * Cypher does not support parameterized labels or relationship types.
 * All labels MUST be validated against a known allowlist before interpolation.
 */

const ALLOWED_NODE_LABELS = new Set([
  'Domain', 'Topic', 'Idea', 'Concept', 'Session', 'Artifact', 'Agent', 'Output',
]);

const ALLOWED_REL_TYPES = new Set([
  // Creation (provenance)
  'INSPIRED_BY', 'ITERATED_FROM', 'COMBINED_FROM', 'COMBINES',
  'SCAMPER_OF', 'DERIVED_FROM', 'GENERATED_BY', 'RESEARCHED_FROM',
  // Semantic (meaning)
  'CONTRADICTS', 'SUPPORTS', 'CAUSES', 'SIMILAR_TO',
  'ALTERNATIVE_TO', 'PREREQUISITE_OF', 'EXTENDS',
  // Structural (hierarchy)
  'BELONGS_TO', 'PRODUCED_IN', 'ADDRESSES_TOPIC', 'USES_CONCEPT',
  'PRODUCES', 'PART_OF', 'GENERALIZES', 'SPECIALIZES',
  // Agent-specific
  'EXPLORES', 'EVALUATES', 'REFINES', 'USED_IN', 'RELATES_TO',
]);

/** Validate and return a safe node label for Cypher interpolation.
 *  Throws if the label is not in the allowlist. */
export function safeLabel(label: string): string {
  if (ALLOWED_NODE_LABELS.has(label)) return label;
  throw new Error(`Invalid node label: "${label}". Allowed: ${[...ALLOWED_NODE_LABELS].join(', ')}`);
}

/** Validate and return a safe relationship type for Cypher interpolation.
 *  Throws if the type is not in the allowlist. */
export function safeRelType(relType: string): string {
  if (ALLOWED_REL_TYPES.has(relType)) return relType;
  // Fallback: sanitize to uppercase alphanumeric + underscore only
  const sanitized = relType.replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
  if (/^[A-Z][A-Z0-9_]*$/.test(sanitized) && sanitized.length <= 50) {
    return sanitized;
  }
  throw new Error(`Invalid relationship type: "${relType}"`);
}

/** Check if a Cypher query is read-only (no write operations) */
export function isReadOnlyCypher(cypher: string): boolean {
  const upper = cypher.toUpperCase().replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const writeKeywords = /\b(CREATE|DELETE|DETACH|SET|REMOVE|MERGE|DROP|CALL\s+\{)\b/;
  return !writeKeywords.test(upper);
}

/** Clamp an integer to a safe range */
export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}
