import { describe, it, expect, beforeEach } from 'vitest';
import { DomainGateway } from './gateway';
import { DomainRegistry } from './registry';
import path from 'path';

const DOMAINS_ROOT = path.resolve(__dirname, '../../../domains');

describe('DomainGateway', () => {
  let gateway: DomainGateway;

  beforeEach(async () => {
    const registry = new DomainRegistry(DOMAINS_ROOT);
    await registry.loadAll();
    gateway = new DomainGateway(registry);
  });

  it('should list loaded domains', () => {
    const domains = gateway.getDomains();
    expect(domains.length).toBeGreaterThanOrEqual(1);
    expect(domains[0].name).toBe('korean-law');
  });

  it('should get domain info', () => {
    const domain = gateway.getDomain('korean-law');
    expect(domain).not.toBeNull();
    expect(domain!.display_name).toBe('한국 법률');
  });

  it('should return null for unknown domain', () => {
    expect(gateway.getDomain('nonexistent')).toBeNull();
  });

  it('should get tools for a domain', () => {
    const tools = gateway.getTools('korean-law');
    expect(tools.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter tools by tier', () => {
    const freeTools = gateway.getTools('korean-law', 'free');
    const allTools = gateway.getTools('korean-law');
    expect(freeTools.length).toBeLessThanOrEqual(allTools.length);
  });

  it('should return DOMAIN_NOT_FOUND for unknown domain call', async () => {
    const result = await gateway.call('nonexistent', 'tool', {});
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe('DOMAIN_NOT_FOUND');
  });

  it('should return TOOL_NOT_FOUND for unknown tool', async () => {
    const result = await gateway.call('korean-law', 'nonexistent_tool', {});
    expect(result.ok).toBe(false);
    expect(result.error!.code).toBe('TOOL_NOT_FOUND');
  });
});
