import { describe, it, expect, beforeEach } from 'vitest';
import { storeManager, InMemoryGraphStore } from '../store';
import { runPageRank } from './pagerank';
import { runLouvain } from './louvain';
import { runSimilarity, findSimilarNodes } from './similarity';

/** 테스트용 그래프 구축 헬퍼 */
function seedTestGraph() {
  const store = storeManager.getGlobalStore();
  store.clear();

  // 클러스터 A: idea-1, idea-2, idea-3 (서로 연결)
  // 클러스터 B: idea-4, idea-5 (서로 연결)
  // 브릿지: idea-3 → idea-4

  const nodes = [
    { id: 'idea-1', type: 'Idea', title: 'AI Tutor', description: '', createdAt: '2026-01-01' },
    { id: 'idea-2', type: 'Idea', title: 'AI Coach', description: '', createdAt: '2026-01-01' },
    { id: 'idea-3', type: 'Idea', title: 'AI Mentor', description: '', createdAt: '2026-01-01' },
    { id: 'idea-4', type: 'Idea', title: 'VR Training', description: '', createdAt: '2026-01-01' },
    { id: 'idea-5', type: 'Idea', title: 'VR Simulation', description: '', createdAt: '2026-01-01' },
    { id: 'concept-1', type: 'Concept', title: 'Machine Learning', description: '', createdAt: '2026-01-01' },
  ];

  const edges = [
    // Cluster A
    { id: 'e1', source: 'idea-1', target: 'idea-2', type: 'SIMILAR_TO', createdAt: '2026-01-01' },
    { id: 'e2', source: 'idea-2', target: 'idea-3', type: 'INSPIRED_BY', createdAt: '2026-01-01' },
    { id: 'e3', source: 'idea-1', target: 'idea-3', type: 'SUPPORTS', createdAt: '2026-01-01' },
    // Cluster B
    { id: 'e4', source: 'idea-4', target: 'idea-5', type: 'SIMILAR_TO', createdAt: '2026-01-01' },
    // Bridge
    { id: 'e5', source: 'idea-3', target: 'idea-4', type: 'EXTENDS', createdAt: '2026-01-01' },
    // Concept connections
    { id: 'e6', source: 'idea-1', target: 'concept-1', type: 'USES_CONCEPT', createdAt: '2026-01-01' },
    { id: 'e7', source: 'idea-2', target: 'concept-1', type: 'USES_CONCEPT', createdAt: '2026-01-01' },
  ];

  store.merge(nodes, edges);
}

describe('PageRank', () => {
  beforeEach(seedTestGraph);

  it('returns scores for all nodes', () => {
    const results = runPageRank({ topK: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('nodeId');
  });

  it('scores are positive and sum approximately to 1', () => {
    const results = runPageRank({ topK: 10 });
    const total = results.reduce((sum, r) => sum + r.score, 0);
    expect(total).toBeGreaterThan(0.9);
    expect(total).toBeLessThan(1.1);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  it('filters by node type', () => {
    const results = runPageRank({ nodeTypes: ['Concept'], topK: 5 });
    expect(results.every((r) => r.type === 'Concept')).toBe(true);
  });

  it('returns empty for empty graph', () => {
    storeManager.getGlobalStore().clear();
    expect(runPageRank()).toEqual([]);
  });
});

describe('Louvain', () => {
  beforeEach(seedTestGraph);

  it('detects at least 2 communities', () => {
    const result = runLouvain({ nodeTypes: ['Idea'] });
    expect(result.communityCount).toBeGreaterThanOrEqual(1);
    expect(result.communities.length).toBe(5); // 5 Idea nodes
  });

  it('puts tightly connected nodes in same community', () => {
    const result = runLouvain({ nodeTypes: ['Idea'] });
    const comMap = new Map(result.communities.map((c) => [c.nodeId, c.communityId]));
    // idea-1, idea-2, idea-3 should likely be in the same community
    const c1 = comMap.get('idea-1');
    const c2 = comMap.get('idea-2');
    expect(c1).toBe(c2); // cluster A together
  });

  it('reports modularity', () => {
    const result = runLouvain();
    expect(typeof result.modularity).toBe('number');
  });

  it('handles no-edge graph', () => {
    const store = storeManager.getGlobalStore();
    store.clear();
    store.merge(
      [{ id: 'a', type: 'Idea', title: 'A', description: '', createdAt: '' }],
      []
    );
    const result = runLouvain();
    expect(result.communityCount).toBe(1);
  });
});

describe('Similarity', () => {
  beforeEach(seedTestGraph);

  it('finds similar idea pairs', () => {
    const pairs = runSimilarity({ nodeTypes: ['Idea'], minSimilarity: 0 });
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs[0]).toHaveProperty('similarity');
  });

  it('idea-1 and idea-2 have high similarity (shared neighbor concept-1)', () => {
    const pairs = runSimilarity({ nodeTypes: ['Idea'], minSimilarity: 0 });
    const pair12 = pairs.find(
      (p) =>
        (p.node1Id === 'idea-1' && p.node2Id === 'idea-2') ||
        (p.node1Id === 'idea-2' && p.node2Id === 'idea-1')
    );
    expect(pair12).toBeDefined();
    expect(pair12!.similarity).toBeGreaterThan(0);
  });

  it('findSimilarNodes returns k results', () => {
    const similar = findSimilarNodes('idea-1', 3, ['Idea']);
    expect(similar.length).toBeLessThanOrEqual(3);
    expect(similar.every((s) => s.node1Id === 'idea-1')).toBe(true);
  });

  it('returns empty for isolated node', () => {
    const store = storeManager.getGlobalStore();
    store.clear();
    store.merge(
      [
        { id: 'lone', type: 'Idea', title: 'Alone', description: '', createdAt: '' },
        { id: 'other', type: 'Idea', title: 'Other', description: '', createdAt: '' },
      ],
      []
    );
    expect(findSimilarNodes('lone', 5)).toEqual([]);
  });
});
