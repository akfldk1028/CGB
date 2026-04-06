/** Cron Evaluate — 매일 1회, 미평가 Idea 배치 평가
 *
 * 논문 근거:
 * - Amabile (1996) Componential Theory — 3요소 평가
 * - Kanumolu et al. (IJCAI 2025) Agent Ideate — 6차원 평가
 * - Luo (2022) — novelty scoring via knowledge distance
 *
 * score가 없거나 0인 Idea를 찾아서 LLM 6차원 평가 실행,
 * 결과를 score + metadata에 저장.
 */

import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase';
import { llmGenerateJSON } from '@/modules/llm/client';

export const maxDuration = 300;

interface DbNode {
  id: string;
  agent_id: string | null;
  domain: string | null;
  title: string;
  description: string | null;
  score: number | null;
}

interface EvalResult {
  domainRelevance: number;
  creativeThinking: number;
  intrinsicMotivation: number;
  specificity: number;
  marketNeed: number;
  competitiveAdvantage: number;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    evaluated: 0,
    errors: [] as string[],
  };

  try {
    // score가 null이거나 0인 Idea (최대 30개)
    const unscored = await supabaseRest<DbNode[]>('graph_nodes', {
      query: [
        'type=eq.Idea',
        'expired_at=is.null',
        'or=(score.is.null,score.eq.0)',
        'select=id,agent_id,domain,title,description,score',
        'order=created_at.desc',
        'limit=30',
      ].join('&'),
    });

    // title이 Reflection으로 시작하는 것은 제외 (reflection은 평가 대상 아님)
    const toEvaluate = unscored.filter(n =>
      !n.title.startsWith('Reflection:') && (n.description?.length ?? 0) > 10
    );

    for (const idea of toEvaluate) {
      try {
        const evalResult = await llmGenerateJSON<EvalResult>({
          system: `Score this idea on 6 dimensions (0-100). Respond with ONLY a JSON object, no markdown, no explanation. Keys: domainRelevance, creativeThinking, intrinsicMotivation, specificity, marketNeed, competitiveAdvantage. Example: {"domainRelevance":70,"creativeThinking":85,"intrinsicMotivation":60,"specificity":75,"marketNeed":65,"competitiveAdvantage":55}`,
          prompt: `Domain: ${idea.domain || 'general'}\nIdea: ${idea.title}\nDescription: ${(idea.description || '').slice(0, 300)}`,
          maxTokens: 500,
        });

        // Validate all 6 dimensions exist
        const dims = ['domainRelevance', 'creativeThinking', 'intrinsicMotivation', 'specificity', 'marketNeed', 'competitiveAdvantage'] as const;
        if (!evalResult || dims.some(d => typeof evalResult[d] !== 'number')) continue;

        // 가중 점수 계산
        const overall = Math.round(
          evalResult.domainRelevance * 0.15 +
          evalResult.creativeThinking * 0.30 +
          evalResult.intrinsicMotivation * 0.10 +
          evalResult.specificity * 0.15 +
          evalResult.marketNeed * 0.15 +
          evalResult.competitiveAdvantage * 0.15
        );

        // score + evaluation metadata (merge, not overwrite)
        const existingNode = await supabaseRest<{ metadata: Record<string, unknown> }[]>('graph_nodes', {
          query: `id=eq.${encodeURIComponent(idea.id)}&select=metadata`,
        });
        const existingMeta = existingNode?.[0]?.metadata || {};

        await supabaseRest('graph_nodes', {
          method: 'PATCH',
          query: `id=eq.${encodeURIComponent(idea.id)}`,
          body: {
            score: overall,
            metadata: { ...existingMeta, evaluation: evalResult, evaluated_at: new Date().toISOString() },
          },
        });

        results.evaluated++;
      } catch (err) {
        results.errors.push(`evaluate ${idea.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    results.errors.push(`evaluate phase: ${(err as Error).message}`);
  }

  console.log(`[cron/evaluate] evaluated=${results.evaluated}`);
  return NextResponse.json(results);
}
