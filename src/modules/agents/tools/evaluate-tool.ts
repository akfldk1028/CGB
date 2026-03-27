/** Evaluate Tool — 6차원 평가 (Amabile 3요소 + Agent Ideate 3기준)
 *
 * 근거:
 * - Amabile, T.M. (1996). Creativity in Context. — 3요소 (domain, creative, motivation)
 * - Agent Ideate (Kanumolu et al., IJCAI 2025) — 6기준 평가 체계
 *   (Technical Validity, Innovativeness, Specificity, Need Validation, Market Size, Competitive Advantage)
 *
 * 통합: Amabile 3요소를 유지하면서 Agent Ideate의 실용적 기준 3개 추가 = 6차원
 */

import type { AgentTool } from './registry';

export const evaluateTool: AgentTool = {
  name: 'evaluate_idea',
  description: `Evaluate an idea using a 6-dimensional framework combining Amabile's Componential Theory (1996) with Agent Ideate (IJCAI 2025) criteria. Scores 6 dimensions weighted to 100.`,
  parameters: {
    idea_title: { type: 'string', description: 'Title of the idea' },
    idea_description: { type: 'string', description: 'Description' },
    domain: { type: 'string', description: 'Domain context for evaluation' },
  },
  execute: async (params) => {
    return {
      framework: 'Amabile (1996) + Agent Ideate (IJCAI 2025) — 6-Dimensional Evaluation',
      criteria: {
        // Amabile 3요소
        domainRelevance:      { weight: 0.15, question: 'How well does it fit domain knowledge, technical skills, and standards? (Amabile: Domain-relevant skills)' },
        creativeThinking:     { weight: 0.30, question: 'How novel, surprising, and non-obvious? Cognitive flexibility and risk-taking? (Amabile: Creative thinking skills — highest weight)' },
        intrinsicMotivation:  { weight: 0.10, question: 'How intrinsically interesting? Would someone pursue this out of genuine curiosity? (Amabile: Intrinsic > extrinsic)' },
        // Agent Ideate 3기준
        specificity:          { weight: 0.15, question: 'How clearly and narrowly defined? Is it "manage references" (specific) or "do research" (vague)? (Agent Ideate: Specificity)' },
        marketNeed:           { weight: 0.15, question: 'Is there a clear, valid user need? Is the target market large enough? (Agent Ideate: Need Validation + Market Size)' },
        competitiveAdvantage: { weight: 0.15, question: 'Does it offer a unique advantage over existing solutions? What makes it defensible? (Agent Ideate: Competitive Advantage)' },
      },
      formula: 'overall = domain*0.15 + creative*0.30 + motivation*0.10 + specificity*0.15 + market*0.15 + advantage*0.15',
      instruction: 'Score each dimension 0-100. Calculate weighted overall. Provide specific reasoning for each score. Flag any dimension below 30 as a critical weakness.',
      reference: 'Amabile (1996) "Creativity in Context" + Kanumolu et al. (IJCAI 2025) "Agent Ideate"',
    };
  },
};
