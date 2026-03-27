/** Geneplore Model — Generate + Explore 2단계 */

import type { Idea, GeneploreResult } from '@/types/creativity';
import { divergentGenerate, convergentSelect } from './guilford';
import { scamperTransform } from '../techniques/scamper';

/**
 * Geneplore 풀 사이클:
 * 1. Generative phase: raw 아이디어 대량 생성
 * 2. Exploratory phase: 상위 아이디어에 SCAMPER 적용하여 정제
 */
export async function geneploreCycle(
  topic: string,
  domain: string,
  generateCount = 10,
  exploreTopK = 3
): Promise<GeneploreResult> {
  // Phase 1: Generate
  const generated = await divergentGenerate(topic, domain, generateCount);

  // Phase 2: Explore — 상위 아이디어 선별 후 SCAMPER 변주
  const evaluated = await convergentSelect(generated.ideas, domain);
  const topIdeas = evaluated.ranked.slice(0, exploreTopK);

  const refined: Idea[] = [];
  for (const idea of topIdeas) {
    // 각 상위 아이디어에 랜덤 SCAMPER 적용
    const techniques = ['substitute', 'combine', 'adapt', 'modify'] as const;
    const technique = techniques[Math.floor(Math.random() * techniques.length)];
    const transformed = await scamperTransform(idea, technique);
    refined.push(transformed);
  }

  return {
    generativePhase: generated.ideas,
    exploratoryPhase: topIdeas,
    refined,
  };
}
