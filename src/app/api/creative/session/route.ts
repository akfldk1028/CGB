import { NextResponse } from 'next/server';
import { runFourIsPipeline } from '@/modules/creativity/pipeline/four-is';
import { runMultiAgentPipeline, toCreativeSession } from '@/modules/agents/runtime/multi-agent';
import { persistSession } from '@/modules/graph/service';
import { canCreateSession, recordSessionUsage } from '@/modules/payment/usage';
import type { CreateSessionRequest } from '@/types/session';
import type { ApiResponse } from '@/types/api';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionRequest;

    if (!body.topic || !body.domain) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'topic and domain are required' },
        { status: 400 }
      );
    }

    // 세션 사용량 체크 (userId 있을 때만)
    const userId = body.userId ?? 'anonymous';
    const usageCheck = canCreateSession(userId);
    if (!usageCheck.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: usageCheck.reason },
        { status: 429 }
      );
    }

    // mode=heavy → 자율 에이전트 파이프라인 (5 에이전트 + 도구 11종)
    // mode=light → 기존 TypeScript 직접 실행 파이프라인
    if (body.mode === 'heavy') {
      const agentResult = await runMultiAgentPipeline(body.topic, body.domain);
      const session = toCreativeSession(agentResult);

      // Graph에 영구 저장 — "ideas compound forever"
      const persisted = await persistSession(session);
      recordSessionUsage(userId);

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          session,
          agentDetails: {
            agents: agentResult.agentResults.map((r) => ({
              role: r.role,
              goal: r.goal,
              steps: r.steps.length,
              toolsUsed: r.toolsUsed,
              nodesCreated: r.nodesCreated,
              edgesCreated: r.edgesCreated,
              duration: r.duration,
            })),
            graphSnapshot: agentResult.graphSnapshot,
            totalNodes: agentResult.totalNodesCreated,
            totalEdges: agentResult.totalEdgesCreated,
          },
          graphPersistence: persisted,
        },
      });
    }

    // Default: light mode (legacy pipeline)
    const session = await runFourIsPipeline(body.topic, body.domain, {
      divergentCount: body.divergentCount,
    });

    // Graph에 영구 저장
    const persisted = await persistSession(session);
    recordSessionUsage(userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { session, graphPersistence: persisted },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/** maxDuration for agent mode — 5 agents sequential, each up to 12 steps */
export const maxDuration = 300;
