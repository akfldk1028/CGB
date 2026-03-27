/** Iteration 프롬프트 — 기존 아이디어 변주 (4I's Iteration + Geneplore Explore) */

import { JSON_INSTRUCTION } from './system';

export function buildIterationPrompt(
  originalIdea: { title: string; description: string },
  relatedIdeas: { title: string; description: string }[],
  domain: string
): string {
  const relatedList = relatedIdeas.length
    ? relatedIdeas.map((r, i) => `${i + 1}. "${r.title}": ${r.description}`).join('\n')
    : '(no related ideas found in graph)';

  return `You are in ITERATION mode (4I's theory + Geneplore Exploratory Phase).

Iteration is NOT copying — it's finding universal themes and creating meaningful variations.
Example: Raimondi's engraving (1515) → Manet's painting (1863) → Picasso's cubist version (1961)

Original idea to iterate on:
Title: "${originalIdea.title}"
Description: "${originalIdea.description}"

Related ideas from the knowledge graph:
${relatedList}

Domain: "${domain}"

Generate 3 iterations that:
1. Preserve the core universal theme
2. Apply it to a different context, medium, or perspective
3. Add something genuinely new (not just cosmetic changes)

${JSON_INSTRUCTION}

Format:
{
  "iterations": [
    {
      "title": "...",
      "description": "...",
      "universalTheme": "What core theme was preserved",
      "whatChanged": "What context/medium/perspective shifted",
      "whatAdded": "What genuinely new element was introduced"
    },
    ...
  ]
}`;
}
