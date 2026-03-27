/** Mind Mapping — 마인드맵 구조 생성 (Graph DB에 매핑) */

import { llmGenerateJSON } from '@/modules/llm/client';
import { JSON_INSTRUCTION, CREATIVE_SYSTEM_PROMPT } from '../prompts/system';

export interface MindMapNode {
  id: string;
  label: string;
  parentId?: string;
  level: number;
}

export async function generateMindMap(
  centralIdea: string,
  domain: string,
  depth = 3
): Promise<MindMapNode[]> {
  const prompt = `Create a MIND MAP for creative exploration.

Central idea: "${centralIdea}"
Domain: "${domain}"
Depth: ${depth} levels

Rules (from Mind Mapping technique):
- Start with the central idea in the center
- Draw lines outward to sub-topics
- For each sub-topic, draw more lines to related concepts
- Use keywords rather than sentences
- Create a web of ideas that fans out

${JSON_INSTRUCTION}

Format:
{
  "nodes": [
    { "id": "center", "label": "${centralIdea}", "level": 0 },
    { "id": "branch-1", "label": "...", "parentId": "center", "level": 1 },
    { "id": "sub-1-1", "label": "...", "parentId": "branch-1", "level": 2 },
    ...
  ]
}

Generate 4-6 branches at level 1, 2-3 sub-topics per branch at level 2, and 1-2 at level 3.`;

  const parsed = await llmGenerateJSON<{ nodes: MindMapNode[] }>({
    prompt,
    system: CREATIVE_SYSTEM_PROMPT,
    maxTokens: 2048,
  });
  return parsed.nodes;
}
