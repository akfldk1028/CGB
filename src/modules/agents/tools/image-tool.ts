/** Image Analysis Tool — 에이전트가 이미지를 분석하고 Graph 노드 생성
 *
 * 논문 근거:
 * - Visual World Models (Wu 2026): 시각적 개념 조작으로 추론
 * - AI Agent KG Construction (Peshevski 2025): 비정형 데이터 → KG 자동 구축
 */

import type { AgentTool } from './registry';
import { analyzeImage } from '@/modules/vision/analyze';
import { extractSceneGraph } from '@/modules/vision/scene-graph';

export const imageAnalysisTool: AgentTool = {
  name: 'analyze_image',
  description:
    'Analyze an image using VLM to extract visual concepts, objects, mood, and relationships. ' +
    'Automatically creates Concept and Idea nodes in the knowledge graph from visual inspiration. ' +
    'Use this when the user provides an image or when you find a relevant image URL during research.',
  parameters: {
    imageUrl: { type: 'string', description: 'URL of the image to analyze (http:// or data: URI)' },
    context: { type: 'string', description: 'Topic/domain context for relevance (optional)' },
  },
  execute: async (params) => {
    const imageUrl = params.imageUrl as string;
    const context = params.context as string | undefined;

    if (!imageUrl) {
      return { error: 'imageUrl is required' };
    }

    try {
      const analysis = await analyzeImage(imageUrl, context);
      const sceneGraph = extractSceneGraph(analysis, imageUrl);

      return {
        analysis: {
          description: analysis.description,
          concepts: analysis.concepts,
          mood: analysis.mood,
          colors: analysis.colors,
          inspirations: analysis.inspirations,
          objectCount: analysis.objects.length,
        },
        graphResult: {
          nodesCreated: sceneGraph.nodesCreated,
          edgesCreated: sceneGraph.edgesCreated,
          nodeIds: sceneGraph.nodeIds,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `Image analysis failed: ${message}` };
    }
  },
};
