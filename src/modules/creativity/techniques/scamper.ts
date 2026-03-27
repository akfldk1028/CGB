/** SCAMPER 7기법 구현 */

import { llmGenerateJSON } from '@/modules/llm/client';
import type { Idea, ScamperType } from '@/types/creativity';
import { CREATIVE_SYSTEM_PROMPT } from '../prompts/system';
import { buildScamperPrompt, buildFullScamperPrompt } from '../prompts/scamper';

/** 단일 SCAMPER 기법 적용 */
export async function scamperTransform(idea: Idea, technique: ScamperType): Promise<Idea> {
  const prompt = buildScamperPrompt(
    { title: idea.title, description: idea.description },
    technique
  );

  const parsed = await llmGenerateJSON<{
    title: string;
    description: string;
    transformation: string;
    noveltyScore: number;
  }>({ prompt, system: CREATIVE_SYSTEM_PROMPT, maxTokens: 1024 });

  return {
    id: `scamper-${technique}-${Date.now()}`,
    title: parsed.title,
    description: parsed.description,
    theory: 'scamper',
    method: technique,
    parentId: idea.id,
    scores: {
      domainRelevance: 0,
      creativeThinking: parsed.noveltyScore,
      motivation: 0,
      overall: 0,
    },
    createdAt: new Date().toISOString(),
  };
}

/** 모든 7가지 SCAMPER 한번에 적용 */
export async function scamperFullSweep(idea: Idea): Promise<Idea[]> {
  const prompt = buildFullScamperPrompt({
    title: idea.title,
    description: idea.description,
  });

  const parsed = await llmGenerateJSON<{
    results: { technique: ScamperType; title: string; description: string; transformation: string }[];
  }>({ prompt, system: CREATIVE_SYSTEM_PROMPT, maxTokens: 4096 });

  return parsed.results.map((r) => ({
    id: `scamper-${r.technique}-${Date.now()}`,
    title: r.title,
    description: r.description,
    theory: 'scamper' as const,
    method: r.technique,
    parentId: idea.id,
    createdAt: new Date().toISOString(),
  }));
}
