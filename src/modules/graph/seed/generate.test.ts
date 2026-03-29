import { describe, it, expect } from 'vitest';
import { generateSeedData } from './generate';
import { storeManager } from '../store';
import { runPageRank } from '../algorithms/pagerank';
import { runLouvain } from '../algorithms/louvain';
import { runSimilarity } from '../algorithms/similarity';
import { getTracesBySession, getTraceSteps } from '../queries/traces';

describe('Seed Data Pipeline', () => {
  it('generates expected node/edge counts', () => {
    const result = generateSeedData();

    expect(result.domains).toBe(3);
    expect(result.ideas).toBe(20);
    expect(result.concepts).toBe(8);
    expect(result.agents).toBe(5);
    expect(result.traces).toBe(3);
    expect(result.traceSteps).toBe(9);
    expect(result.edges).toBeGreaterThan(50);
  });

  it('populates the store with correct types', () => {
    generateSeedData();
    const store = storeManager.getGlobalStore();
    const nodes = store.getAllNodes();

    const byType = new Map<string, number>();
    for (const n of nodes) {
      byType.set(n.type, (byType.get(n.type) ?? 0) + 1);
    }

    expect(byType.get('Domain')).toBe(3);
    expect(byType.get('Idea')).toBe(20);
    expect(byType.get('Concept')).toBe(8);
    expect(byType.get('Agent')).toBe(5);
    expect(byType.get('Session')).toBe(3);
    expect(byType.get('DecisionTrace')).toBe(3);
    expect(byType.get('TraceStep')).toBe(9);
    expect(byType.get('Topic')).toBe(3);
  });

  it('PageRank works on seed data', () => {
    generateSeedData();
    const results = runPageRank({ topK: 5 });
    expect(results.length).toBe(5);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('Louvain finds communities in seed data', () => {
    generateSeedData();
    const result = runLouvain({ nodeTypes: ['Idea'] });
    expect(result.communityCount).toBeGreaterThanOrEqual(1);
    expect(result.communities.length).toBe(20);
  });

  it('Similarity finds pairs in seed data', () => {
    generateSeedData();
    const pairs = runSimilarity({ nodeTypes: ['Idea'], minSimilarity: 0 });
    expect(pairs.length).toBeGreaterThan(0);
  });

  it('Traces are queryable after seed', () => {
    generateSeedData();
    const traces = getTracesBySession('session-seed-healthcare');
    expect(traces.length).toBe(1);

    const steps = getTraceSteps(traces[0].id);
    expect(steps.length).toBe(3);
  });
});
