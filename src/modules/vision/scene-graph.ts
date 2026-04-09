/** Scene Graph 추출 — VLM 분석 결과를 우리 온톨로지 노드/엣지로 변환
 *
 * 이미지 분석 결과 → Concept 노드 + Idea 노드 + 엣지 생성
 *
 * 설계 근거:
 * - MMGraphRAG (Wan 2025, 2507.20804): 이미지를 속성이 아닌 독립 노드로 모델링
 *   → 텍스트 노드와 동등한 시민권 부여, cross-modal entity linking
 * - Memory in the Age of AI Agents (Liu 2025, 2512.13564): Planar(graph) memory
 *   → domain/layer 구분으로 hierarchical 기억 조직
 * - Agentic-KGR (Li 2025, 2510.09156): co-evolutionary KG + RL
 *   → 에이전트 활동이 그래프를 강화, 그래프가 에이전트를 강화
 *
 * 핵심 변경 (2026-04-09):
 * - 모든 노드에 domain, layer, agentId 필드 추가
 * - BELONGS_TO 엣지로 Domain에 연결 → domain 뷰에서 이미지+텍스트 통합
 * - GENERATED_BY 엣지로 Agent에 연결 → agent 뷰에서 시각 기여 추적
 * - metadata에 mood, colors, sourceType 추가 → 검색 시 멀티모달 필터링
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

export interface SceneGraphOptions {
  /** 소속 도메인 (예: 'creative', 'novel', 'architecture') */
  domain?: string;
  /** 분석을 요청한 에이전트 ID */
  agentId?: string;
  /** 그래프 레이어 (0=global, 1=domain, 2=agent). 기본 2 */
  layer?: number;
  /** 연결할 Domain 노드 ID (있으면 BELONGS_TO 엣지 생성) */
  domainNodeId?: string;
}

/** 이미지 분석 결과 → Graph 노드/엣지 생성 (domain/layer/agent 연결 포함) */
export function extractSceneGraph(
  analysis: ImageAnalysisResult,
  imageUrl: string,
  options: SceneGraphOptions = {},
): SceneGraphResult {
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const nodeIds: string[] = [];
  let nodesCreated = 0;
  let edgesCreated = 0;

  const { domain, agentId, layer = 2, domainNodeId } = options;

  // 공통 metadata — 멀티모달 검색 시 활용
  const sharedMeta = {
    sourceType: 'visual' as const,
    mood: analysis.mood,
    colors: analysis.colors,
    ...(domain ? { domain } : {}),
  };

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
      // ★ domain/layer/agent 연결
      domain,
      layer,
      agentId,
      metadata: sharedMeta,
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
      // ★ domain/layer/agent 연결
      domain,
      layer,
      agentId,
      metadata: sharedMeta,
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

  // 4. ★ Domain 노드에 연결 (BELONGS_TO) — domain 뷰에서 이미지+텍스트 통합
  if (domainNodeId) {
    for (const nodeId of nodeIds) {
      store.edges.push({
        id: `e-img-dom-${randomUUID().slice(0, 8)}`,
        source: nodeId,
        target: domainNodeId,
        type: 'BELONGS_TO',
        createdAt: now,
      });
      edgesCreated++;
    }
  }

  // 5. ★ Agent 노드에 연결 (GENERATED_BY) — agent 뷰에서 시각 기여 추적
  if (agentId) {
    const agentNodeId = agentId.startsWith('agent-') ? agentId : `agent-${agentId}`;
    for (const nodeId of nodeIds) {
      store.edges.push({
        id: `e-img-gen-${randomUUID().slice(0, 8)}`,
        source: agentNodeId,
        target: nodeId,
        type: 'GENERATED_BY',
        createdAt: now,
      });
      edgesCreated++;
    }
  }

  scheduleAutoSave();
  return { nodesCreated, edgesCreated, nodeIds };
}
