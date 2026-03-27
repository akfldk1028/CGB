/** API 요청/응답 공통 타입 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface GraphVisualizationParams {
  /** 노드 최대 수 */
  maxNodes?: number;
  /** 특정 세션의 그래프만 */
  sessionId?: string;
  /** 특정 노드 중심 N-depth */
  centerId?: string;
  depth?: number;
}
