/** useSessionStream — SSE 스트림으로 에이전트 실행 실시간 구독
 *
 * 사용법:
 *   const { start, events, status, latestGraph } = useSessionStream();
 *   await start({ topic: 'AI Healthcare', domain: 'Healthcare' });
 *   // events: SessionEvent[] 실시간 누적
 *   // status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'
 *   // latestGraph: { nodeCount, edgeCount, newNodes } 그래프 실시간 상태
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { SessionEvent } from '@/modules/agents/events';

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export interface GraphSnapshot {
  nodeCount: number;
  edgeCount: number;
  newNodes: Array<{ id: string; type: string; title: string }>;
}

export interface SessionStreamReturn {
  start: (params: { topic: string; domain: string; userId?: string }) => Promise<void>;
  abort: () => void;
  events: SessionEvent[];
  status: StreamStatus;
  currentPhase: string | null;
  currentAgent: string | null;
  latestGraph: GraphSnapshot;
  sessionResult: unknown | null;
  error: string | null;
}

export function useSessionStream(): SessionStreamReturn {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [latestGraph, setLatestGraph] = useState<GraphSnapshot>({ nodeCount: 0, edgeCount: 0, newNodes: [] });
  const [sessionResult, setSessionResult] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(async (params: { topic: string; domain: string; userId?: string }) => {
    // Reset state
    setEvents([]);
    setStatus('connecting');
    setCurrentPhase(null);
    setCurrentAgent(null);
    setLatestGraph({ nodeCount: 0, edgeCount: 0, newNodes: [] });
    setSessionResult(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/creative/session/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, mode: 'heavy' }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Stream failed' }));
        setError(err.error ?? `HTTP ${res.status}`);
        setStatus('error');
        return;
      }

      setStatus('streaming');

      const reader = res.body?.getReader();
      if (!reader) {
        setError('No readable stream');
        setStatus('error');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames: "event: xxx\ndata: {...}\n\n"
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? ''; // keep incomplete frame

        for (const frame of frames) {
          if (!frame.trim()) continue;

          const lines = frame.split('\n');
          let eventType = '';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              data = line.slice(6);
            }
          }

          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            // session_result는 최종 결과 (SessionEvent가 아닌 별도 이벤트)
            if (eventType === 'session_result') {
              setSessionResult(parsed);
              continue;
            }

            const event = parsed as SessionEvent;
            setEvents((prev) => [...prev, event]);

            // 상태 업데이트
            switch (event.type) {
              case 'phase_start':
                setCurrentPhase(event.phase);
                setCurrentAgent(event.agent);
                break;
              case 'phase_end':
                break;
              case 'graph_update':
                setLatestGraph((prev) => ({
                  nodeCount: event.nodeCount,
                  edgeCount: event.edgeCount,
                  newNodes: event.newNode
                    ? [...prev.newNodes, event.newNode]
                    : prev.newNodes,
                }));
                break;
              case 'complete':
                setStatus('complete');
                setCurrentPhase(null);
                setCurrentAgent(null);
                break;
              case 'error':
                setError(event.message);
                setStatus('error');
                break;
            }
          } catch {
            // malformed JSON — skip
          }
        }
      }

      // Stream ended — ensure status is set
      setStatus((prev) => prev === 'streaming' ? 'complete' : prev);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
      } else {
        setError(err instanceof Error ? err.message : 'Stream failed');
        setStatus('error');
      }
    }
  }, []);

  return {
    start,
    abort,
    events,
    status,
    currentPhase,
    currentAgent,
    latestGraph,
    sessionResult,
    error,
  };
}
