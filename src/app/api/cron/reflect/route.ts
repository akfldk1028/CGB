/** Cron Reflect — 매일 1회, 3단계 뇌 정비
 *
 * 논문 근거:
 * - Park et al. (2023) Generative Agents — daily reflection/compression
 * - Zep (2025) — entity extraction from episodes
 * - Luo (2022) — knowledge distance for novelty
 *
 * 1단계: Concept 배치 추출 (Zep 패턴 — 100% 커버리지)
 * 2단계: Reflection 통찰 생성 (Park et al. — 경험 압축)
 * 3단계: Pruning (고아 expire + 중복 expire)
 */

import { NextResponse } from 'next/server';
import { supabaseRest, supabaseRpc } from '@/lib/supabase';
import { llmGenerateJSON, llmGenerate } from '@/modules/llm/client';
import { storeManager } from '@/modules/graph/store';

export const maxDuration = 300; // 5분

interface DbNode {
  id: string;
  agent_id: string | null;
  domain: string | null;
  title: string;
  description: string | null;
  type: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    conceptsExtracted: 0,
    reflectionsCreated: 0,
    orphansExpired: 0,
    duplicatesExpired: 0,
    errors: [] as string[],
  };

  const store = await storeManager.ensureReady();

  // ═══════════════════════════════════════════
  // 1단계: Concept 배치 추출 (Zep — Entity Extraction)
  // ═══════════════════════════════════════════
  try {
    // 최근 24h Idea 중 USES_CONCEPT 엣지 없는 것
    const uncoveredIdeas = await supabaseRest<DbNode[]>('graph_nodes', {
      query: [
        'type=eq.Idea',
        'expired_at=is.null',
        'created_at=gte.' + new Date(Date.now() - 86400000).toISOString(),
        'select=id,agent_id,domain,title,description',
        'limit=50', // 하루 최대 50개 처리
      ].join('&'),
    });

    // 이미 USES_CONCEPT 엣지 있는 것 제외
    const coveredIds = new Set<string>();
    if (uncoveredIdeas.length > 0) {
      const edges = await supabaseRest<{ source_id: string }[]>('graph_edges', {
        query: 'type=eq.USES_CONCEPT&select=source_id',
      });
      for (const e of edges) coveredIds.add(e.source_id);
    }

    const toProcess = uncoveredIdeas.filter(n => !coveredIds.has(n.id) && (n.description?.length ?? 0) > 30).slice(0, 30);

    // 1개씩 처리 (JSON 파싱 안정성)
    for (const idea of toProcess) {
      try {
        const text = `${idea.title}: ${(idea.description || '').slice(0, 300)}`;
        const concepts = await llmGenerateJSON<Array<{ name: string; description: string }>>({
          system: 'Extract 1-2 key concepts from the text. Respond with ONLY a raw JSON array, no markdown, no ```json blocks. Example: [{"name":"AI","description":"artificial intelligence"}]',
          prompt: text,
          maxTokens: 300,
        });

        if (!Array.isArray(concepts)) continue;

        for (const c of concepts.slice(0, 2)) {
          if (!c.name || c.name.length < 2) continue;
          const conceptId = `concept-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}`;

          await store.addNode({
            id: conceptId,
            type: 'Concept',
            title: c.name,
            description: c.description || c.name,
            agentId: idea.agent_id ?? undefined,
            domain: idea.domain ?? undefined,
            layer: 1,
            createdAt: new Date().toISOString(),
          });

          await store.addEdge({
            id: `edge-uc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: idea.id,
            target: conceptId,
            type: 'USES_CONCEPT',
            createdAt: new Date().toISOString(),
          });

          results.conceptsExtracted++;
        }
      } catch (err) {
        results.errors.push(`concept ${idea.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    results.errors.push(`concept phase: ${(err as Error).message}`);
  }

  // ═══════════════════════════════════════════
  // 2단계: Reflection (Park et al. 2023 — 경험 압축)
  // ═══════════════════════════════════════════
  try {
    // 오늘 Episode이 5개 이상인 에이전트 (활발한 에이전트만)
    const activeAgents = await supabaseRest<{ agent_id: string; domain: string; cnt: number }[]>('graph_nodes', {
      query: [
        'type=eq.Episode',
        'expired_at=is.null',
        'created_at=gte.' + new Date(Date.now() - 86400000).toISOString(),
        'select=agent_id,domain',
      ].join('&'),
    });

    // agent_id별 그룹핑
    const agentEpisodes = new Map<string, { domain: string; count: number }>();
    for (const ep of activeAgents) {
      if (!ep.agent_id) continue;
      const existing = agentEpisodes.get(ep.agent_id);
      if (existing) {
        existing.count++;
      } else {
        agentEpisodes.set(ep.agent_id, { domain: ep.domain, count: 1 });
      }
    }

    // 5개 이상 Episode인 에이전트만 (최대 10명)
    const reflectionCandidates = [...agentEpisodes.entries()]
      .filter(([, v]) => v.count >= 3)
      .slice(0, 10);

    for (const [agentId, { domain }] of reflectionCandidates) {
      try {
        // 오늘 이 에이전트의 Idea 내용 조회
        const ideas = await supabaseRest<DbNode[]>('graph_nodes', {
          query: [
            'type=eq.Idea',
            `agent_id=eq.${agentId}`,
            'expired_at=is.null',
            'created_at=gte.' + new Date(Date.now() - 86400000).toISOString(),
            'select=title,description',
            'order=created_at.desc',
            'limit=15',
          ].join('&'),
        });

        if (ideas.length < 3) continue;

        const summaryInput = ideas.map(i => `- ${i.title}: ${(i.description || '').slice(0, 100)}`).join('\n');

        const reflection = await llmGenerate({
          system: 'Summarize this agent\'s daily activities into 2-3 key insights. Focus on what was LEARNED, patterns noticed, and connections made. Write directly — no intro like "Here are".',
          prompt: `Today's ${ideas.length} interactions:\n${summaryInput}\n\nKey insights:`,
          maxTokens: 300,
        });

        if (!reflection || reflection.length < 20) continue;

        // Reflection 노드 생성 (L1 도메인 공유)
        const reflectionId = `reflection-${agentId}-${Date.now()}`;
        await store.addNode({
          id: reflectionId,
          type: 'Idea',
          title: `Reflection: Daily insight`,
          description: reflection.slice(0, 500),
          agentId,
          domain: domain ?? undefined,
          layer: 1, // 도메인 레벨 (공유)
          createdAt: new Date().toISOString(),
        });

        // Agent → OWNS → Reflection
        await store.addEdge({
          id: `edge-refl-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
          source: `agent-${agentId}`,
          target: reflectionId,
          type: 'OWNS',
          createdAt: new Date().toISOString(),
        });

        results.reflectionsCreated++;
      } catch (err) {
        results.errors.push(`reflection ${agentId}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    results.errors.push(`reflection phase: ${(err as Error).message}`);
  }

  // ═══════════════════════════════════════════
  // 3단계: Pruning (고아 + 중복)
  // ═══════════════════════════════════════════
  try {
    const orphans = await supabaseRpc<number>('graph_expire_orphans', { min_age: '7 days' });
    results.orphansExpired = orphans ?? 0;
  } catch (err) {
    results.errors.push(`orphan prune: ${(err as Error).message}`);
  }

  try {
    const dups = await supabaseRpc<number>('graph_expire_duplicates', { threshold: 0.95 });
    results.duplicatesExpired = dups ?? 0;
  } catch (err) {
    results.errors.push(`dedup: ${(err as Error).message}`);
  }

  console.log(`[cron/reflect] concepts=${results.conceptsExtracted}, reflections=${results.reflectionsCreated}, orphans=${results.orphansExpired}, dups=${results.duplicatesExpired}`);

  return NextResponse.json(results);
}
