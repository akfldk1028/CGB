/** Synthetic Data Pipeline — 합성 그래프 데이터 생성
 *
 * CCG 패턴: entity seed → relationship weave → document gen → trace
 * CGB 적용: Domain → Topic → Idea(20+) → Concept(5+) → edges → traces
 *
 * LLM 불필요. 정적 데이터로 리얼한 데모 그래프 생성.
 * API seed 엔드포인트, 테스트, 데모에서 활용.
 */

import { storeManager, type StoreNode, type StoreEdge } from '../store';
import type { GenerationMethod } from '../schema';

// ═══════════════════════════════════════════
// Seed Data Pools
// ═══════════════════════════════════════════

const DOMAINS = [
  { name: 'Healthcare', keywords: ['AI', 'diagnostics', 'telemedicine', 'wearable'] },
  { name: 'Education', keywords: ['personalized', 'adaptive', 'gamification', 'VR'] },
  { name: 'Fintech', keywords: ['blockchain', 'micro-lending', 'robo-advisor', 'DeFi'] },
];

const IDEA_POOL: Array<{
  title: string;
  domain: string;
  method: GenerationMethod;
  phase: string;
}> = [
  // Healthcare
  { title: 'AI-Powered Symptom Checker', domain: 'Healthcare', method: 'divergent_brainstorm', phase: 'inspiration' },
  { title: 'Wearable Vital Monitor', domain: 'Healthcare', method: 'web_research', phase: 'immersion' },
  { title: 'Telemedicine AR Consultation', domain: 'Healthcare', method: 'scamper_combine', phase: 'iteration' },
  { title: 'Mental Health Chatbot', domain: 'Healthcare', method: 'agent_autonomous', phase: 'inspiration' },
  { title: 'Drug Interaction Predictor', domain: 'Healthcare', method: 'graph_traversal', phase: 'immersion' },
  { title: 'Elderly Care Robot Assistant', domain: 'Healthcare', method: 'scamper_adapt', phase: 'iteration' },
  { title: 'Genomic Treatment Planner', domain: 'Healthcare', method: 'divergent_brainstorm', phase: 'inspiration' },
  // Education
  { title: 'Adaptive Learning Engine', domain: 'Education', method: 'divergent_brainstorm', phase: 'inspiration' },
  { title: 'VR History Classroom', domain: 'Education', method: 'visual_inspiration', phase: 'inspiration' },
  { title: 'Peer Tutoring Marketplace', domain: 'Education', method: 'scamper_substitute', phase: 'iteration' },
  { title: 'Gamified Math Practice', domain: 'Education', method: 'scamper_combine', phase: 'iteration' },
  { title: 'AI Essay Feedback System', domain: 'Education', method: 'agent_autonomous', phase: 'inspiration' },
  { title: 'Skill Gap Analyzer', domain: 'Education', method: 'web_research', phase: 'immersion' },
  // Fintech
  { title: 'Micro-Lending Platform', domain: 'Fintech', method: 'divergent_brainstorm', phase: 'inspiration' },
  { title: 'Robo-Advisor with ESG', domain: 'Fintech', method: 'scamper_modify', phase: 'iteration' },
  { title: 'Blockchain Supply Chain Finance', domain: 'Fintech', method: 'scamper_combine', phase: 'iteration' },
  { title: 'Personal Finance AI Coach', domain: 'Fintech', method: 'agent_autonomous', phase: 'inspiration' },
  { title: 'DeFi Insurance Protocol', domain: 'Fintech', method: 'divergent_brainstorm', phase: 'inspiration' },
  { title: 'Cross-Border Payment Optimizer', domain: 'Fintech', method: 'web_research', phase: 'immersion' },
  { title: 'AI Credit Scoring Engine', domain: 'Fintech', method: 'graph_traversal', phase: 'immersion' },
];

