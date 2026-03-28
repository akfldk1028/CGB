/** Workflow Engine — YAML 워크플로우를 실제로 읽고 DAG 실행
 *
 * workflows/four-is-heavy.yaml의 steps를 파싱하여:
 * - depends_on 기반 DAG 실행 (병렬 가능한 건 병렬)
 * - agent 지정 스텝은 에이전트 실행
 * - 에이전트 간 context를 Graph 쿼리로 전달
 */

import { runAgent, type AgentRunResult } from './agent-runner';
import { loadWorkflow, type WorkflowStep } from './loader';
import { getImmersionContext } from '@/modules/graph/service';
import { storeManager } from '@/modules/graph/store';
import { tournamentSelect } from '@/modules/creativity/evaluation/judge';
import type { AgentRole } from '@/types/agent';

// ── Types ──

interface StepResult {
  stepId: string;
  agentResult?: AgentRunResult;
  output: string;
  nodesCreated: number;
  edgesCreated: number;
  duration: number;
}

export interface WorkflowResult {
  workflowName: string;
  sessionId: string;
  topic: string;
  domain: string;
  stepResults: StepResult[];
  totalNodesCreated: number;
  totalEdgesCreated: number;
  totalDuration: number;
}

// ── Agent name → role 매핑 ──

const AGENT_ROLE_MAP: Record<string, AgentRole> = {
  'researcher': 'researcher',
  'divergent-thinker': 'divergent_thinker',
  'evaluator': 'evaluator',
  'iterator': 'iterator',
  'field-validator': 'field_validator',
  'creative-director': 'creative_director',
};

// ── Engine ──

/** 워크플로우 실행 — YAML 파일에서 스텝 로드 + DAG 실행 */
export async function runWorkflow(
  topic: string,
  domain: string,
  workflowName = 'four-is-heavy',
): Promise<WorkflowResult> {
  const sessionId = `session-${Date.now()}`;
  const startTime = Date.now();

  // YAML 워크플로우 로드
  const workflow = await loadWorkflow(workflowName);

  if (workflow && workflow.steps.length > 0) {
    // YAML 기반 DAG 실행
    return runFromYaml(workflow, sessionId, topic, domain, startTime);
  }

  // Fallback: 하드코딩 파이프라인
  return runHardcoded(sessionId, topic, domain, startTime);
}

/** YAML 워크플로우 DAG 실행 */
async function runFromYaml(
  workflow: { name: string; steps: WorkflowStep[] },
  sessionId: string,
  topic: string,
  domain: string,
  startTime: number,
): Promise<WorkflowResult> {
  const stepResults: StepResult[] = [];
  const completed = new Set<string>();

  // Graph에서 기존 지식 로드
  let graphContext = '';
  try {
    graphContext = await getImmersionContext(topic, domain);
  } catch {
    graphContext = 'No prior knowledge found.';
  }

  const sessionContext = `Topic: "${topic}"\nDomain: "${domain}"\nSession: ${sessionId}`;
  const baseContext = `${sessionContext}\n\nPrior Knowledge:\n${graphContext}`;

  // 스텝을 의존성 순서로 실행
  const allSteps = flattenSteps(workflow.steps);
  let remaining = [...allSteps];

  while (remaining.length > 0) {
    // 실행 가능한 스텝 찾기 (의존성 모두 완료된 것)
    const ready = remaining.filter((s) =>
      !s.depends_on || s.depends_on.every((dep) => completed.has(dep))
    );

    if (ready.length === 0) {
      // 순환 의존성 또는 오류 — 남은 스텝 강제 실행
      console.warn('[workflow] circular dependency detected, forcing remaining steps');
      ready.push(remaining[0]);
    }

    // 병렬 실행 가능한 스텝은 동시에
    const results = await Promise.all(
      ready.map((step) => executeStep(step, topic, domain, baseContext))
    );

    for (let i = 0; i < ready.length; i++) {
      stepResults.push(results[i]);
      completed.add(ready[i].id);
    }

    remaining = remaining.filter((s) => !completed.has(s.id));
  }

  // Tournament (evaluation 후 자동 실행)
  await runTournamentIfNeeded(domain);

  return {
    workflowName: workflow.name,
    sessionId,
    topic,
    domain,
    stepResults,
    totalNodesCreated: stepResults.reduce((s, r) => s + r.nodesCreated, 0),
    totalEdgesCreated: stepResults.reduce((s, r) => s + r.edgesCreated, 0),
    totalDuration: Date.now() - startTime,
  };
}

