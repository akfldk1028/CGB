/** Graph DB 타입 정의 — 4계층 온톨로지 + 3D 시각화
 *
 * 온톨로지 설계 근거:
 * - Barrios et al. (2020) — 아이디어 온톨로지 (arxiv:2009.05282)
 * - Csikszentmihalyi (1996) — Domain의 규칙/관습을 그래프로 표현
 * - Rhodes (1961) — 4P's: Person(Agent), Process(Session), Product(Artifact), Press(Domain)
 * - Finke et al. (1992) — Geneplore maturity stages (raw→explored→refined→validated)
 *
 * 상세 스키마 + 노드별 인터페이스: modules/graph/schema.ts
 */

import type { EdgeType as SchemaEdgeType } from '@/modules/graph/schema';

/** 노드 타입 — 4계층(Domain>Topic>Idea>Artifact) + 보조(Concept, Session, Agent) */
export type NodeType = 'Domain' | 'Topic' | 'Idea' | 'Artifact' | 'Concept' | 'Session' | 'Agent';

/** 엣지 타입 — schema.ts에서 정의된 3계층 union */
export type EdgeType = SchemaEdgeType;

/** 범용 그래프 노드 (시각화/API용) */
export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  method?: string;
  authorAgent?: string;
  score?: number;
  /** 계층 레벨 (0=Domain, 1=Topic, 2=Idea, 3=Artifact) */
  level?: number;
  /** 부모 노드 ID (계층 구조) */
  parentId?: string;
  /** 생성한 사용자 ID (My Brain vs Collective Brain 필터링) */
  userId?: string;
  /** 이미지 URL (Vercel Blob or base64 data URI) */
  imageUrl?: string;
  /** VLM 분석 결과 요약 */
  imageAnalysis?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  weight?: number;
  /** 엣지 카테고리 */
  category?: 'creation' | 'semantic' | 'structural';
  createdAt: string;
}

// ═══════════════════════════════════════════
// 3D 시각화용 타입
// ═══════════════════════════════════════════

export interface Graph3DData {
  nodes: Graph3DNode[];
  links: Graph3DLink[];
}

export interface Graph3DNode {
  id: string;
  name: string;
  type: NodeType;
  val: number;
  color: string;
  description?: string;
  score?: number;
  method?: string;
  level?: number;
  imageUrl?: string;
}

export interface Graph3DLink {
  source: string;
  target: string;
  type: string;
  color: string;
  width: number;
  curvature?: number;
  particles?: number;
  particleSpeed?: number;
  category?: 'creation' | 'semantic' | 'structural';
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodes: number;
  totalEdges: number;
}
