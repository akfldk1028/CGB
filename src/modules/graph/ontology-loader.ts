/** Ontology Loader — YAML 도메인 온톨로지 로딩 + 검증 + 머지
 *
 * CCG 패턴: _base.yaml + domain.yaml 상속 구조
 * CGB 적용: Zod 검증, TypeScript 타입 생성, Cypher/Summary 자동 생성
 *
 * 사용법:
 *   const ontology = await loadDomain('creativity');
 *   ontology.nodeTypes   // Map<string, NodeTypeDef>
 *   ontology.edgeTypes   // Map<string, EdgeTypeDef>
 *   ontology.generateCypher()  // CREATE INDEX 문
 *   ontology.generateSummary() // 사람 읽기용 요약
 */

import { readFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

// ═══════════════════════════════════════════
// Zod Schemas
// ═══════════════════════════════════════════

const PropertyDefSchema = z.object({
  name: z.string(),
  type: z.string().default('string'),
  required: z.boolean().default(false),
  enum: z.array(z.string()).optional(),
});

const NodeTypeDefSchema = z.object({
  level: z.union([z.number(), z.literal('aux')]),
  description: z.string(),
  color: z.string().default('#6366f1'),
  icon: z.string().default('circle'),
  properties: z.array(PropertyDefSchema).default([]),
});

const EdgeTypeDefSchema = z.object({
  category: z.enum(['creation', 'semantic', 'structural']),
  description: z.string(),
  source: z.string().optional(),
  target: z.string().optional(),
});

const VisualizationSchema = z.object({
  edge_colors: z.record(z.string(), z.string()).optional(),
  default_node_size: z.number().optional(),
  highlighted_node_size: z.number().optional(),
  background: z.string().optional(),
  fog_density: z.number().optional(),
}).default({});

const AgentRoleSchema = z.object({
  role: z.string(),
  name: z.string(),
  theory: z.string().optional(),
  tools: z.array(z.string()).default([]),
});

const DomainInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  tagline: z.string().default(''),
});

const BaseOntologySchema = z.object({
  version: z.string().optional(),
  node_types: z.record(z.string(), NodeTypeDefSchema),
  edge_types: z.record(z.string(), EdgeTypeDefSchema),
  generation_methods: z.array(z.string()).default([]),
  visualization: VisualizationSchema.optional(),
});

const DomainOntologySchema = z.object({
  inherits: z.string().optional(),
  domain: DomainInfoSchema.optional(),
  node_types: z.record(z.string(), NodeTypeDefSchema).default({}),
  edge_types: z.record(z.string(), EdgeTypeDefSchema).default({}),
  generation_methods: z.array(z.string()).default([]),
  agent_roles: z.array(AgentRoleSchema).default([]),
  visualization: VisualizationSchema.optional(),
});

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type PropertyDef = z.infer<typeof PropertyDefSchema>;
export type NodeTypeDef = z.infer<typeof NodeTypeDefSchema>;
export type EdgeTypeDef = z.infer<typeof EdgeTypeDefSchema>;
export type AgentRoleDef = z.infer<typeof AgentRoleSchema>;

export interface LoadedOntology {
  domain: { id: string; name: string; description: string; tagline: string };
  nodeTypes: Map<string, NodeTypeDef>;
  edgeTypes: Map<string, EdgeTypeDef>;
  generationMethods: string[];
  agentRoles: AgentRoleDef[];
  visualization: z.infer<typeof VisualizationSchema>;
  generateCypher: () => string;
  generateSummary: () => string;
}

// ═══════════════════════════════════════════
// Loading
// ═══════════════════════════════════════════

const DOMAINS_DIR = path.join(process.cwd(), 'domains');

async function loadYaml<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  const raw = await readFile(filePath, 'utf-8');
  const data = yaml.load(raw);
  return schema.parse(data);
}

/** base + domain YAML 머지 (CCG _merge_base 패턴) */
function mergeOntologies(
  base: z.infer<typeof BaseOntologySchema>,
  domain: z.infer<typeof DomainOntologySchema>
): {
  nodeTypes: Map<string, NodeTypeDef>;
  edgeTypes: Map<string, EdgeTypeDef>;
  generationMethods: string[];
  visualization: z.infer<typeof VisualizationSchema>;
} {
  // 노드: base 먼저, domain이 같은 키로 오버라이드
  const nodeTypes = new Map<string, NodeTypeDef>();
  for (const [key, val] of Object.entries(base.node_types)) {
    nodeTypes.set(key, val);
  }
  for (const [key, val] of Object.entries(domain.node_types)) {
    nodeTypes.set(key, val); // domain overrides base
  }

  // 엣지: 동일 패턴
  const edgeTypes = new Map<string, EdgeTypeDef>();
  for (const [key, val] of Object.entries(base.edge_types)) {
    edgeTypes.set(key, val);
  }
  for (const [key, val] of Object.entries(domain.edge_types)) {
    edgeTypes.set(key, val);
  }

  // Generation methods: 합집합
  const methodSet = new Set([...base.generation_methods, ...domain.generation_methods]);

  // Visualization: domain 오버라이드
  const visualization = { ...(base.visualization ?? {}), ...(domain.visualization ?? {}) };

  return {
    nodeTypes,
    edgeTypes,
    generationMethods: [...methodSet],
    visualization,
  };
}

