/** 발산→수렴 단일 사이클 (경량 세션용) */

import type { Idea } from '@/types/creativity';
import { divergentGenerate, convergentSelect } from '../theories/guilford';

export async function divergeConvergeCycle(
  topic: string,
  domain: string,
  generateCount = 10,
  selectTopK = 3
): Promise<{ all: Idea[]; selected: Idea[]; eliminated: string[] }> {
  const diverged = await divergentGenerate(topic, domain, generateCount);
  const converged = await convergentSelect(diverged.ideas, domain);

  return {
    all: diverged.ideas,
    selected: converged.ranked.slice(0, selectTopK),
    eliminated: converged.eliminated,
  };
}
