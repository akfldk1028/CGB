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

let _gatewayPromise: Promise<DomainGateway> | null = null;

export function getGateway(): Promise<DomainGateway> {
  if (!_gatewayPromise) {
    _gatewayPromise = (async () => {
      const root = path.resolve(process.cwd(), 'domains');
      const registry = new DomainRegistry(root);
      await registry.loadAll();
      return new DomainGateway(registry);
    })();
  }
  return _gatewayPromise;
}

export function invalidateGateway(): void {
  _gatewayPromise = null;
}
