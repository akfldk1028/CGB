/** Scene Graph 추출 — VLM 분석 결과를 우리 온톨로지 노드/엣지로 변환
 *
 * 이미지 분석 결과 → Concept 노드 + Idea 노드 + 엣지 생성
 */

import { randomUUID } from 'crypto';
import type { ImageAnalysisResult } from './analyze';
import { getMemoryStore } from '@/modules/agents/tools/graph-tools';
import { scheduleAutoSave } from '@/modules/graph/persistence';
import { emitNodeCreated } from '@/modules/graph/events';

export interface SceneGraphResult {
  nodesCreated: number;
  edgesCreated: number;
  nodeIds: string[];
}

/** 이미지 분석 결과 → Graph 노드/엣지 생성 */
export function extractSceneGraph(
  analysis: ImageAnalysisResult,
  imageUrl: string,
): SceneGraphResult {
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const nodeIds: string[] = [];
  let nodesCreated = 0;
  let edgesCreated = 0;

  // 1. 개념들 → Concept 노드
  const conceptIds: string[] = [];
  for (const concept of analysis.concepts.slice(0, 5)) {
    const id = `concept-img-${randomUUID().slice(0, 8)}`;
    store.nodes.push({
      id,
      type: 'Concept',
      title: concept,
      description: `Visual concept extracted from image: ${analysis.description.slice(0, 100)}`,
      method: 'scene_graph_extract',
      imageUrl,
      createdAt: now,
    });
    emitNodeCreated({ id, type: 'Concept', title: concept, description: concept });
    conceptIds.push(id);
    nodeIds.push(id);
    nodesCreated++;
  }

  // 2. 영감 아이디어 → Idea 노드
  for (const inspiration of analysis.inspirations.slice(0, 3)) {
    const id = `idea-img-${randomUUID().slice(0, 8)}`;
    store.nodes.push({
      id,
      type: 'Idea',
      title: inspiration,
      description: `Inspired by image: ${analysis.description}. Mood: ${analysis.mood}. Colors: ${analysis.colors.join(', ')}`,
      method: 'visual_inspiration',
      imageUrl,
      createdAt: now,
    });
    emitNodeCreated({ id, type: 'Idea', title: inspiration, description: inspiration });
    nodeIds.push(id);
    nodesCreated++;

    // Idea → Concept 엣지 (USES_CONCEPT)
    for (const conceptId of conceptIds) {
      store.edges.push({
        id: `e-img-${randomUUID().slice(0, 8)}`,
        source: id,
        target: conceptId,
        type: 'USES_CONCEPT',
        createdAt: now,
      });
      edgesCreated++;
    }
  }

  // 3. 개념 간 관계 → SIMILAR_TO 엣지
  for (let i = 0; i < conceptIds.length - 1; i++) {
    store.edges.push({
      id: `e-img-rel-${randomUUID().slice(0, 8)}`,
      source: conceptIds[i],
      target: conceptIds[i + 1],
      type: 'SIMILAR_TO',
      createdAt: now,
    });
    edgesCreated++;
  }

  scheduleAutoSave();
  return { nodesCreated, edgesCreated, nodeIds };
}