const CONCEPT_POOL = [
  { name: 'Transfer Learning', domains: ['Healthcare', 'Education'] },
  { name: 'Attention Mechanism', domains: ['Healthcare', 'Fintech'] },
  { name: 'Federated Learning', domains: ['Healthcare', 'Fintech'] },
  { name: 'Reinforcement Learning', domains: ['Education'] },
  { name: 'Knowledge Graph', domains: ['Healthcare', 'Education', 'Fintech'] },
  { name: 'Natural Language Processing', domains: ['Education', 'Healthcare'] },
  { name: 'Blockchain Consensus', domains: ['Fintech'] },
  { name: 'Gamification Theory', domains: ['Education'] },
];

const AGENT_ROLES = ['researcher', 'divergent_thinker', 'evaluator', 'field_validator', 'iterator'];

// ═══════════════════════════════════════════
// Generator
// ═══════════════════════════════════════════

let edgeCounter = 0;
function edgeId(type: string): string {
  return `seed-edge-${type.toLowerCase()}-${edgeCounter++}`;
}

export interface SeedResult {
  domains: number;
  topics: number;
  ideas: number;
  concepts: number;
  agents: number;
  sessions: number;
  traces: number;
  traceSteps: number;
  edges: number;
}

/** 합성 데이터 생성 → InMemoryGraphStore에 적재 */
export function generateSeedData(): SeedResult {
  const store = storeManager.getGlobalStore();
  store.clear();
  edgeCounter = 0;

  const now = new Date().toISOString();
  const nodes: StoreNode[] = [];
  const edges: StoreEdge[] = [];

  // 1. Domains
  for (const d of DOMAINS) {
    nodes.push({
      id: `domain-${d.name.toLowerCase()}`,
      type: 'Domain',
      title: d.name,
      description: `${d.name} domain — ${d.keywords.join(', ')}`,
      tags: d.keywords,
      createdAt: now,
    });
  }

  // 2. Sessions + Topics (1 per domain)
  for (const d of DOMAINS) {
    const sessionId = `session-seed-${d.name.toLowerCase()}`;
    const topicId = `topic-seed-${d.name.toLowerCase()}`;

    nodes.push({
      id: sessionId,
      type: 'Session',
      title: `Session: ${d.name} Ideation`,
      description: `Seed session for ${d.name}`,
      createdAt: now,
    });

    nodes.push({
      id: topicId,
      type: 'Topic',
      title: `${d.name} Innovation`,
      description: `Creative ideation for ${d.name} domain`,
      createdAt: now,
    });

    edges.push({ id: edgeId('BELONGS_TO'), source: topicId, target: `domain-${d.name.toLowerCase()}`, type: 'BELONGS_TO', createdAt: now });
  }

  // 3. Ideas
  const ideaNodes: StoreNode[] = [];
  for (const idea of IDEA_POOL) {
    const id = `idea-seed-${idea.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const node: StoreNode = {
      id,
      type: 'Idea',
      title: idea.title,
      description: `${idea.title} — generated via ${idea.method} in ${idea.phase} phase`,
      method: idea.method,
      tags: [idea.phase, idea.domain.toLowerCase()],
      score: 40 + Math.floor(Math.random() * 60), // 40~100
      createdAt: now,
    };
    nodes.push(node);
    ideaNodes.push(node);

    // Idea → Topic
    edges.push({ id: edgeId('ADDRESSES_TOPIC'), source: id, target: `topic-seed-${idea.domain.toLowerCase()}`, type: 'ADDRESSES_TOPIC', createdAt: now });
    // Idea → Session
    edges.push({ id: edgeId('PRODUCED_IN'), source: id, target: `session-seed-${idea.domain.toLowerCase()}`, type: 'PRODUCED_IN', createdAt: now });
  }

  // 4. Concepts
  for (const c of CONCEPT_POOL) {
    const id = `concept-seed-${c.name.toLowerCase().replace(/\s+/g, '-')}`;
    nodes.push({
      id,
      type: 'Concept',
      title: c.name,
      description: `Core concept: ${c.name}`,
      tags: c.domains.map((d) => d.toLowerCase()),
      createdAt: now,
    });

    // USES_CONCEPT edges (random ideas in matching domains)
    const matchingIdeas = ideaNodes.filter((n) =>
      c.domains.some((d) => n.tags?.includes(d.toLowerCase()))
    );
    for (const idea of matchingIdeas.slice(0, 3)) {
      edges.push({ id: edgeId('USES_CONCEPT'), source: idea.id, target: id, type: 'USES_CONCEPT', createdAt: now });
    }
  }

  // 5. Agents
  for (const role of AGENT_ROLES) {
    nodes.push({
      id: `agent-${role}`,
      type: 'Agent',
      title: role,
      description: `Agent: ${role}`,
      method: 'internal',
      tags: [],
      createdAt: now,
    });
  }

  // 6. Idea-to-Idea edges (creation + semantic)
  // INSPIRED_BY: ideas in same domain
  for (const d of DOMAINS) {
    const domainIdeas = ideaNodes.filter((n) => n.tags?.includes(d.name.toLowerCase()));
    for (let i = 1; i < domainIdeas.length; i++) {
      if (Math.random() < 0.5) {
        edges.push({ id: edgeId('INSPIRED_BY'), source: domainIdeas[i].id, target: domainIdeas[i - 1].id, type: 'INSPIRED_BY', createdAt: now });
      }
    }
  }

  // SIMILAR_TO: ideas with same method
  const byMethod = new Map<string, StoreNode[]>();
  for (const idea of ideaNodes) {
    const m = idea.method ?? 'unknown';
    if (!byMethod.has(m)) byMethod.set(m, []);
    byMethod.get(m)!.push(idea);
  }
  for (const group of byMethod.values()) {
    if (group.length >= 2) {
      edges.push({ id: edgeId('SIMILAR_TO'), source: group[0].id, target: group[1].id, type: 'SIMILAR_TO', createdAt: now });
    }
  }

  // GENERATED_BY: random agent → idea
  for (const idea of ideaNodes) {
    const agentRole = AGENT_ROLES[Math.floor(Math.random() * 2)]; // researcher or divergent
    edges.push({ id: edgeId('GENERATED_BY'), source: `agent-${agentRole}`, target: idea.id, type: 'GENERATED_BY', createdAt: now });
  }

  // 7. DecisionTraces (1 per session)
  let traceStepCount = 0;
  for (const d of DOMAINS) {
    const sessionId = `session-seed-${d.name.toLowerCase()}`;
    const traceId = `trace-seed-${d.name.toLowerCase()}`;

    nodes.push({
      id: traceId,
      type: 'DecisionTrace',
      title: `researcher: ${d.name} research`,
      description: `Explored ${d.name} domain trends`,
      method: 'researcher',
      tags: ['web_search', 'graph_search'],
      score: 8000 + Math.floor(Math.random() * 4000),
      createdAt: now,
    });

    edges.push({ id: edgeId('HAS_TRACE'), source: sessionId, target: traceId, type: 'HAS_TRACE', createdAt: now });
    edges.push({ id: edgeId('EXECUTED'), source: 'agent-researcher', target: traceId, type: 'EXECUTED', createdAt: now });

    // 3 TraceSteps per trace
    for (let s = 0; s < 3; s++) {
      const stepId = `${traceId}-step-${s}`;
      const thoughts = [
        `Searching for ${d.name.toLowerCase()} trends`,
        `Found relevant research on ${d.keywords[0]}`,
        `Adding concepts to knowledge graph`,
      ];
      nodes.push({
        id: stepId,
        type: 'TraceStep',
        title: `[${s === 1 ? 'web_search' : s === 2 ? 'graph_add_node' : 'think'}] ${thoughts[s]}`,
        description: thoughts[s],
        method: s === 1 ? 'web_search' : s === 2 ? 'graph_add_node' : undefined,
        createdAt: now,
      });
      edges.push({ id: edgeId('HAS_STEP'), source: traceId, target: stepId, type: 'HAS_STEP', createdAt: now });
      traceStepCount++;
    }
  }

  // Load all into store
  store.merge(nodes, edges);

  return {
    domains: DOMAINS.length,
    topics: DOMAINS.length,
    ideas: IDEA_POOL.length,
    concepts: CONCEPT_POOL.length,
    agents: AGENT_ROLES.length,
    sessions: DOMAINS.length,
    traces: DOMAINS.length,
    traceSteps: traceStepCount,
    edges: edges.length,
  };
}
