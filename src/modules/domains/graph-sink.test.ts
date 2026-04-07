import { describe, it, expect } from 'vitest';
import { resultToNode, extractFieldByPath } from './graph-sink';
import type { DomainToolConfig } from './types';

describe('graph-sink', () => {
  describe('extractFieldByPath', () => {
    it('should extract top-level field', () => {
      expect(extractFieldByPath({ name: 'hello' }, '$.name')).toBe('hello');
    });

    it('should extract nested field', () => {
      expect(extractFieldByPath({ a: { b: 'deep' } }, '$.a.b')).toBe('deep');
    });

    it('should return undefined for missing field', () => {
      expect(extractFieldByPath({ a: 1 }, '$.b')).toBeUndefined();
    });
  });

  describe('resultToNode', () => {
    const toolWithMapping: DomainToolConfig = {
      name: 'search_law',
      source_tool: 'search_law',
      tier: 'free',
      graph: {
        auto_save: true,
        node_type: 'Concept',
        mapping: {
          title: '$.lawNameKorean',
          description: '$.lawName',
          metadata: ['$.lawId', '$.mst'],
        },
      },
    };

    it('should map fields using JSONPath mapping', () => {
      const result = { lawNameKorean: '민법', lawName: 'Civil Act', lawId: '123', mst: '456' };
      const node = resultToNode(result, toolWithMapping, 'korean-law', 'agent-1');
      expect(node.title).toBe('민법');
      expect(node.description).toBe('Civil Act');
      expect(node.type).toBe('Concept');
      expect(node.domain).toBe('korean-law');
      expect(node.agentId).toBe('agent-1');
    });

    const toolWithoutMapping: DomainToolConfig = {
      name: 'some_tool',
      source_tool: 'some_tool',
      tier: 'pro',
      graph: { auto_save: true, node_type: 'Idea' },
    };

    it('should auto-detect title/description by convention', () => {
      const result = { title: 'My Title', description: 'My Desc' };
      const node = resultToNode(result, toolWithoutMapping, 'test', undefined);
      expect(node.title).toBe('My Title');
      expect(node.description).toBe('My Desc');
    });

    it('should fallback to JSON when no known fields', () => {
      const result = { x: 1, y: 2 };
      const node = resultToNode(result, toolWithoutMapping, 'test', undefined);
      expect(node.title).toContain('some_tool');
      expect(node.description).toContain('"x"');
    });
  });
});
