/** domain.yaml 파싱 결과 */
export interface DomainConfig {
  name: string;
  display_name: string;
  description: string;
  version: string;
  icon?: string;

  connection: {
    transport: 'http' | 'stdio';
    url: string;
    health?: string;
    timeout: number;
    retry: number;
  };

  sub_domains: 'auto' | SubDomain[];

  pricing: {
    strategy: 'tool_tier';
    default_tier: Tier;
  };

  keys: {
    central_env: string;
    byok: boolean;
    byok_header?: string;
  };

  graph: {
    default_layer: number;
    promote_threshold: number;
    auto_concepts: boolean;
  };
}

export interface SubDomain {
  id: string;
  name: string;
  keywords?: string[];
}

/** tools/*.yaml 파싱 결과 */
export interface DomainToolConfig {
  name: string;
  source_tool: string;
  tier: Tier;

  graph: {
    auto_save: boolean;
    node_type: string;
    mapping?: {
      title?: string;
      description?: string;
      metadata?: string[];
    };
    sub_domain_field?: string;
  };

  input_schema?: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** POST /v1/domains/:id/call 요청 */
export interface DomainCallRequest {
  tool: string;
  args: Record<string, unknown>;
  agent_id?: string;
  save_to_graph?: boolean;
  api_key?: string;
}

/** POST /v1/domains/:id/call 응답 */
export interface DomainCallResult {
  ok: boolean;
  domain: string;
  tool: string;
  result?: unknown;
  graph?: {
    nodes_created: number;
    edges_created: number;
    sub_domain?: string;
  };
  error?: {
    code: DomainErrorCode;
    message: string;
  };
}

export type DomainErrorCode =
  | 'DOMAIN_NOT_FOUND'
  | 'DOMAIN_UNAVAILABLE'
  | 'TOOL_NOT_FOUND'
  | 'TIER_RESTRICTED'
  | 'KEY_REQUIRED'
  | 'KEY_INVALID'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_TIMEOUT';

/** 도메인 상태 */
export interface DomainInfo {
  name: string;
  display_name: string;
  description: string;
  version: string;
  icon?: string;
  status: 'available' | 'unavailable' | 'unknown';
  tools_count: number;
}

// Re-export Tier from existing system
export type { Tier } from '@/lib/api-keys';
