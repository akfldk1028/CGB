/** gitagent Loader — YAML/MD 파일에서 에이전트 정의 로드
 *
 * gitagent 표준 v0.1.0 준수:
 * - agents/{name}/agent.yaml → AgentDefinition
 * - agents/{name}/SOUL.md → systemPrompt
 * - workflows/{name}.yaml → WorkflowDefinition
 *
 * Fallback: YAML 없으면 기존 definitions.ts 사용
 */

import { readFile } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { AgentRole } from '@/types/agent';
import { AGENT_DEFINITIONS, type AgentDefinition } from './definitions';

// gitagent 루트 = 프로젝트 루트 (CGB/)
// Vercel: process.cwd() = /var/task, 파일은 빌드에 포함되어야 함
const GITAGENT_ROOT = path.resolve(process.cwd());

// ── Role ↔ Name 매핑 (한 곳에서만 정의) ──

const ROLE_TO_NAME: Record<AgentRole, string> = {
  researcher: 'researcher',
  divergent_thinker: 'divergent-thinker',
  evaluator: 'evaluator',
  iterator: 'iterator',
  field_validator: 'field-validator',
  creative_director: 'creative-director',
};

const NAME_TO_ROLE: Record<string, AgentRole> = Object.fromEntries(
  Object.entries(ROLE_TO_NAME).map(([role, name]) => [name, role as AgentRole])
);

// ── 캐시 (동일 파일 반복 로드 방지) ──

const agentCache = new Map<AgentRole, AgentDefinition>();
const workflowCache = new Map<string, WorkflowDefinition>();

// ── Agent Loader ──

/** agent.yaml + SOUL.md 에서 에이전트 정의 로드 */
async function loadAgentFromYaml(agentName: string): Promise<AgentDefinition | null> {
  const agentDir = path.join(GITAGENT_ROOT, 'agents', agentName);

  try {
    const [yamlText, soulText] = await Promise.all([
      readFile(path.join(agentDir, 'agent.yaml'), 'utf-8'),
      readFile(path.join(agentDir, 'SOUL.md'), 'utf-8'),
    ]);

    const parsed = yaml.load(yamlText) as Record<string, unknown>;

    // SOUL.md → systemPrompt (frontmatter 제거)
    const soulContent = soulText.replace(/^---[\s\S]*?---\s*/m, '').trim();

    const role = NAME_TO_ROLE[agentName] ?? agentName as AgentRole;
    const metadata = parsed.metadata as Record<string, unknown> | undefined;
    const runtime = parsed.runtime as Record<string, unknown> | undefined;

    return {
      role,
      name: (parsed.name as string) ?? agentName,
      theory: (metadata?.theory as string) ?? '',
      phases: metadata?.phase ? [metadata.phase as string] : ['all'],
      maxSteps: (runtime?.max_turns as number) ?? 10,
      systemPrompt: soulContent,
    };
  } catch {
    return null;
  }
}

/** 에이전트 정의 로드 — YAML 우선, 캐시, fallback definitions.ts */
export async function loadAgent(role: AgentRole): Promise<AgentDefinition> {
  // 캐시 확인
  const cached = agentCache.get(role);
  if (cached) return cached;

  const agentName = ROLE_TO_NAME[role];
  if (agentName) {
    const fromYaml = await loadAgentFromYaml(agentName);
    if (fromYaml) {
      agentCache.set(role, fromYaml);
      return fromYaml;
    }
  }

  // Fallback
  const def = AGENT_DEFINITIONS[role];
  agentCache.set(role, def);
  return def;
}

// ── Workflow Loader ──

export interface WorkflowStep {
  id: string;
  action: string;
  agent?: string;
  skill?: string;
  tool?: string;
  depends_on?: string[];
  outputs?: string[];
  parallel?: boolean;
  steps?: WorkflowStep[];
  inputs?: Record<string, string>;
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  description: string;
  steps: WorkflowStep[];
  error_handling?: { on_step_failure?: string; max_retries?: number };
}

/** workflows/{name}.yaml 로드 + 파싱 */
export async function loadWorkflow(name: string): Promise<WorkflowDefinition | null> {
  const cached = workflowCache.get(name);
  if (cached) return cached;

  try {
    const filePath = path.join(GITAGENT_ROOT, 'workflows', `${name}.yaml`);
    const text = await readFile(filePath, 'utf-8');
    const parsed = yaml.load(text) as Record<string, unknown>;

    const rawSteps = parsed.steps as unknown[];
    const steps = rawSteps ? parseSteps(rawSteps) : [];

    const def: WorkflowDefinition = {
      name: (parsed.name as string) ?? name,
      version: (parsed.version as string) ?? '1.0.0',
      description: (parsed.description as string) ?? '',
      steps,
      error_handling: parsed.error_handling as WorkflowDefinition['error_handling'],
    };

    workflowCache.set(name, def);
    return def;
  } catch {
    return null;
  }
}

/** YAML steps 배열 → WorkflowStep[] 재귀 파싱 */
function parseSteps(rawSteps: unknown[]): WorkflowStep[] {
  return rawSteps.map((raw) => {
    const s = raw as Record<string, unknown>;
    const step: WorkflowStep = {
      id: (s.id as string) ?? '',
      action: (s.action as string) ?? '',
      agent: s.agent as string | undefined,
      skill: s.skill as string | undefined,
      tool: s.tool as string | undefined,
      depends_on: s.depends_on as string[] | undefined,
      outputs: s.outputs as string[] | undefined,
      parallel: s.parallel as boolean | undefined,
    };

    if (s.inputs) {
      step.inputs = s.inputs as Record<string, string>;
    }

    // 병렬 서브스텝 재귀 파싱
    if (s.steps && Array.isArray(s.steps)) {
      step.steps = parseSteps(s.steps);
    }

    return step;
  });
}

// ── SOUL Loader (단독) ──

/** agents/{name}/SOUL.md 에서 시스템 프롬프트만 로드 */
export async function loadSoul(agentName: string): Promise<string | null> {
  try {
    const filePath = path.join(GITAGENT_ROOT, 'agents', agentName, 'SOUL.md');
    const text = await readFile(filePath, 'utf-8');
    return text.replace(/^---[\s\S]*?---\s*/m, '').trim();
  } catch {
    return null;
  }
}

// ── All Agents ──

const ALL_ROLES: AgentRole[] = Object.keys(ROLE_TO_NAME) as AgentRole[];

/** 모든 에이전트 정의 로드 (YAML 우선, 캐시) */
export async function loadAllAgents(): Promise<Record<AgentRole, AgentDefinition>> {
  const result = {} as Record<AgentRole, AgentDefinition>;
  await Promise.all(ALL_ROLES.map(async (role) => {
    result[role] = await loadAgent(role);
  }));
  return result;
}

/** 캐시 클리어 (테스트/핫리로드용) */
export function clearLoaderCache(): void {
  agentCache.clear();
  workflowCache.clear();
}
