export { DomainRegistry } from './registry';
export { DomainGateway } from './gateway';
export { resultToNode, detectSubDomain, extractFieldByPath } from './graph-sink';
export { resolveKey } from './key-manager';
export type {
  DomainConfig, DomainToolConfig, DomainCallRequest,
  DomainCallResult, DomainInfo, DomainErrorCode,
} from './types';

// Singleton gateway instance (lazy init)
import path from 'path';
import { DomainRegistry } from './registry';
import { DomainGateway } from './gateway';

let _gateway: DomainGateway | null = null;

export async function getGateway(): Promise<DomainGateway> {
  if (_gateway) return _gateway;
  const root = path.resolve(process.cwd(), 'domains');
  const registry = new DomainRegistry(root);
  await registry.loadAll();
  _gateway = new DomainGateway(registry);
  return _gateway;
}
