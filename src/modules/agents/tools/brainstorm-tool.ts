/** Brainstorm Tool — 발산적 아이디어 생성 프레임 */

import type { AgentTool } from './registry';

export const brainstormTool: AgentTool = {
  name: 'brainstorm',
  description: 'Generate multiple creative ideas using brainstorming rules (Guilford divergent thinking). Rules: No criticism, quantity over quality, wild ideas welcome, build on others. Save each idea to the graph with graph_add_node.',
  parameters: {
    topic: { type: 'string', description: 'Topic to brainstorm about' },
    count: { type: 'number', description: 'How many ideas to generate (default 5)' },
    method: { type: 'string', description: 'Method: direct, nominal_group, role_storming' },
  },
  execute: async (params) => {
    return {
      framework: 'Guilford SI Model — Divergent Production',
      rules: [
        'No criticism — every idea is valid',
        'Quantity over quality — generate as many as possible',
        'Wild ideas welcome — the crazier the better',
        'Build on others — combine and extend existing ideas',
      ],
      instruction: `Generate ${params.count ?? 5} ideas about "${params.topic}" using ${params.method ?? 'direct'} brainstorming. Save each to the graph.`,
    };
  },
};
