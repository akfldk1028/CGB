/** gitagent Loader — YAML/MD 파일에서 에이전트 정의 로드
 *
 * gitagent 표준 v0.1.0 준수:
 * - agents/{name}/agent.yaml → AgentDefinition
 * - agents/{name}/SOUL.md → systemPrompt
 * - workflows/{name}.yaml → WorkflowDefinition
 * - tools/{name}.yaml → ToolSchema
 *
 * Fallback: YAML 없으면 기존 definitions.ts 사용
 */

import { readFile } from 'fs/promises';
import path from 'path';
import type { AgentRole } from '@/types/agent';
import { AGENT_DEFINITIONS, type AgentDefinition } from './definitions';

// gitagent 루트 = 프로젝트 루트 (CGB/)
const GITAGENT_ROOT = path.resolve(process.cwd());

// ── YAML 파서 (경량 — js-yaml 없이 기본 파싱) ──

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  let currentKey = '';
  let currentList: string[] | null = null;

  for (const line of lines) {
    // 주석, 빈 줄 스킵
    if (line.trim().startsWith('#') || line.trim() === '' || line.trim() === '---') continue;

    // 리스트 항목
    if (line.match(/^\s+-\s+/)) {
      const val = line.replace(/^\s+-\s+/, '').trim();
      if (currentList && currentKey) {
        currentList.push(val);
        result[currentKey] = currentList;
      }
      continue;
    }

    // key: value
    const match = line.match(/^(\w[\w.-]*)\s*:\s*(.*)$/);
    if (match) {
      currentKey = match[1];
      const val = match[2].trim();

      if (val === '' || val === '>') {
        // 다음 줄에 리스트가 올 수 있음
        currentList = [];
        result[currentKey] = currentList;
      } else if (val.startsWith('[') && val.endsWith(']')) {
        // 인라인 배열
        result[currentKey] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        currentList = null;
      } else if (val === 'true') {
        result[currentKey] = true;
        currentList = null;
      } else if (val === 'false') {
        result[currentKey] = false;
        currentList = null;
      } else if (!isNaN(Number(val)) && val !== '') {
        result[currentKey] = Number(val);
        currentList = null;
      } else {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
        currentList = null;
      }
    }
  }

  return result;
}

// ── Agent Loader ──

/** agent.yaml + SOUL.md 에서 에이전트 정의 로드 */
export async function loadAgentFromYaml(agentName: string): Promise<AgentDefinition | null> {
  const agentDir = path.join(GITAGENT_ROOT, 'agents', agentName);

  try {
    const [yamlText, soulText] = await Promise.all([
      readFile(path.join(agentDir, 'agent.yaml'), 'utf-8'),
      readFile(path.join(agentDir, 'SOUL.md'), 'utf-8'),
    ]);

    const yaml = parseSimpleYaml(yamlText);

    // SOUL.md → systemPrompt (frontmatter 제거)
    const soulContent = soulText.replace(/^---[\s\S]*?---\s*/m, '').trim();

    // kebab-case → snake_case 매핑
    const roleMap: Record<string, AgentRole> = {
      'researcher': 'researcher',
      'divergent-thinker': 'divergent_thinker',
      'evaluator': 'evaluator',
      'iterator': 'iterator',
      'field-validator': 'field_validator',
      'creative-director': 'creative_director',
    };

    const role = roleMap[agentName] ?? agentName as AgentRole;
    const metadata = yaml.metadata as Record<string, unknown> | undefined;

    return {
      role,
      name: (yaml.name as string) ?? agentName,
      theory: (metadata?.theory as string) ?? '',
      phases: metadata?.phase ? [metadata.phase as string] : ['all'],
      maxSteps: ((yaml.runtime as Record<string, unknown>)?.max_turns as number) ?? 10,
      systemPrompt: soulContent,
    };
  } catch {
    return null;
  }
}

/** 에이전트 정의 로드 — YAML 우선, 없으면 definitions.ts fallback */
export async function loadAgent(role: AgentRole): Promise<AgentDefinition> {
  // role → kebab-case
  const nameMap: Record<AgentRole, string> = {
    researcher: 'researcher',
    divergent_thinker: 'divergent-thinker',
    evaluator: 'evaluator',
    iterator: 'iterator',
    field_validator: 'field-validator',
    creative_director: 'creative-director',
  };

  const agentName = nameMap[role];
  if (agentName) {
    const fromYaml = await loadAgentFromYaml(agentName);
    if (fromYaml) return fromYaml;
  }

  // Fallback to hardcoded definitions
  return AGENT_DEFINITIONS[role];
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
}

export interface WorkflowDefinition {
  name: string;
  version: string;
  description: string;
  steps: WorkflowStep[];
}

/** workflows/{name}.yaml 로드 */
export async function loadWorkflow(name: string): Promise<WorkflowDefinition | null> {
  try {
    const filePath = path.join(GITAGENT_ROOT, 'workflows', `${name}.yaml`);
    const text = await readFile(filePath, 'utf-8');

    // 워크플로우 YAML은 구조가 복잡하므로 기본 정보만 추출
    const yaml = parseSimpleYaml(text);

    return {
      name: (yaml.name as string) ?? name,
      version: (yaml.version as string) ?? '1.0.0',
      description: (yaml.description as string) ?? '',
      steps: [], // workflow-engine에서 직접 파싱
    };
  } catch {
    return null;
  }
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

// ── All Agents Loader ──

const ALL_AGENT_NAMES: AgentRole[] = [
  'researcher', 'divergent_thinker', 'evaluator',
  'iterator', 'field_validator', 'creative_director',
];

/** 모든 에이전트 정의 로드 (YAML 우선) */
export async function loadAllAgents(): Promise<Record<AgentRole, AgentDefinition>> {
  const result = {} as Record<AgentRole, AgentDefinition>;
  for (const role of ALL_AGENT_NAMES) {
    result[role] = await loadAgent(role);
  }
  return result;
}
