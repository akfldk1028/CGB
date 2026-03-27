/** Memgraph 쿼리 결과 → react-force-graph-3d 데이터 변환 */

import type { GraphNode, GraphEdge, Graph3DData, Graph3DNode, Graph3DLink, NodeType, EdgeType } from '@/types/graph';
import { NODE_STYLES, getEdgeStyle } from '@/config/graph-styles';

export function toGraph3D(nodes: GraphNode[], edges: GraphEdge[]): Graph3DData {
  const graph3dNodes: Graph3DNode[] = nodes.map((n) => {
    const style = NODE_STYLES[n.type] ?? NODE_STYLES.Idea;
    return {
      id: n.id,
      name: n.title,
      type: n.type,
      val: style.size + (n.score ? n.score / 25 : 0),
      color: style.color,
      description: n.description,
      score: n.score,
      method: n.method,
      imageUrl: n.imageUrl,
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  const graph3dLinks: Graph3DLink[] = edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => {
      const style = getEdgeStyle(e.type);
      return {
        source: e.source,
        target: e.target,
        type: e.type,
        color: style.color,
        width: style.width,
        particles: style.particles,
        particleSpeed: style.particleSpeed,
      };
    });

  return { nodes: graph3dNodes, links: graph3dLinks };
}
