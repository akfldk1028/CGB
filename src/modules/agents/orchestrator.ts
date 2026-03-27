/** TypeScript 에이전트 오케스트레이터 (가벼운 세션용) */

import { runFourIsPipeline } from '../creativity/pipeline/four-is';
import { divergeConvergeCycle } from '../creativity/pipeline/diverge-converge';
import type { CreativeSession } from '@/types/session';

export type OrchestratorMode = 'full_pipeline' | 'brainstorm_only' | 'evaluate_only';

export async function orchestrate(
  mode: OrchestratorMode,
  topic: string,
  domain: string,
  options?: Record<string, unknown>
): Promise<CreativeSession | { selected: unknown[] }> {
  switch (mode) {
    case 'full_pipeline':
      return runFourIsPipeline(topic, domain, options as any);

    case 'brainstorm_only': {
      const result = await divergeConvergeCycle(topic, domain, 10, 5);
      return {
        selected: result.selected,
      };
    }

    default:
      throw new Error(`Unknown orchestrator mode: ${mode}`);
  }
}