/** 병렬 서브스텝을 포함한 스텝 평탄화 */
function flattenSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const flat: WorkflowStep[] = [];
  for (const step of steps) {
    if (step.parallel && step.steps) {
      // 병렬 스텝의 서브스텝들은 동일한 depends_on을 상속
      for (const sub of step.steps) {
        flat.push({
          ...sub,
          depends_on: sub.depends_on ?? step.depends_on,
        });
      }
    } else {
      flat.push(step);
    }
  }
  return flat;
}

/** 단일 스텝 실행 */
async function executeStep(
  step: WorkflowStep,
  topic: string,
  domain: string,
  baseContext: string,
): Promise<StepResult> {
  if (!step.agent) {
    // 에이전트 없는 스텝 (tournament 등) — 스킵
    return { stepId: step.id, output: step.action, nodesCreated: 0, edgesCreated: 0, duration: 0 };
  }

  const role = AGENT_ROLE_MAP[step.agent];
  if (!role) {
    return { stepId: step.id, output: `Unknown agent: ${step.agent}`, nodesCreated: 0, edgesCreated: 0, duration: 0 };
  }

  const startTime = Date.now();

  // Graph 기반 context — 에이전트에게 graph_search를 사용하라고 지시
  const context = `${baseContext}\n\nInstruction: Use graph_search to discover what previous agents have written to the graph. Build on their work.`;

  const agentResult = await runAgent(
    role,
    `${step.action} Topic: "${topic}", Domain: "${domain}".`,
    context,
    undefined, // maxSteps는 loadAgent에서 결정
    domain,
  );

  return {
    stepId: step.id,
    agentResult,
    output: agentResult.finalOutput,
    nodesCreated: agentResult.nodesCreated,
    edgesCreated: agentResult.edgesCreated,
    duration: Date.now() - startTime,
  };
}

/** Tournament — Idea 노드가 충분하면 LLM-as-Judge 실행 */
async function runTournamentIfNeeded(domain: string): Promise<void> {
  const store = storeManager.getGlobalStore();
  const ideaNodes = store.getAllNodes().filter((n) => n.type === 'Idea');
  if (ideaNodes.length < 4) return;

  const candidates = ideaNodes.map((n) => ({ title: n.title, description: n.description }));
  try {
    await tournamentSelect(candidates, domain, Math.min(5, Math.ceil(candidates.length / 2)));
  } catch { /* tournament is best-effort */ }
}

/** Fallback: YAML 없을 때 하드코딩 파이프라인 (기존 호환) */
async function runHardcoded(
  sessionId: string,
  topic: string,
  domain: string,
  startTime: number,
): Promise<WorkflowResult> {
  const stepResults: StepResult[] = [];
  const sessionContext = `Topic: "${topic}"\nDomain: "${domain}"\nSession: ${sessionId}`;

  let graphContext = '';
  try { graphContext = await getImmersionContext(topic, domain); } catch { graphContext = ''; }
  const context = `${sessionContext}\n\nPrior Knowledge:\n${graphContext}\n\nInstruction: Use graph_search to discover what previous agents have written. Build on their work.`;

  // 순차 실행
  for (const [stepId, agentName, action] of [
    ['immersion', 'researcher', `Research "${topic}" in "${domain}". Save Concept nodes.`],
    ['inspiration', 'divergent-thinker', `Generate 10+ ideas about "${topic}". Use SCAMPER, TRIZ.`],
    ['evaluate', 'evaluator', `Evaluate all Idea nodes. Score on 6 dimensions.`],
    ['validate', 'field-validator', `Validate ideas against market reality.`],
    ['iteration', 'iterator', `Iterate top ideas with cross-domain transfer.`],
  ] as const) {
    const role = AGENT_ROLE_MAP[agentName];
    if (!role) continue;
    const st = Date.now();
    const result = await runAgent(role, action, context, undefined, domain);
    stepResults.push({
      stepId, agentResult: result, output: result.finalOutput,
      nodesCreated: result.nodesCreated, edgesCreated: result.edgesCreated,
      duration: Date.now() - st,
    });
  }

  await runTournamentIfNeeded(domain);

  return {
    workflowName: 'four-is-heavy-fallback',
    sessionId, topic, domain, stepResults,
    totalNodesCreated: stepResults.reduce((s, r) => s + r.nodesCreated, 0),
    totalEdgesCreated: stepResults.reduce((s, r) => s + r.edgesCreated, 0),
    totalDuration: Date.now() - startTime,
  };
}
