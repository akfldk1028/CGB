/** Session Event Emitter — 에이전트 실행 중 SSE 이벤트 전송
 *
 * 콜백 패턴: global bus 없이 emitter 객체를 pipeline → agent로 직접 전달.
 * SSE route에서 생성, ReadableStream controller에 바인딩.
 */

// ═══════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════

export type SessionEvent =
  | { type: 'session_start'; sessionId: string; topic: string; domain: string }
  | { type: 'phase_start'; phase: string; agent: string }
  | { type: 'phase_end'; phase: string; agent: string; duration: number; nodesCreated: number; edgesCreated: number }
  | { type: 'tool_result'; agent: string; tool: string; step: number; nodeCreated: boolean; edgeCreated: boolean }
  | { type: 'graph_update'; nodeCount: number; edgeCount: number; newNode?: { id: string; type: string; title: string } }
  | { type: 'trace_saved'; agent: string; traceId: string; stepCount: number }
  | { type: 'complete'; sessionId: string; totalNodes: number; totalEdges: number; duration: number }
  | { type: 'error'; message: string };

// ═══════════════════════════════════════════
// Emitter Interface
// ═══════════════════════════════════════════

export interface SessionEmitter {
  emit(event: SessionEvent): void;
}

/** No-op emitter — emitter가 없을 때 사용 (기존 코드 호환) */
export const NOOP_EMITTER: SessionEmitter = {
  emit() {},
};
