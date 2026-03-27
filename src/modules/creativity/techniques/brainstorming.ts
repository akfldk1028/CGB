/** 브레인스토밍 기법 — Nominal Group + Direct */

import { divergentGenerate } from '../theories/guilford';
import type { Idea, DivergentResult } from '@/types/creativity';

/** Nominal Group Technique: 개별 생성 → 취합 → 투표 */
export async function nominalGroupBrainstorm(
  topic: string,
  domain: string,
  rounds = 3,
  ideasPerRound = 5
): Promise<DivergentResult> {
  const allIdeas: Idea[] = [];

  // 여러 라운드 독립 생성 (각 라운드가 "개인")
  for (let i = 0; i < rounds; i++) {
    const result = await divergentGenerate(topic, domain, ideasPerRound);
    allIdeas.push(...result.ideas);
  }

  // 중복 제거 (제목 유사도 기반)
  const unique = deduplicateByTitle(allIdeas);

  return {
    ideas: unique,
    totalGenerated: allIdeas.length,
    method: 'nominal_group',
  };
}

function deduplicateByTitle(ideas: Idea[]): Idea[] {
  const seen = new Set<string>();
  return ideas.filter((idea) => {
    const normalized = idea.title.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
