/** 3D 그래프 시각화 스타일 정의 — 4계층 온톨로지 반영 */

import type { NodeType } from '@/types/graph';

/** 배경 */
export const GRAPH_BG = '#050510';

/** 노드 타입별 색상 + 크기 — 계층 구조 반영 (상위=크게, 하위=작게) */
export const NODE_STYLES: Record<NodeType, { color: string; size: number; glow: number }> = {
  // 4계층 (크기 = 계층적 중요도)
  Domain:   { color: '#66BB6A', size: 14, glow: 1.0 },   // 초록, 가장 큼 — Level 0
  Topic:    { color: '#29B6F6', size: 10, glow: 0.8 },   // 하늘, 큼 — Level 1
  Idea:     { color: '#FFD700', size: 7,  glow: 1.5 },   // 금색, 중간 — Level 2 (핵심)
  Artifact: { color: '#AB47BC', size: 9,  glow: 2.0 },   // 보라, 큼 — Level 3 (최종 산출물)
  // 보조 노드
  Concept:  { color: '#4FC3F7', size: 5,  glow: 0.6 },   // 연한 하늘, 작음
  Session:  { color: '#EF5350', size: 5,  glow: 0.4 },   // 빨강, 작음
  Agent:    { color: '#FF9800', size: 4,  glow: 0.3 },   // 주황, 가장 작음
};

/** 엣지 스타일 — 카테고리 기반 기본값 */
export interface EdgeStyle {
  color: string;
  width: number;
  particles: number;
  particleSpeed: number;
  dash?: boolean;
}

/** 엣지 카테고리별 기본 스타일 */
export const EDGE_CATEGORY_STYLES: Record<'creation' | 'semantic' | 'structural', EdgeStyle> = {
  creation:   { color: '#FFD700', width: 2.0, particles: 4, particleSpeed: 0.006 },
  semantic:   { color: '#4FC3F7', width: 1.5, particles: 2, particleSpeed: 0.003, dash: true },
  structural: { color: '#66BB6A', width: 1.0, particles: 0, particleSpeed: 0 },
};

/** 개별 엣지 타입 스타일 오버라이드 (자주 쓰는 것만) */
export const EDGE_STYLES: Record<string, EdgeStyle> = {
  // 생성 관계 (금색 계열 + 파티클)
  INSPIRED_BY:      { color: '#4FC3F7', width: 1.5, particles: 3, particleSpeed: 0.004, dash: true },
  ITERATED_FROM:    { color: '#FFD700', width: 2.5, particles: 5, particleSpeed: 0.008 },
  COMBINED_FROM:    { color: '#E040FB', width: 2.0, particles: 4, particleSpeed: 0.006 },
  SCAMPER_OF:       { color: '#FF5252', width: 1.5, particles: 3, particleSpeed: 0.005, dash: true },
  DERIVED_FROM:     { color: '#FFC107', width: 1.5, particles: 2, particleSpeed: 0.004 },
  GENERATED_BY:     { color: '#FF9800', width: 0.8, particles: 0, particleSpeed: 0 },
  RESEARCHED_FROM:  { color: '#81C784', width: 1.0, particles: 1, particleSpeed: 0.002 },
  // 의미 관계 (하늘색 계열 + 점선)
  CONTRADICTS:      { color: '#F44336', width: 2.0, particles: 2, particleSpeed: 0.003, dash: true },
  SUPPORTS:         { color: '#4CAF50', width: 1.5, particles: 2, particleSpeed: 0.003 },
  CAUSES:           { color: '#FF9800', width: 1.8, particles: 3, particleSpeed: 0.005 },
  SIMILAR_TO:       { color: '#00BCD4', width: 1.0, particles: 1, particleSpeed: 0.002, dash: true },
  ALTERNATIVE_TO:   { color: '#9C27B0', width: 1.2, particles: 1, particleSpeed: 0.002, dash: true },
  PREREQUISITE_OF:  { color: '#795548', width: 1.5, particles: 2, particleSpeed: 0.004 },
  EXTENDS:          { color: '#00BCD4', width: 1.5, particles: 2, particleSpeed: 0.004 },
  // 구조 관계 (초록 계열, 파티클 없음)
  PART_OF:          { color: '#8BC34A', width: 1.2, particles: 0, particleSpeed: 0 },
  GENERALIZES:      { color: '#9C27B0', width: 1.3, particles: 0, particleSpeed: 0 },
  SPECIALIZES:      { color: '#673AB7', width: 1.3, particles: 0, particleSpeed: 0 },
  BELONGS_TO:       { color: '#66BB6A', width: 1.0, particles: 0, particleSpeed: 0 },
  PRODUCED_IN:      { color: '#AB47BC', width: 1.0, particles: 0, particleSpeed: 0 },
  USES_CONCEPT:     { color: '#4FC3F7', width: 0.8, particles: 0, particleSpeed: 0 },
  ADDRESSES_TOPIC:  { color: '#29B6F6', width: 0.8, particles: 0, particleSpeed: 0 },
  PRODUCES:         { color: '#AB47BC', width: 1.5, particles: 2, particleSpeed: 0.003 },
};

/** 엣지 스타일 조회 (없으면 카테고리 기본값) */
export function getEdgeStyle(type: string, category?: string): EdgeStyle {
  return EDGE_STYLES[type] ?? EDGE_CATEGORY_STYLES[(category ?? 'structural') as keyof typeof EDGE_CATEGORY_STYLES];
}

/** Bloom 후처리 설정 — 은은한 뇌 발광 */
export const BLOOM_CONFIG = { strength: 1.2, radius: 0.8, threshold: 0.15 };

/** 카메라 설정 */
export const CAMERA_CONFIG = { distance: 500, fov: 55, autoRotateSpeed: 0.15 };

/** 물리엔진 — 퍼지는 뇌 형태
 * 핵심: 강한 반발력 + 느린 안정화 → 뉴런처럼 넓게 퍼짐 */
export const PHYSICS_CONFIG = {
  d3AlphaDecay: 0.008,
  d3VelocityDecay: 0.15,
  chargeStrength: -180,
  linkDistanceStructural: 35,
  linkDistanceSemantic: 90,
  linkDistanceCreation: 60,
  warmupTicks: 200,
  cooldownTime: 3000,
};

/** 엣지 타입 → 링크 거리 매핑 */
const STRUCTURAL_EDGES = ['BELONGS_TO', 'PART_OF', 'ADDRESSES_TOPIC', 'PRODUCED_IN', 'USES_CONCEPT'];
const CREATION_EDGES = ['INSPIRED_BY', 'ITERATED_FROM', 'COMBINED_FROM', 'SCAMPER_OF', 'DERIVED_FROM'];

export function getLinkDistance(edgeType: string): number {
  if (STRUCTURAL_EDGES.includes(edgeType)) return PHYSICS_CONFIG.linkDistanceStructural;
  if (CREATION_EDGES.includes(edgeType)) return PHYSICS_CONFIG.linkDistanceCreation;
  return PHYSICS_CONFIG.linkDistanceSemantic;
}

/** 노드 라벨 표시 최소 줌 거리 */
export const LABEL_VISIBLE_DISTANCE = 250;
