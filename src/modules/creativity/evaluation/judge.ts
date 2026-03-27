/** LLM-as-Judge — 자동 아이디어 비교 평가
 *
 * 근거: Agent Ideate (Kanumolu et al., IJCAI 2025)
 * - 두 아이디어를 6기준으로 비교하여 더 나은 것 선택
 * - LLM-as-Judge 방식으로 자동 품질 관리
 * - Tournament bracket으로 N개 중 최고 선별
 */

import { llmGenerateJSON } from '@/modules/llm/client';

export interface JudgeResult {
  winner: 'idea_1' | 'idea_2';
  reasoning: string;
  scores: {
    idea_1: Record<string, number>;
    idea_2: Record<string, number>;
  };
}

/** 두 아이디어 비교 평가 */
export async function compareIdeas(
  idea1: { title: string; description: string },
  idea2: { title: string; description: string },
  domain: string
): Promise<JudgeResult> {
  const prompt = `You are an impartial judge evaluating two creative ideas.
Domain: "${domain}"

<idea_1>
Title: ${idea1.title}
Description: ${idea1.description}
</idea_1>

<idea_2>
Title: ${idea2.title}
Description: ${idea2.description}
</idea_2>

Evaluate BOTH ideas on these 6 criteria (0-100 each):
1. domainRelevance: Fit with domain knowledge (Amabile)
2. creativeThinking: Novelty and non-obviousness (Amabile)
3. intrinsicMotivation: Genuine interest and passion (Amabile)
4. specificity: How clearly defined (Agent Ideate, IJCAI 2025)
5. marketNeed: Real user need and market size (Agent Ideate)
6. competitiveAdvantage: Unique advantage over alternatives (Agent Ideate)

Respond ONLY with valid JSON:
{
  "winner": "idea_1" or "idea_2",
  "reasoning": "Brief explanation of why the winner is better",
  "scores": {
    "idea_1": { "domainRelevance": N, "creativeThinking": N, "intrinsicMotivation": N, "specificity": N, "marketNeed": N, "competitiveAdvantage": N },
    "idea_2": { "domainRelevance": N, "creativeThinking": N, "intrinsicMotivation": N, "specificity": N, "marketNeed": N, "competitiveAdvantage": N }
  }
}`;

  try {
    return await llmGenerateJSON<JudgeResult>({ prompt, maxTokens: 2048 });
  } catch {
    // Fallback: random winner with default scores
    return {
      winner: Math.random() > 0.5 ? 'idea_1' : 'idea_2',
      reasoning: 'LLM evaluation failed — random selection',
      scores: {
        idea_1: { domainRelevance: 70, creativeThinking: 70, intrinsicMotivation: 70, specificity: 70, marketNeed: 70, competitiveAdvantage: 70 },
        idea_2: { domainRelevance: 70, creativeThinking: 70, intrinsicMotivation: 70, specificity: 70, marketNeed: 70, competitiveAdvantage: 70 },
      },
    };
  }
}

/** Tournament bracket — N개 아이디어 중 최고 선별 */
export async function tournamentSelect(
  ideas: { title: string; description: string }[],
  domain: string,
  topK = 3
): Promise<{ title: string; description: string; wins: number }[]> {
  if (ideas.length <= topK) {
    return ideas.map((i) => ({ ...i, wins: 0 }));
  }

  // 라운드 로빈 간소화: 각 아이디어를 랜덤 상대와 비교
  const wins = new Map<number, number>();
  ideas.forEach((_, i) => wins.set(i, 0));

  const matchups = Math.min(ideas.length, 10); // 최대 10 매치 (속도 vs 정확도 균형)
  for (let m = 0; m < matchups; m++) {
    const i = Math.floor(Math.random() * ideas.length);
    let j = Math.floor(Math.random() * ideas.length);
    while (j === i) j = Math.floor(Math.random() * ideas.length);

    const result = await compareIdeas(ideas[i], ideas[j], domain);
    const winnerIdx = result.winner === 'idea_1' ? i : j;
    wins.set(winnerIdx, (wins.get(winnerIdx) ?? 0) + 1);
  }

  // 승수 기준 정렬 → topK
  const ranked = ideas
    .map((idea, idx) => ({ ...idea, wins: wins.get(idx) ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  return ranked.slice(0, topK);
}
