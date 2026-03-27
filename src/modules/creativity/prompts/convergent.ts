/** 수렴 평가 프롬프트 — Guilford Convergent + Amabile 3요소 */

import { JSON_INSTRUCTION } from './system';

export function buildConvergentPrompt(
  ideas: { title: string; description: string }[],
  domain: string,
  criteria?: string[]
): string {
  const criteriaText = criteria?.length
    ? criteria.join(', ')
    : 'domain relevance, creative originality, feasibility';

  const ideasList = ideas.map((idea, i) => `${i + 1}. "${idea.title}": ${idea.description}`).join('\n');

  return `You are in CONVERGENT THINKING mode (Guilford) with Amabile's 3-Component evaluation.
Evaluate and rank these ideas for domain "${domain}".

Ideas:
${ideasList}

Evaluation criteria: ${criteriaText}

For each idea, score on Amabile's 3 components (0-100):
- domainRelevance: How well does it fit the domain's knowledge, technical skills, and standards? (Amabile: "Domain-relevant skills")
- creativeThinking: How novel, surprising, and non-obvious is it? Does it show cognitive flexibility and willingness to take risks? (Amabile: "Creative thinking skills")
- motivation: How intrinsically interesting and compelling is this idea? Would someone pursue it out of genuine curiosity and enjoyment, not just for rewards? (Amabile: "Intrinsic motivation" — intrinsic > extrinsic)

overall = domainRelevance * 0.3 + creativeThinking * 0.5 + motivation * 0.2
NOTE: creativeThinking is weighted highest (50%) because Amabile emphasizes that creative thinking skills — cognitive flexibility, openness to new ideas — are the primary differentiator.

${JSON_INSTRUCTION}

Format:
{
  "ranked": [
    {
      "index": 0,
      "title": "...",
      "scores": { "domainRelevance": 85, "creativeThinking": 72, "motivation": 90, "overall": 78.4 },
      "reasoning": "..."
    },
    ...
  ],
  "eliminated": [{ "index": 3, "reason": "..." }]
}

Return ranked from highest to lowest overall score.`;
}
