import type { DomainConfig } from './types';

/**
 * Resolve API key for a domain MCP call.
 * Priority: BYOK (user-provided) > central env var
 */
export function resolveKey(config: DomainConfig, userKey?: string): string | undefined {
  if (userKey && config.keys.byok) return userKey;
  const envKey = process.env[config.keys.central_env];
  if (envKey) return envKey;
  return undefined;
}
