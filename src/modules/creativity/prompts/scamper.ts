/** SCAMPER 기법별 프롬프트 */

import type { ScamperType } from '@/types/creativity';
import { SCAMPER_DESCRIPTIONS } from '@/config/creativity';
import { JSON_INSTRUCTION } from './system';

export function buildScamperPrompt(
  idea: { title: string; description: string },
  technique: ScamperType
): string {
  const desc = SCAMPER_DESCRIPTIONS[technique];

  return `You are applying the SCAMPER technique: ${desc.name}
Core question: "${desc.question}"

Original idea:
Title: "${idea.title}"
Description: "${idea.description}"

Apply the "${desc.name}" transformation to create a NEW, different idea.
Think deeply about what can be ${technique === 'substitute' ? 'replaced' : technique === 'combine' ? 'merged' : technique === 'adapt' ? 'adapted' : technique === 'modify' ? 'modified or magnified' : technique === 'put_to_other_use' ? 'used differently' : technique === 'eliminate' ? 'removed or simplified' : 'rearranged or reversed'}.

${JSON_INSTRUCTION}

Format:
{
  "title": "...",
  "description": "...",
  "transformation": "What specifically was ${technique}d and why",
  "noveltyScore": 0-100
}`;
}

/** 모든 SCAMPER 기법 한번에 적용 */
export function buildFullScamperPrompt(idea: { title: string; description: string }): string {
  const techniques = Object.entries(SCAMPER_DESCRIPTIONS)
    .map(([key, desc]) => `- ${desc.name} (${key}): ${desc.question}`)
    .join('\n');

  return `Apply ALL 7 SCAMPER techniques to this idea:

Title: "${idea.title}"
Description: "${idea.description}"

Techniques:
${techniques}

For each technique, generate a genuinely different new idea.

${JSON_INSTRUCTION}

Format:
{
  "results": [
    { "technique": "substitute", "title": "...", "description": "...", "transformation": "..." },
    { "technique": "combine", "title": "...", "description": "...", "transformation": "..." },
    ...
  ]
}`;
}
