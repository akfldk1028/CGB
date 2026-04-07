import { describe, it, expect, beforeEach } from 'vitest';
import { DomainRegistry } from './registry';
import path from 'path';

const FIXTURE_ROOT = path.resolve(__dirname, '../../../domains');

describe('DomainRegistry', () => {
  let registry: DomainRegistry;

  beforeEach(async () => {
    registry = new DomainRegistry(FIXTURE_ROOT);
    await registry.loadAll();
  });

  it('should load korean-law domain from YAML', () => {
    const domain = registry.get('korean-law');
    expect(domain).not.toBeNull();
    expect(domain!.name).toBe('korean-law');
    expect(domain!.connection.transport).toBe('http');
  });

  it('should skip _template directory', () => {
    const domain = registry.get('_template');
    expect(domain).toBeNull();
  });

  it('should list all domains', () => {
    const domains = registry.list();
    expect(domains.length).toBeGreaterThanOrEqual(1);
    expect(domains.some(d => d.name === 'korean-law')).toBe(true);
  });

  it('should load tool configs for a domain', () => {
    const tools = registry.getTools('korean-law');
    expect(tools.length).toBeGreaterThanOrEqual(1);
    expect(tools[0].name).toBeDefined();
    expect(tools[0].source_tool).toBeDefined();
    expect(tools[0].tier).toBeDefined();
  });

  it('should filter tools by tier', () => {
    const freeTools = registry.getTools('korean-law', 'free');
    const proTools = registry.getTools('korean-law', 'pro');
    expect(freeTools.length).toBeLessThanOrEqual(proTools.length);
  });

  it('should return null for unknown domain', () => {
    expect(registry.get('nonexistent')).toBeNull();
  });
});
