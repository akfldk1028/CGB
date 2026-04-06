/** Cron Brainstorm — 매일 1회, 활발한 에이전트 대상 자율 브레인스토밍
 *
 * 논문 근거:
 * - Guilford (1967) SI Model — Divergent Production
 * - Osborn (1953) — Applied Imagination (brainstorming rules)
 *
 * 활발한 에이전트(최근 24h Episode 3+)를 선별,
 * 각 에이전트의 최근 활동 주제에 대해 brainstorm 실행,
 * 결과 Idea 노드를 그래프에 축적.
 */

import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase';
import { llmGenerateJSON } from '@/modules/llm/client';
import { storeManager } from '@/modules/graph/store';

export const maxDuration = 300;

interface DbNode {
  id: string;
  agent_id: string | null;
  domain: string | null;
  title: string;
  description: string | null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    agentsProcessed: 0,
    ideasGenerated: 0,
    errors: [] as string[],
  };

  const store = await storeManager.ensureReady();

  try {
    // 최근 24h Episode이 3개 이상인 에이전트 찾기
    const recentEpisodes = await supabaseRest<{ agent_id: string; domain: string }[]>('graph_nodes', {
      query: [
        'type=eq.Episode',
        'expired_at=is.null',
        'created_at=gte.' + new Date(Date.now() - 86400000).toISOString(),
        'select=agent_id,domain',
      ].join('&'),
    });

    const agentMap = new Map<string, { domain: string; count: number }>();
    for (const ep of recentEpisodes) {
      if (!ep.agent_id) continue;
      const existing = agentMap.get(ep.agent_id);
      if (existing) existing.count++;
      else agentMap.set(ep.agent_id, { domain: ep.domain, count: 1 });
    }

    const candidates = [...agentMap.entries()]
      .filter(([, v]) => v.count >= 3)
      .slice(0, 10); // 최대 10 에이전트

    for (const [agentId, { domain }] of candidates) {
      try {
        // 이 에이전트의 최근 Idea 제목 수집 → 새 주제 도출
        const recentIdeas = await supabaseRest<DbNode[]>('graph_nodes', {
          query: [
            'type=eq.Idea',
            `agent_id=eq.${agentId}`,
            'expired_at=is.null',
            'order=created_at.desc',
            'limit=10',
            'select=title,description',
          ].join('&'),
        });

        const context = recentIdeas.map(i => i.title).join(', ');
        const topicPrompt = context.length > 10
          ? `Based on recent interests (${context.slice(0, 300)}), suggest a new creative topic in the ${domain || 'general'} domain.`
          : `Suggest a creative topic in the ${domain || 'general'} domain.`;

        // LLM으로 아이디어 3개 생성
        const ideas = await llmGenerateJSON<Array<{ title: string; description: string }>>({
          system: 'Generate 3 creative ideas. Each must have a short title (under 60 chars) and a 1-sentence description. Respond with ONLY a raw JSON array, NO markdown, NO ```json blocks. Example: [{"title":"AI Music Therapy","description":"Use generative AI to create personalized therapeutic music."}]',
          prompt: topicPrompt,
          maxTokens: 800,
        });

        if (!Array.isArray(ideas)) continue;

        for (const idea of ideas.slice(0, 3)) {
          if (!idea.title || idea.title.length < 3) continue;

          const ideaId = `idea-bs-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
          await store.addNode({
            id: ideaId,
            type: 'Idea',
            title: idea.title,
            description: idea.description || idea.title,
            agentId,
            domain: domain ?? undefined,
            layer: 2,
            createdAt: new Date().toISOString(),
          });

          // Agent → OWNS → Idea
          await store.addEdge({
            id: `edge-bs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            source: `agent-${agentId}`,
            target: ideaId,
            type: 'OWNS',
            createdAt: new Date().toISOString(),
          });

          results.ideasGenerated++;
        }

        results.agentsProcessed++;
      } catch (err) {
        results.errors.push(`brainstorm ${agentId}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    results.errors.push(`brainstorm phase: ${(err as Error).message}`);
  }

  console.log(`[cron/brainstorm] agents=${results.agentsProcessed}, ideas=${results.ideasGenerated}`);
  return NextResponse.json(results);
}
