import { describe, it, expect } from 'vitest';
import { loadDomain, listDomains, validateNodeType, validateEdgeType } from './ontology-loader';

describe('loadDomain', () => {
  it('loads creativity domain with base merge', async () => {
    const ontology = await loadDomain('creativity');

    expect(ontology.domain.id).toBe('creativity');
    expect(ontology.domain.name).toBe('Creative Ideation');
  });

  it('has 9 node types from _base.yaml', async () => {
    const ontology = await loadDomain('creativity');
    expect(ontology.nodeTypes.size).toBe(9);

    expect(ontology.nodeTypes.has('Domain')).toBe(true);
    expect(ontology.nodeTypes.has('Idea')).toBe(true);
    expect(ontology.nodeTypes.has('DecisionTrace')).toBe(true);
    expect(ontology.nodeTypes.has('TraceStep')).toBe(true);
    expect(ontology.nodeTypes.has('Agent')).toBe(true);
  });

  it('has 25 edge types from _base.yaml', async () => {
    const ontology = await loadDomain('creativity');
    expect(ontology.edgeTypes.size).toBe(25);

    expect(ontology.edgeTypes.has('INSPIRED_BY')).toBe(true);
    expect(ontology.edgeTypes.has('HAS_TRACE')).toBe(true);
    expect(ontology.edgeTypes.has('HAS_STEP')).toBe(true);
    expect(ontology.edgeTypes.has('EXECUTED')).toBe(true);
  });

  it('has edge categories', async () => {
    const ontology = await loadDomain('creativity');
    const inspired = ontology.edgeTypes.get('INSPIRED_BY')!;
    expect(inspired.category).toBe('creation');

    const similar = ontology.edgeTypes.get('SIMILAR_TO')!;
    expect(similar.category).toBe('semantic');

    const hasTrace = ontology.edgeTypes.get('HAS_TRACE')!;
    expect(hasTrace.category).toBe('structural');
  });

  it('has generation methods', async () => {
    const ontology = await loadDomain('creativity');
    expect(ontology.generationMethods.length).toBe(20);
    expect(ontology.generationMethods).toContain('divergent_brainstorm');
    expect(ontology.generationMethods).toContain('multi_model_debate');
  });

  it('has agent roles from domain YAML', async () => {
    const ontology = await loadDomain('creativity');
    expect(ontology.agentRoles.length).toBe(5);
    expect(ontology.agentRoles[0].role).toBe('researcher');
  });

  it('generates Cypher index statements', async () => {
    const ontology = await loadDomain('creativity');
    const cypher = ontology.generateCypher();
    expect(cypher).toContain('CREATE INDEX ON :Domain(id)');
    expect(cypher).toContain('CREATE INDEX ON :Idea(id)');
    expect(cypher).toContain('CREATE INDEX ON :DecisionTrace(id)');
  });

  it('generates human-readable summary', async () => {
    const ontology = await loadDomain('creativity');
    const summary = ontology.generateSummary();
    expect(summary).toContain('CreativeGraph Ontology');
    expect(summary).toContain('creation');
    expect(summary).toContain('semantic');
    expect(summary).toContain('structural');
  });
});

describe('listDomains', () => {
  it('finds at least creativity domain', async () => {
    const domains = await listDomains();
    expect(domains.length).toBeGreaterThanOrEqual(1);
    expect(domains.find((d) => d.id === 'creativity')).toBeDefined();
  });
});

describe('validateNodeType', () => {
  it('validates known types', async () => {
    const ontology = await loadDomain('creativity');
    expect(validateNodeType(ontology, 'Idea')).toBe(true);
    expect(validateNodeType(ontology, 'DecisionTrace')).toBe(true);
    expect(validateNodeType(ontology, 'FakeNode')).toBe(false);
  });
});

describe('validateEdgeType', () => {
  it('validates known types', async () => {
    const ontology = await loadDomain('creativity');
    expect(validateEdgeType(ontology, 'INSPIRED_BY')).toBe(true);
    expect(validateEdgeType(ontology, 'HAS_STEP')).toBe(true);
    expect(validateEdgeType(ontology, 'FAKE_EDGE')).toBe(false);
  });
});
