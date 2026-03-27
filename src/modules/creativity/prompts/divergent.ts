/** 발산 생성 프롬프트 — Guilford SI Model */

import { JSON_INSTRUCTION } from './system';

export function buildDivergentPrompt(
  topic: string,
  domain: string,
  count: number,
  graphContext?: string
): string {
  const contextBlock = graphContext && !graphContext.includes('No prior knowledge')
    ? `\nPrior Knowledge from Knowledge Graph (use this to build upon, not repeat):\n${graphContext}\n\nIMPORTANT: Generate ideas that are DIFFERENT from the existing ones above. Build on them, combine them, or go in opposite directions — but don't duplicate.\n`
    : '';

  return `You are in DIVERGENT THINKING mode (Guilford's SI Model).
Generate ${count} completely different, creative ideas about:

Topic: "${topic}"
Domain: "${domain}"
${contextBlock}
Rules:
- Quantity over quality — every idea counts
- No criticism, no filtering, no "that's impossible"
- Each idea must be genuinely different (not variations of the same thing)
- Include wild, unconventional ideas alongside practical ones
- Each idea needs a title (max 10 words) and description (2-3 sentences)

${JSON_INSTRUCTION}

Format:
{
  "ideas": [
    { "title": "...", "description": "..." },
    ...
  ]
}`;
}
