/** VLM 이미지 분석 — Gemini multimodal로 시각적 개념 추출
 *
 * 논문 근거:
 * - Visual World Models (Wu 2026, 2601.19834): 시각적 개념 조작으로 추론
 * - VLM + Scene Graph (Lohner 2024, 2407.05910): 이미지 → 그래프 변환
 * - AI Agent KG Construction (Peshevski 2025, 2511.11017): 비정형 → KG 자동 구축
 */

import { generateText } from 'ai';
import { getModel, extractJSON } from '@/modules/llm/client';

export interface ImageAnalysisResult {
  description: string;
  concepts: string[];
  objects: { name: string; relation?: string }[];
  mood: string;
  colors: string[];
  inspirations: string[];
}

const ANALYSIS_PROMPT = `You are a visual analyst for a creative AI system.
Analyze this image and extract structured information for a knowledge graph.

Respond ONLY with raw JSON (no markdown, no \`\`\`json blocks):
{
  "description": "1-2 sentence description of the image",
  "concepts": ["concept1", "concept2", ...],
  "objects": [{"name": "object", "relation": "relationship to other objects"}],
  "mood": "overall mood/atmosphere",
  "colors": ["dominant color 1", "color 2"],
  "inspirations": ["creative idea inspired by this image", "another idea"]
}

Focus on:
- Abstract concepts and themes (not just literal objects)
- Relationships between elements
- Creative potential — what ideas could this image inspire?
- Cross-domain connections (e.g., a spiral shell → fibonacci → UI layout)`;

export async function analyzeImage(
  imageSource: string,
  context?: string
): Promise<ImageAnalysisResult> {
  const isBase64 = imageSource.startsWith('data:');
  const isUrl = imageSource.startsWith('http');

  const imageContent = isBase64
    ? { type: 'image' as const, image: imageSource }
    : isUrl
      ? { type: 'image' as const, image: new URL(imageSource) }
      : { type: 'image' as const, image: Buffer.from(imageSource, 'base64') };

  const contextNote = context ? `\n\nContext for relevance: "${context}"` : '';

  const result = await generateText({
    model: getModel(),
    messages: [
      {
        role: 'user',
        content: [
          imageContent,
          { type: 'text', text: ANALYSIS_PROMPT + contextNote },
        ],
      },
    ],
    maxOutputTokens: 4096,
  });

  try {
    return extractJSON<ImageAnalysisResult>(result.text);
  } catch {
    return {
      description: result.text.slice(0, 200),
      concepts: [],
      objects: [],
      mood: 'unknown',
      colors: [],
      inspirations: [],
    };
  }
}
