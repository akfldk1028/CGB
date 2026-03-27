/** 에이전트 레이어 타입 정의 */

/** 에이전트 역할 */
export type AgentRole =
  | 'creative_director'
  | 'divergent_thinker'
  | 'evaluator'
  | 'researcher'
  | 'iterator'
  | 'field_validator';

/** 에이전트 메시지 */
export interface AgentMessage {
  role: AgentRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** 오케스트레이션 결과 */
export interface OrchestrationResult {
  sessionId: string;
  messages: AgentMessage[];
  finalOutput: string;
  agentsUsed: AgentRole[];
  duration: number;
}

/** ClawTeam Python 서버 요청/응답 */
export interface ClawTeamRequest {
  topic: string;
  domain: string;
  template: string;
  options?: Record<string, unknown>;
}

export interface ClawTeamResponse {
  sessionId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: OrchestrationResult;
  error?: string;
}
