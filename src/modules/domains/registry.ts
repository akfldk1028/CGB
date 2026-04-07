import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import type { DomainConfig, DomainToolConfig } from './types';
import type { Tier } from '@/lib/api-keys';

const TIER_LEVELS: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };

export class DomainRegistry {
  private domains = new Map<string, DomainConfig>();
  private tools = new Map<string, DomainToolConfig[]>();

  constructor(private rootDir: string) {}

  async loadAll(): Promise<void> {
    this.domains.clear();
    this.tools.clear();

    let entries: string[];
    try {
      entries = await readdir(this.rootDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('_')) continue;

      const domainDir = path.join(this.rootDir, entry);
      const s = await stat(domainDir).catch(() => null);
      if (!s?.isDirectory()) continue;

      const configPath = path.join(domainDir, 'domain.yaml');
      try {
        const raw = await readFile(configPath, 'utf-8');
        const config = yaml.load(raw) as DomainConfig;
        if (!config.name) config.name = entry;
        this.domains.set(config.name, config);

        const toolsDir = path.join(domainDir, 'tools');
        const toolConfigs = await this.loadTools(toolsDir, config);
        this.tools.set(config.name, toolConfigs);
      } catch {
        // Skip invalid domain configs
      }
    }
  }

  private async loadTools(toolsDir: string, domainConfig: DomainConfig): Promise<DomainToolConfig[]> {
    let files: string[];
    try {
      files = await readdir(toolsDir);
    } catch {
      return [];
    }

    const tools: DomainToolConfig[] = [];
    for (const file of files) {
      if (!file.endsWith('.yaml') || file.startsWith('_')) continue;
      try {
        const raw = await readFile(path.join(toolsDir, file), 'utf-8');
        const tool = yaml.load(raw) as DomainToolConfig;
        if (!tool.tier) tool.tier = domainConfig.pricing.default_tier as Tier;
        if (!tool.source_tool) tool.source_tool = tool.name;
        if (!tool.graph) tool.graph = { auto_save: false, node_type: 'Concept' };
        tools.push(tool);
      } catch {
        // Skip invalid tool configs
      }
    }
    return tools;
  }

  get(domainId: string): DomainConfig | null {
    return this.domains.get(domainId) ?? null;
  }

  getTools(domainId: string, tier?: Tier): DomainToolConfig[] {
    const all = this.tools.get(domainId) ?? [];
    if (!tier) return all;
    const level = TIER_LEVELS[tier] ?? 0;
    return all.filter(t => (TIER_LEVELS[t.tier] ?? 1) <= level);
  }

  list(): DomainConfig[] {
    return Array.from(this.domains.values());
  }

  has(domainId: string): boolean {
    return this.domains.has(domainId);
  }
}
