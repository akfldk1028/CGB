/** 창의 세션 타입 정의 */

import type { FourIsPhase, Idea } from './creativity';

export type SessionStatus = 'pending' | 'immersion' | 'inspiration' | 'isolation' | 'iteration' | 'completed' | 'failed';
export type SessionTier = 'free' | 'pro' | 'enterprise';
export type SessionMode = 'light' | 'heavy';

/** 창의 세션 */
export interface CreativeSession {
  id: string;
  topic: string;
  domain: string;
  status: SessionStatus;
  /** light = TypeScript 엔진, heavy = ClawTeam Python */
  mode: SessionMode;
  /** 각 단계별 결과 */
  phases: Partial<Record<FourIsPhase, PhaseResult>>;
  /** 최종 선별된 아이디어 */
  finalIdeas: Idea[];
  /** 생성된 총 아이디어 수 */
  totalGenerated: number;
  /** 소요 시간 (ms) */
  duration?: number;
  createdAt: string;
  completedAt?: string;
}

/** 각 단계 결과 */
export interface PhaseResult {
  phase: FourIsPhase;
  status: 'pending' | 'running' | 'completed';
  ideas: Idea[];
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

/** 세션 생성 요청 */
export interface CreateSessionRequest {
  topic: string;
  domain: string;
  mode?: SessionMode;
  /** 사용자 ID (사용량 추적용, 미지정 시 anonymous) */
  userId?: string;
  /** SCAMPER 기법 제한 (미지정 시 전체 사용) */
  scamperTypes?: string[];
  /** 발산 시 생성할 아이디어 수 */
  divergentCount?: number;
}

/** 세션 목록 응답 */
export interface SessionListResponse {
  sessions: CreativeSession[];
  total: number;
  page: number;
  limit: number;
}
