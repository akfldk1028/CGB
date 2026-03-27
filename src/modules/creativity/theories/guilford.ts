/** Guilford's Structure of Intellect (SI) Model — 발산/수렴 사고 엔진
 *
 * 학술 근거: Guilford, J.P. (1967). The Nature of Human Intelligence.
 * 수업자료 슬라이드 3: SI 모델의 6가지 인지 작업
 *
 * 구현 범위:
 *   1. Cognition (이해) — 시스템 전반의 context 파싱으로 암묵적 구현
 *   2. Memory recording (인코딩) — Graph DB에 아이디어 저장으로 구현
 *   3. Memory retention (회상) — Graph DB에서 관련 아이디어 검색으로 구현
 *   4. Divergent production ← divergentGenerate() ✅ 핵심 구현
 *   5. Convergent production ← convergentSelect() ✅ 핵심 구현
 *   6. Evaluation (판단) — Amabile 3요소 평가 체계로 대체 구현
 *      (Guilford의 Evaluation = "정보가 정확/일관적인지 판단"
 *       → Amabile의 domainRelevance + creativeThinking으로 더 세분화)
 *
 * Key Idea: "양이 질보다 먼저" — 발산 단계에서는 비판 없이 최대한 많이 생성
 */

import { llmGenerateJSON } from '@/modules/llm/client';
import { CREATIVE_SYSTEM_PROMPT } from '../prompts/system';
import { buildDivergentPrompt } from '../prompts/divergent';
import { buildConvergentPrompt } from '../prompts/convergent';
import type { Idea, DivergentResult, ConvergentResult, IdeaScores } from '@/types/creativity';

/** 발산적 생성: 주제에서 N개 아이디어 독립 생성 */
export async function divergentGenerate(
  topic: string,
  domain: string,
  count = 10,
  graphContext?: string
): Promise<DivergentResult> {
  const prompt = buildDivergentPrompt(topic, domain, count, graphContext);

  const parsed = await llmGenerateJSON<{ ideas: { title: string; description: string }[] }>({
    prompt,
    system: CREATIVE_SYSTEM_PROMPT,
    maxTokens: 4096,
  });

  const ideas: Idea[] = parsed.ideas.map((raw, i) => ({
    id: `idea-${Date.now()}-${i}`,
    title: raw.title,
    description: raw.description,
    theory: 'guilford_si',
    method: 'divergent',
    createdAt: new Date().toISOString(),
  }));

  return { ideas, totalGenerated: ideas.length, method: 'direct' };
}

/** 수렴적 선택: 아이디어를 평가하고 순위 매기기 */
export async function convergentSelect(
  ideas: Idea[],
  domain: string,
  criteria?: string[]
): Promise<ConvergentResult> {
  const prompt = buildConvergentPrompt(
    ideas.map((i) => ({ title: i.title, description: i.description })),
    domain,
    criteria
  );

  let parsed: {
    ranked?: { index: number; title: string; scores: IdeaScores; reasoning: string }[];
    eliminated?: { index: number; reason: string }[];
  };
  try {
    parsed = await llmGenerateJSON({ prompt, system: CREATIVE_SYSTEM_PROMPT, maxTokens: 8192 });
  } catch {
    // LLM parsing failed — return all ideas unranked with default scores
    return {
      ranked: ideas.map((idea) => ({ ...idea, scores: { domainRelevance: 70, creativeThinking: 70, motivation: 70, overall: 70 } })),
      criteria: criteria ?? ['domain relevance', 'creative originality', 'feasibility'],
      eliminated: [],
    };
  }

  const rankedArr = Array.isArray(parsed.ranked) ? parsed.ranked : [];
  const eliminatedArr = Array.isArray(parsed.eliminated) ? parsed.eliminated : [];

  const ranked: Idea[] = rankedArr
    .filter((r) => r.index >= 0 && r.index < ideas.length)
    .map((r) => ({
      ...ideas[r.index],
      scores: r.scores,
    }));

  // If ranking produced nothing useful, return all ideas
  if (ranked.length === 0) {
    return {
      ranked: ideas.map((idea) => ({ ...idea, scores: { domainRelevance: 70, creativeThinking: 70, motivation: 70, overall: 70 } })),
      criteria: criteria ?? ['domain relevance', 'creative originality', 'feasibility'],
      eliminated: [],
    };
  }

  const eliminated = eliminatedArr
    .filter((e) => e.index >= 0 && e.index < ideas.length)
    .map((e) => ideas[e.index]?.id)
    .filter(Boolean);

  return { ranked, criteria: criteria ?? ['domain relevance', 'creative originality', 'feasibility'], eliminated };
}
