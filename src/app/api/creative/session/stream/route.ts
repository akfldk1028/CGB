/** SSE Stream Endpoint — 에이전트 실행 이벤트를 실시간 전송
 *
 * POST /api/creative/session/stream
 *
 * 기존 /api/creative/session (JSON 응답)과 동일한 파이프라인을 실행하되,
 * 실행 도중의 tool_call, graph_update, phase 전환을 SSE로 프론트에 스트리밍.
 *
 * 프론트에서는 fetch + ReadableStream reader로 소비:
 *   const res = await fetch('/api/creative/session/stream', { method: 'POST', body });
 *   const reader = res.body.getReader();
 */

import { runMultiAgentPipeline, toCreativeSession } from '@/modules/agents/runtime/multi-agent';
import { persistSession } from '@/modules/graph/service';
import { canCreateSession, recordSessionUsage } from '@/modules/payment/usage';
import type { CreateSessionRequest } from '@/types/session';
import type { SessionEvent } from '@/modules/agents/events';

export async function POST(request: Request) {
  const body = (await request.json()) as CreateSessionRequest;

  if (!body.topic || !body.domain) {
    return new Response(JSON.stringify({ error: 'topic and domain are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = body.userId ?? 'anonymous';
  const usageCheck = canCreateSession(userId);
  if (!usageCheck.allowed) {
    return new Response(JSON.stringify({ error: usageCheck.reason }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SessionEvent) => {
        try {
          const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        } catch {
          // controller already closed — ignore
        }
      };

      try {
        const result = await runMultiAgentPipeline(
          body.topic,
          body.domain,
          { emit: send }
        );

        const session = toCreativeSession(result);
        await persistSession(session);
        recordSessionUsage(userId);

        // 최종 결과를 별도 이벤트로 전송
        const finalFrame = `event: session_result\ndata: ${JSON.stringify({
          session,
          agentDetails: {
            agents: result.agentResults.map((r) => ({
              role: r.role,
              steps: r.steps.length,
              toolsUsed: r.toolsUsed,
              nodesCreated: r.nodesCreated,
              edgesCreated: r.edgesCreated,
              duration: r.duration,
            })),
            totalNodes: result.totalNodesCreated,
            totalEdges: result.totalEdgesCreated,
          },
        })}\n\n`;
        controller.enqueue(encoder.encode(finalFrame));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export const maxDuration = 300;
