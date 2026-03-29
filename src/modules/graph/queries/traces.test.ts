import { describe, it, expect, beforeEach } from 'vitest';
import { storeManager } from '../store';
import { saveTrace, getTracesBySession, getTraceSteps, getTracesByAgent, getTraceStats } from './traces';

beforeEach(() => {
  storeManager.getGlobalStore().clear();
});

describe('saveTrace', () => {
  it('creates DecisionTrace + TraceStep nodes + edges', async () => {
    const result = await saveTrace({
      sessionId: 'session-1',
      agentRole: 'researcher',
      goal: 'Research AI healthcare',
      summary: 'Found 5 key trends',
      duration: 10000,
      toolsUsed: ['web_search', 'graph_search'],
      steps: [
        { stepIndex: 0, thought: 'Searching for trends', toolUsed: 'web_search', timestamp: '2026-01-01T00:00:00Z' },
        { stepIndex: 1, thought: 'Found relevant papers', timestamp: '2026-01-01T00:00:01Z' },
        { stepIndex: 2, thought: 'Adding to graph', toolUsed: 'graph_add_node', timestamp: '2026-01-01T00:00:02Z' },
      ],
    });

    expect(result.traceNode.type).toBe('DecisionTrace');
    expect(result.stepNodes.length).toBe(3);
    expect(result.stepNodes[0].type).toBe('TraceStep');

    // Edges: HAS_TRACE + EXECUTED + 3 × HAS_STEP = 5
    expect(result.edges.length).toBe(5);
    expect(result.edges.filter((e) => e.type === 'HAS_TRACE').length).toBe(1);
    expect(result.edges.filter((e) => e.type === 'EXECUTED').length).toBe(1);
    expect(result.edges.filter((e) => e.type === 'HAS_STEP').length).toBe(3);
  });

  it('stores duration in score field', async () => {
    const result = await saveTrace({
      sessionId: 'session-1',
      agentRole: 'evaluator',
      goal: 'Evaluate ideas',
      summary: 'Done',
      duration: 5000,
      toolsUsed: [],
      steps: [{ stepIndex: 0, thought: 'Evaluating', timestamp: '2026-01-01T00:00:00Z' }],
    });

    expect(result.traceNode.score).toBe(5000);
  });
});

describe('getTracesBySession', () => {
  it('returns traces for a session', async () => {
    await saveTrace({
      sessionId: 'session-A',
      agentRole: 'researcher',
      goal: 'Research',
      summary: 'Done',
      duration: 1000,
      toolsUsed: [],
      steps: [{ stepIndex: 0, thought: 'Working', timestamp: '2026-01-01T00:00:00Z' }],
    });
    await saveTrace({
      sessionId: 'session-A',
      agentRole: 'divergent_thinker',
      goal: 'Generate ideas',
      summary: 'Generated 10',
      duration: 2000,
      toolsUsed: [],
      steps: [{ stepIndex: 0, thought: 'Brainstorming', timestamp: '2026-01-01T00:00:01Z' }],
    });

    const traces = getTracesBySession('session-A');
    expect(traces.length).toBe(2);
    expect(traces.every((t) => t.type === 'DecisionTrace')).toBe(true);
  });

  it('returns empty for unknown session', () => {
    expect(getTracesBySession('nonexistent')).toEqual([]);
  });
});

describe('getTraceSteps', () => {
  it('returns steps in order', async () => {
    const result = await saveTrace({
      sessionId: 'session-1',
      agentRole: 'researcher',
      goal: 'Research',
      summary: 'Done',
      duration: 1000,
      toolsUsed: ['web_search'],
      steps: [
        { stepIndex: 0, thought: 'Step 0', timestamp: '2026-01-01T00:00:00Z' },
        { stepIndex: 1, thought: 'Step 1', toolUsed: 'web_search', timestamp: '2026-01-01T00:00:01Z' },
        { stepIndex: 2, thought: 'Step 2', timestamp: '2026-01-01T00:00:02Z' },
      ],
    });

    const steps = getTraceSteps(result.traceNode.id);
    expect(steps.length).toBe(3);
    expect(steps[0].id).toContain('step-0');
    expect(steps[1].id).toContain('step-1');
    expect(steps[2].id).toContain('step-2');
  });
});

describe('getTracesByAgent', () => {
  it('returns traces for a specific agent', async () => {
    // Need agent node for EXECUTED edge
    const store = storeManager.getGlobalStore();
    await store.addNode({ id: 'agent-researcher', type: 'Agent', title: 'researcher', description: '', createdAt: '' });

    await saveTrace({
      sessionId: 'session-1',
      agentRole: 'researcher',
      goal: 'Research AI',
      summary: 'Done',
      duration: 1000,
      toolsUsed: [],
      steps: [{ stepIndex: 0, thought: 'Working', timestamp: '2026-01-01T00:00:00Z' }],
    });

    const traces = getTracesByAgent('researcher');
    expect(traces.length).toBe(1);
  });
});

describe('getTraceStats', () => {
  it('reports correct counts', async () => {
    await saveTrace({
      sessionId: 'session-1',
      agentRole: 'researcher',
      goal: 'A',
      summary: 'Done',
      duration: 1000,
      toolsUsed: [],
      steps: [
        { stepIndex: 0, thought: 'S0', timestamp: '' },
        { stepIndex: 1, thought: 'S1', timestamp: '' },
      ],
    });

    const stats = getTraceStats();
    expect(stats.totalTraces).toBe(1);
    expect(stats.totalSteps).toBe(2);
    expect(stats.byAgent['researcher']).toBe(1);
    expect(stats.avgStepsPerTrace).toBe(2);
  });
});
