import type {
  DomainConfig, DomainToolConfig, DomainCallResult,
  DomainInfo, DomainErrorCode,
} from './types';
import type { Tier } from '@/lib/api-keys';
import { DomainRegistry } from './registry';
import { resolveKey } from './key-manager';

export class DomainGateway {
  private healthStatus = new Map<string, 'available' | 'unavailable' | 'unknown'>();

  constructor(private registry: DomainRegistry) {
    for (const d of registry.list()) {
      this.healthStatus.set(d.name, 'unknown');
    }
  }

  getDomains(): DomainInfo[] {
    return this.registry.list().map(d => ({
      name: d.name,
      display_name: d.display_name,
      description: d.description,
      version: d.version,
      icon: d.icon,
      status: this.healthStatus.get(d.name) ?? 'unknown',
      tools_count: this.registry.getTools(d.name).length,
    }));
  }

  getDomain(domainId: string): DomainInfo | null {
    const d = this.registry.get(domainId);
    if (!d) return null;
    return {
      name: d.name,
      display_name: d.display_name,
      description: d.description,
      version: d.version,
      icon: d.icon,
      status: this.healthStatus.get(d.name) ?? 'unknown',
      tools_count: this.registry.getTools(d.name).length,
    };
  }

  getTools(domainId: string, tier?: Tier): DomainToolConfig[] {
    return this.registry.getTools(domainId, tier);
  }

  async call(
    domainId: string,
    tool: string,
    args: Record<string, unknown>,
    opts?: { agentId?: string; saveToGraph?: boolean; apiKey?: string },
  ): Promise<DomainCallResult> {
    const config = this.registry.get(domainId);
    if (!config) return this.err(domainId, tool, 'DOMAIN_NOT_FOUND', `Domain not found: ${domainId}`);

    const toolConfig = this.registry.getTools(domainId).find(t => t.name === tool);
    if (!toolConfig) return this.err(domainId, tool, 'TOOL_NOT_FOUND', `Tool not found: ${tool}`);

    const apiKey = resolveKey(config, opts?.apiKey);

    let mcpResult: unknown;
    try {
      mcpResult = await this.mcpCall(config, toolConfig.source_tool, args, apiKey);
      this.healthStatus.set(domainId, 'available');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout') || message.includes('abort')) {
        this.healthStatus.set(domainId, 'unavailable');
        return this.err(domainId, tool, 'UPSTREAM_TIMEOUT', message);
      }
      this.healthStatus.set(domainId, 'unavailable');
      return this.err(domainId, tool, 'UPSTREAM_ERROR', message);
    }

    return {
      ok: true,
      domain: domainId,
      tool,
      result: mcpResult,
    };
  }

  private async mcpCall(
    config: DomainConfig,
    sourceTool: string,
    args: Record<string, unknown>,
    apiKey?: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.connection.timeout);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const body = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: sourceTool, arguments: args },
    };

    try {
      const res = await fetch(config.connection.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`MCP server returned ${res.status}`);
      }

      const json = await res.json();

      if (json.error) {
        throw new Error(json.error.message || JSON.stringify(json.error));
      }

      const content = json.result?.content;
      if (Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
        try {
          return JSON.parse(content[0].text);
        } catch {
          return content[0].text;
        }
      }

      return json.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkHealth(domainId: string): Promise<boolean> {
    const config = this.registry.get(domainId);
    if (!config?.connection.health) return false;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(config.connection.health, { signal: controller.signal });
      clearTimeout(timeout);
      const healthy = res.ok;
      this.healthStatus.set(domainId, healthy ? 'available' : 'unavailable');
      return healthy;
    } catch {
      this.healthStatus.set(domainId, 'unavailable');
      return false;
    }
  }

  isHealthy(domainId: string): boolean {
    return this.healthStatus.get(domainId) === 'available';
  }

  private err(domain: string, tool: string, code: DomainErrorCode, message: string): DomainCallResult {
    return { ok: false, domain, tool, error: { code, message } };
  }
}
