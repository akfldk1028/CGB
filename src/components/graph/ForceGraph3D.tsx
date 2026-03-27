'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { Graph3DData, Graph3DNode } from '@/types/graph';
import { GRAPH_BG, NODE_STYLES, getEdgeStyle, BLOOM_CONFIG, CAMERA_CONFIG, PHYSICS_CONFIG, getLinkDistance } from '@/config/graph-styles';

// Canvas 텍스처 캐시 — 같은 imageUrl + color 조합은 재사용
const canvasTextureCache = new Map<string, THREE.CanvasTexture>();

interface ForceGraph3DProps {
  data: Graph3DData;
  width?: number;
  height?: number;
  onNodeClick?: (node: Graph3DNode) => void;
  onNodeHover?: (node: Graph3DNode | null) => void;
  autoRotate?: boolean;
  showLabels?: boolean;
}

export default function ForceGraph3DComponent({
  data,
  width,
  height,
  onNodeClick,
  onNodeHover,
  autoRotate = true,
  showLabels = true,
}: ForceGraph3DProps) {
  const graphRef = useRef<any>(null);
  const [ForceGraph, setForceGraph] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Dynamic import
  useEffect(() => {
    import('react-force-graph-3d').then((mod) => {
      setForceGraph(() => mod.default);
    });
  }, []);

  // 자동 회전
  useEffect(() => {
    if (!graphRef.current || !autoRotate) return;
    const controls = graphRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = CAMERA_CONFIG.autoRotateSpeed;
    }
  }, [autoRotate, ForceGraph]);

  // 물리엔진 — 퍼지는 뇌 형태
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;

    // 반발력 — 노드를 멀리 밀어냄
    fg.d3Force('charge')?.strength(PHYSICS_CONFIG.chargeStrength);

    // 링크 거리 — 관계 타입별 다른 거리
    fg.d3Force('link')?.distance((link: any) => {
      return getLinkDistance(link.type ?? '');
    });

    // 중심력 약화 — 더 넓게 퍼짐
    fg.d3Force('center')?.strength(0.03);
  }, [ForceGraph, data]);

  // Bloom 후처리
  useEffect(() => {
    if (!graphRef.current) return;
    const renderer = graphRef.current.renderer();
    if (!renderer) return;

    Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
      const scene = graphRef.current.scene();
      const camera = graphRef.current.camera();
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(
        new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          BLOOM_CONFIG.strength,
          BLOOM_CONFIG.radius,
          BLOOM_CONFIG.threshold
        )
      );
      graphRef.current.postProcessingComposer(composer);
    }).catch(() => {});
  }, [ForceGraph]);

  const handleNodeClick = useCallback((node: any) => {
    if (graphRef.current) {
      const distance = 100;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1500
      );
    }
    onNodeClick?.(node);
  }, [onNodeClick]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node?.id ?? null);
    onNodeHover?.(node ?? null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = node ? 'pointer' : 'default';
    }
  }, [onNodeHover]);

  if (!ForceGraph) {
    return (
      <div className="flex items-center justify-center" style={{ width: width || '100%', height: height || '100vh', background: GRAPH_BG }}>
        <div className="text-white/30 text-sm font-mono animate-pulse">Initializing neural graph...</div>
      </div>
    );
  }

  return (
    <div style={{ width: width || '100%', height: height || '100vh' }}>
      <ForceGraph
      ref={graphRef}
      graphData={data}
      width={width}
      height={height}
      backgroundColor={GRAPH_BG}
      enableNodeDrag={true}
      enableNavigationControls={true}
      enablePointerInteraction={true}
      // 이미지 노드 — 원형 이미지 + 컬러 보더 (구체 대체, 캐시)
      nodeThreeObject={(node: Graph3DNode) => {
        const hasImage = node.imageUrl && (node.imageUrl.startsWith('http') || node.imageUrl.startsWith('data:'));
        if (!hasImage) return undefined as any;

        const cacheKey = `${node.imageUrl}|${node.color}`;
        let canvasTexture = canvasTextureCache.get(cacheKey);

        if (!canvasTexture) {
          const canvasSize = 128;
          const border = 10;
          const canvas = document.createElement('canvas');
          canvas.width = canvasSize;
          canvas.height = canvasSize;
          const ctx = canvas.getContext('2d')!;
          const cx = canvasSize / 2;
          const r = cx - 2;

          // 1. 컬러 보더 원
          ctx.beginPath();
          ctx.arc(cx, cx, r, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          // 2. 안쪽 어두운 원 (이미지 로딩 전 배경)
          ctx.beginPath();
          ctx.arc(cx, cx, r - border, 0, Math.PI * 2);
          ctx.fillStyle = '#111';
          ctx.fill();

          canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTextureCache.set(cacheKey, canvasTexture);

          // 3. 이미지 비동기 로드 → 원형 클리핑
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const ct = canvasTexture; // closure 캡처
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cx, r - border, 0, Math.PI * 2);
            ctx.clip();
            const s = Math.min(img.width, img.height);
            const sx = (img.width - s) / 2;
            const sy = (img.height - s) / 2;
            ctx.drawImage(img, sx, sy, s, s, border, border, canvasSize - border * 2, canvasSize - border * 2);
            ctx.restore();
            ct.needsUpdate = true;
          };
          img.src = node.imageUrl!;
        }

        const material = new THREE.SpriteMaterial({ map: canvasTexture, transparent: true });
        const sprite = new THREE.Sprite(material);
        const size = (node.val ?? 8) * 2.5;
        sprite.scale.set(size, size, 1);
        return sprite;
      }}
      // 이미지 노드: 구체 대체 (false), 일반 노드: 기본 구체 유지 (true)
      nodeThreeObjectExtend={(node: any) => {
        return !(node.imageUrl && (node.imageUrl.startsWith('http') || node.imageUrl.startsWith('data:')));
      }}
      // 노드
      nodeVal={(node: Graph3DNode) => node.val}
      nodeColor={(node: Graph3DNode) => {
        if (hoveredNode && hoveredNode !== node.id) {
          const isLinked = data.links.some(
            (l) =>
              ((l.source as any)?.id ?? l.source) === hoveredNode && ((l.target as any)?.id ?? l.target) === node.id ||
              ((l.target as any)?.id ?? l.target) === hoveredNode && ((l.source as any)?.id ?? l.source) === node.id
          );
          return isLinked ? node.color : 'rgba(255,255,255,0.04)';
        }
        return node.color;
      }}
      nodeLabel={showLabels ? (node: Graph3DNode) => `
        <div style="background:rgba(0,0,0,0.9);padding:8px 14px;border-radius:10px;border:1px solid ${node.color}40;max-width:280px;backdrop-filter:blur(8px);">
          <div style="color:${node.color};font-weight:600;font-size:13px;">${node.name}</div>
          <div style="color:#888;font-size:10px;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">${node.type}${node.score ? ` · ${node.score}` : ''}${node.method ? ` · ${node.method}` : ''}</div>
          ${node.description ? `<div style="color:#aaa;font-size:11px;margin-top:6px;line-height:1.4;">${node.description.slice(0, 120)}${node.description.length > 120 ? '...' : ''}</div>` : ''}
        </div>
      ` : undefined}
      nodeOpacity={0.92}
      // 엣지 — 곡선 (뇌 시냅스)
      linkCurvature={(link: any) => link.curvature ?? 0.2}
      linkCurveRotation={(link: any) => link.source?.id ? (link.source.id.charCodeAt(0) % 7) * 0.9 : 0}
      linkColor={(link: any) => {
        if (hoveredNode) {
          const src = (link.source as any)?.id ?? link.source;
          const tgt = (link.target as any)?.id ?? link.target;
          if (src !== hoveredNode && tgt !== hoveredNode) return 'rgba(255,255,255,0.02)';
        }
        const style = getEdgeStyle(link.type);
        return style?.color ?? '#333';
      }}
      linkWidth={(link: any) => {
        const style = getEdgeStyle(link.type);
        return style?.width ?? 0.8;
      }}
      linkDirectionalParticles={(link: any) => {
        const style = getEdgeStyle(link.type);
        return style?.particles ?? 0;
      }}
      linkDirectionalParticleSpeed={(link: any) => {
        const style = getEdgeStyle(link.type);
        return style?.particleSpeed ?? 0;
      }}
      linkDirectionalParticleWidth={1.5}
      linkDirectionalParticleColor={(link: any) => {
        const style = getEdgeStyle(link.type);
        return style?.color ?? '#666';
      }}
      linkOpacity={0.5}
      // 물리엔진
      d3AlphaDecay={PHYSICS_CONFIG.d3AlphaDecay}
      d3VelocityDecay={PHYSICS_CONFIG.d3VelocityDecay}
      warmupTicks={PHYSICS_CONFIG.warmupTicks}
      cooldownTime={PHYSICS_CONFIG.cooldownTime}
      // 인터랙션
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
      />
    </div>
  );
}
