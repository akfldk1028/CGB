/** SCAMPER Tool — 에이전트가 자율적으로 SCAMPER 기법 적용 */

import type { AgentTool } from './registry';
import { SCAMPER_DESCRIPTIONS } from '@/config/creativity';

export const scamperTool: AgentTool = {
  name: 'scamper_transform',
  description: `Apply one of the 7 SCAMPER creative transformation techniques to an idea. Techniques: ${Object.keys(SCAMPER_DESCRIPTIONS).join(', ')}. The agent should choose the most appropriate technique based on the idea.`,
  parameters: {
    idea_title: { type: 'string', description: 'Title of the idea to transform' },
    idea_description: { type: 'string', description: 'Description of the idea' },
    technique: { type: 'string', description: 'SCAMPER technique: substitute, combine, adapt, modify, put_to_other_use, eliminate, rearrange' },
  },
  execute: async (params) => {
    const technique = params.technique as string;
    const desc = SCAMPER_DESCRIPTIONS[technique as keyof typeof SCAMPER_DESCRIPTIONS];
    if (!desc) {
      return { error: `Unknown SCAMPER technique: ${technique}. Use: ${Object.keys(SCAMPER_DESCRIPTIONS).join(', ')}` };
    }
    // 도구는 프레임만 제공 — 실제 변환은 에이전트 자신이 LLM으로 수행
    return {
      technique,
      name: desc.name,
      question: desc.question,
      instruction: `Apply "${desc.name}" to the idea "${params.idea_title}": ${desc.question}`,
      note: 'Generate the transformed idea based on this technique, then save it with graph_add_node.',
    };
  },
};
