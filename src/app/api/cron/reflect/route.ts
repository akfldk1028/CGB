/** Cron 반추(Reflection) 에이전트
 *
 * 매일 1회 실행 — Stanford Generative Agents (Park et al., UIST 2023) 패턴
 *
 * 1. 고아 노드 정리 (연결 없는 노드에 SIMILAR_TO 제안)
 * 2. 교차 도메인 INSPIRED_BY 탐색
 * 3. Higher-level Theme 노드 자동 생성
 */

import { NextResponse } from 'next/server';
import { getMemoryStore } from '@/modules/agents/tools/graph-tools';
import { llmGenerateJSON } from '@/modules/llm/client';
import { scheduleAutoSave } from '@/modules/graph/persistence';

export const maxDuration = 60;

export async function GET(request: Request) {
  // Cron secret 검증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = getMemoryStore();
  const results = {
    orphansFixed: 0,
    crossDomainEdges: 0,
    themesCreated: 0,
    totalNodes: store.nodes.length,
    totalEdges: store.edges.length,
  };

  if (store.nodes.length < 3) {
    return NextResponse.json({ ...results, skipped: true, reason: 'Too few nodes for reflection' });
  }

  // ── 1. 고아 노드 정리 ──
  const connectedIds = new Set<string>();
  for (const e of store.edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const orphans = store.nodes.filter((n) => !connectedIds.has(n.id) && n.type === 'Idea');

  for (const orphan of orphans.slice(0, 5)) {
    // 제목 키워드로 가장 유사한 노드 찾기
    const tokens = orphan.title.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const closest = store.nodes.find((n) => {
      if (n.id === orphan.id) return false;
      return tokens.some((t) => n.title.toLowerCase().includes(t));
    });
    if (closest) {
      store.edges.push({
        id: `reflect-${Date.now()}-${results.orphansFixed}`,
        source: orphan.id,
        target: closest.id,
        type: 'SIMILAR_TO',
        createdAt: new Date().toISOString(),
      });
      results.orphansFixed++;
    }
  }

  // ── 2. 교차 도메인 탐색 ──
  const domains = store.nodes.filter((n) => n.type === 'Domain');
  if (domains.length >= 2) {
    // 다른 도메인의 아이디어 쌍을 찾아서 INSPIRED_BY 제안
    const domainNodeMap = new Map<string, string[]>();
    for (const e of store.edges) {
      if (e.type === 'BELONGS_TO') {
        const arr = domainNodeMap.get(e.target) ?? [];
        arr.push(e.source);
        domainNodeMap.set(e.target, arr);
      }
    }
    const domainGroups = [...domainNodeMap.entries()];
    for (let i = 0; i < domainGroups.length && results.crossDomainEdges < 3; i++) {
      for (let j = i + 1; j < domainGroups.length && results.crossDomainEdges < 3; j++) {
        const [, nodesA] = domainGroups[i];
        const [, nodesB] = domainGroups[j];
        if (nodesA.length > 0 && nodesB.length > 0) {
          const a = nodesA[Math.floor(Math.random() * nodesA.length)];
          const b = nodesB[Math.floor(Math.random() * nodesB.length)];
          const exists = store.edges.some(
            (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
          );
          if (!exists) {
            store.edges.push({
              id: `cross-${Date.now()}-${results.crossDomainEdges}`,
              source: a,
              target: b,
              type: 'INSPIRED_BY',
              createdAt: new Date().toISOString(),
            });
            results.crossDomainEdges++;
          }
        }
      }
    }
  }

  // ── 3. Higher-level Theme 생성 (Stanford Generative Agents 반추) ──
  const recentIdeas = store.nodes
    .filter((n) => n.type === 'Idea')
    .slice(-10);

  if (recentIdeas.length >= 5) {
    try {
      const ideaList = recentIdeas.map((n) => `- ${n.title}: ${n.description}`).join('\n');
      const parsed = await llmGenerateJSON<{ themes: { title: string; description: string }[] }>({
        prompt: `Analyze these recent ideas and identify 1-2 overarching themes or patterns.\n\n${ideaList}\n\nRespond with JSON: { "themes": [{ "title": "...", "description": "..." }] }`,
        system: 'You are a reflection agent. Find higher-level patterns across ideas. Be concise.',
        maxTokens: 512,
      });

      for (const theme of (parsed.themes ?? []).slice(0, 2)) {
        const themeId = `theme-${Date.now()}-${results.themesCreated}`;
        store.nodes.push({
          id: themeId,
          type: 'Concept',
          title: theme.title,
          description: theme.description,
          method: 'reflection',
          createdAt: new Date().toISOString(),
        });

        // Theme → 관련 아이디어 연결
        for (const idea of recentIdeas.slice(0, 5)) {
          store.edges.push({
            id: `theme-e-${Date.now()}-${results.themesCreated}-${idea.id.slice(-4)}`,
            source: idea.id,
            target: themeId,
            type: 'GENERALIZES',
            createdAt: new Date().toISOString(),
          });
        }
        results.themesCreated++;
      }
    } catch {
      // LLM 실패 시 스킵
    }
  }

  if (results.orphansFixed + results.crossDomainEdges + results.themesCreated > 0) {
    scheduleAutoSave();
  }

  return NextResponse.json({
    ...results,
    totalNodesAfter: store.nodes.length,
    totalEdgesAfter: store.edges.length,
  });
}