/** Cypher 인덱스 생성문 (Memgraph/Neo4j) */
function generateCypher(nodeTypes: Map<string, NodeTypeDef>): string {
  const lines = ['// Auto-generated from YAML ontology', ''];
  for (const [label, def] of nodeTypes) {
    lines.push(`CREATE INDEX ON :${label}(id);`);
    // required 프로퍼티에 인덱스 추가
    for (const prop of def.properties) {
      if (prop.required && prop.name !== 'id') {
        lines.push(`CREATE INDEX ON :${label}(${prop.name});`);
      }
    }
  }
  return lines.join('\n');
}

/** 사람/에이전트 읽기용 스키마 요약 */
function generateSummary(
  nodeTypes: Map<string, NodeTypeDef>,
  edgeTypes: Map<string, EdgeTypeDef>
): string {
  const lines = ['CreativeGraph Ontology (YAML-driven):', ''];

  // 노드 정리 (레벨별)
  const levels = new Map<string | number, string[]>();
  for (const [label, def] of nodeTypes) {
    const key = def.level.toString();
    if (!levels.has(key)) levels.set(key, []);
    levels.get(key)!.push(`${label}: ${def.description}`);
  }

  for (const [level, nodes] of [...levels].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
    lines.push(`Level ${level}:`);
    for (const n of nodes) lines.push(`  ${n}`);
    lines.push('');
  }

  // 엣지 카테고리별
  const categories = new Map<string, string[]>();
  for (const [type, def] of edgeTypes) {
    if (!categories.has(def.category)) categories.set(def.category, []);
    categories.get(def.category)!.push(type);
  }

  lines.push('Edges:');
  for (const [cat, types] of categories) {
    lines.push(`  ${cat}: ${types.join(', ')}`);
  }

  return lines.join('\n');
}

/** 도메인 온톨로지 로딩 — _base.yaml 머지 포함 */
export async function loadDomain(domainId: string): Promise<LoadedOntology> {
  const basePath = path.join(DOMAINS_DIR, '_base.yaml');
  const domainPath = path.join(DOMAINS_DIR, `${domainId}.yaml`);

  const base = await loadYaml(basePath, BaseOntologySchema);
  const domain = await loadYaml(domainPath, DomainOntologySchema);

  const merged = mergeOntologies(base, domain);

  const domainInfo = domain.domain ?? { id: domainId, name: domainId, description: '', tagline: '' };

  return {
    domain: domainInfo,
    nodeTypes: merged.nodeTypes,
    edgeTypes: merged.edgeTypes,
    generationMethods: merged.generationMethods,
    agentRoles: domain.agent_roles,
    visualization: merged.visualization,
    generateCypher: () => generateCypher(merged.nodeTypes),
    generateSummary: () => generateSummary(merged.nodeTypes, merged.edgeTypes),
  };
}

/** 사용 가능한 도메인 목록 */
export async function listDomains(): Promise<Array<{ id: string; name: string }>> {
  const { readdir } = await import('fs/promises');
  const files = await readdir(DOMAINS_DIR);
  const results: Array<{ id: string; name: string }> = [];

  for (const file of files) {
    if (file.startsWith('_') || !file.endsWith('.yaml')) continue;
    const id = file.replace('.yaml', '');
    try {
      const raw = await readFile(path.join(DOMAINS_DIR, file), 'utf-8');
      const data = yaml.load(raw) as Record<string, unknown>;
      const domainInfo = data?.domain as Record<string, string> | undefined;
      results.push({ id, name: domainInfo?.name ?? id });
    } catch {
      results.push({ id, name: id });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/** 온톨로지에서 노드 타입 유효성 검증 */
export function validateNodeType(ontology: LoadedOntology, type: string): boolean {
  return ontology.nodeTypes.has(type);
}

/** 온톨로지에서 엣지 타입 유효성 검증 */
export function validateEdgeType(ontology: LoadedOntology, type: string): boolean {
  return ontology.edgeTypes.has(type);
}
