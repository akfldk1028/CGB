'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { Graph3DData, Graph3DNode } from '@/types/graph';

const ForceGraph3D = dynamic(() => import('@/components/graph/ForceGraph3D'), { ssr: false });

// ═══════════════════════════════════════
// View System — 5가지 뷰 탭
// ═══════════════════════════════════════

type ViewTab = 'collective' | 'my' | 'domain' | 'agent' | 'visual';
type DataMode = 'live' | 'mock' | 'seed';

const VIEW_TABS: { key: ViewTab; label: string; desc: string }[] = [
  { key: 'collective', label: 'Collective', desc: 'All ideas from everyone' },
  { key: 'my',         label: 'My Brain',   desc: 'Your personal ideas' },
  { key: 'domain',     label: 'Domain',     desc: 'Filter by domain' },
  { key: 'agent',      label: 'Agent',      desc: 'Filter by creator agent' },
  { key: 'visual',     label: 'Visual',     desc: 'Image-inspired nodes' },
];

// Agent → method 매핑 (에이전트가 사용하는 method 기반 역추적)
const AGENT_METHODS: Record<string, string[]> = {
  'Researcher':        ['scene_graph_extract'],
  'Divergent Thinker': ['divergent', 'visual_inspiration'],
  'Evaluator':         [], // 평가만 수행, 노드 생성 안 함
  'Iterator':          ['iteration:semantic', 'rearrange', 'eliminate', 'put_to_other_use', 'modify', 'adapt', 'combine', 'substitute'],
  'Pipeline (Light)':  ['divergent', 'iteration:semantic', 'rearrange', 'eliminate', 'put_to_other_use', 'modify', 'adapt', 'combine', 'substitute'],
};

/** link의 source/target에서 ID 추출 (문자열 또는 객체) */
function linkId(val: string | { id: string }): string {
  return typeof val === 'string' ? val : val?.id ?? '';
}

const POLL_INTERVAL = 5000;

export default function GraphPage() {
  const [rawData, setRawData] = useState<Graph3DData>({ nodes: [], links: [] });
  const [selected, setSelected] = useState<Graph3DNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dataMode, setDataMode] = useState<DataMode>('live');
  const [viewTab, setViewTab] = useState<ViewTab>('collective');
  const [meta, setMeta] = useState<{ source?: string; stats?: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const prevNodeCount = useRef(0);

  // 필터 상태
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // ── 데이터 로드 ──
  const loadGraph = useCallback(async (mode: DataMode, isPolling = false) => {
    if (!isPolling) {
      setLoading(true);
      setSelected(null);
    }
    try {
      const scope = viewTab === 'my' ? 'my' : 'collective';
      const params = new URLSearchParams({ mode, maxNodes: '500', scope });
      const res = await fetch(`/api/v1/graph/visualize?${params}`);
      const json = await res.json();
      if (json.success) {
        const newNodes = json.data.nodes ?? [];
        const newLinks = json.data.links ?? [];

        if (isPolling && newNodes.length === prevNodeCount.current) return;
        if (isPolling && newNodes.length > prevNodeCount.current) {
          setLiveCount((c) => c + (newNodes.length - prevNodeCount.current));
        }
        prevNodeCount.current = newNodes.length;

        setRawData({ nodes: newNodes, links: newLinks });
        setMeta(json.data._meta ?? null);
      }
    } catch { /* polling error ignored */ }
    finally { if (!isPolling) setLoading(false); }
  }, [viewTab]);

  // ── 클라이언트 필터링 ──
  const filteredData = useMemo((): Graph3DData => {
    let nodes = rawData.nodes;

    // 뷰 탭 기반 필터
    if (viewTab === 'visual') {
      nodes = nodes.filter((n) => n.imageUrl);
    }
    if (viewTab === 'domain' && filterDomain) {
      // Domain 노드 + 2-hop 이내 연결된 모든 노드
      const domainNodeIds = new Set(
        nodes.filter((n) => n.type === 'Domain' && n.name === filterDomain).map((n) => n.id)
      );
      // BFS 2-hop
      const reachable = new Set(domainNodeIds);
      for (let hop = 0; hop < 2; hop++) {
        const frontier = new Set(reachable);
        rawData.links.forEach((l) => {
          const src = linkId(l.source as any);
          const tgt = linkId(l.target as any);
          if (frontier.has(src)) reachable.add(tgt);
          if (frontier.has(tgt)) reachable.add(src);
        });
      }
      nodes = nodes.filter((n) => reachable.has(n.id));
    }
    if (viewTab === 'agent' && filterAgent) {
      const methods = AGENT_METHODS[filterAgent] ?? [];
      // Evaluator 등 method가 없는 에이전트: 해당 에이전트는 노드 생성 안 함 → 빈 결과
      nodes = methods.length > 0
        ? nodes.filter((n) => n.method && methods.includes(n.method))
        : [];
    }

    // 타입 필터 (모든 뷰에서 작동)
    if (filterType) {
      nodes = nodes.filter((n) => n.type === filterType);
    }

    // 필터된 노드에 연결된 엣지만
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = rawData.links.filter((l) =>
      nodeIds.has(linkId(l.source as any)) && nodeIds.has(linkId(l.target as any))
    );

    return { nodes, links };
  }, [rawData, viewTab, filterDomain, filterAgent, filterType]);

  // ── 동적 필터 옵션 계산 ──
  const availableDomains = useMemo(() => {
    const domains = rawData.nodes.filter((n) => n.type === 'Domain').map((n) => n.name);
    return [...new Set(domains)];
  }, [rawData]);

  const availableTypes = useMemo(() => {
    const types = rawData.nodes.map((n) => n.type);
    return [...new Set(types)].sort();
  }, [rawData]);

  // ── Effects ──
  useEffect(() => {
    loadGraph(dataMode);
    const updateSize = () => setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [dataMode, viewTab, loadGraph]);

  useEffect(() => {
    if (dataMode !== 'live') return;
    const timer = setInterval(() => loadGraph('live', true), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [dataMode, loadGraph]);

  // 탭 변경 시 필터 리셋
  useEffect(() => {
    setFilterDomain(null);
    setFilterAgent(null);
    setFilterType(null);
    setSelected(null);
  }, [viewTab]);

  // ── 렌더링 ──
  return (
    <div className="relative h-screen">
      {/* 3D Graph */}
      {dimensions.width > 0 && !loading && (
        <ForceGraph3D
          data={filteredData}
          width={dimensions.width}
          height={dimensions.height}
          onNodeClick={(node) => setSelected(node)}
        />
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm animate-pulse">Loading neural graph...</div>
        </div>
      )}

      {/* ── Left Panel: Navigation ── */}
      <div className="absolute top-4 left-4 w-52 space-y-2">
        {/* View Tabs */}
        <div className="glass rounded-xl px-3 py-3">
          <div className="text-white/30 text-[9px] font-mono mb-2 tracking-wider">VIEW</div>
          <div className="space-y-1">
            {VIEW_TABS.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setViewTab(key)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition ${
                  viewTab === key
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
                title={desc}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filters */}
        {viewTab === 'domain' && availableDomains.length > 0 && (
          <div className="glass rounded-xl px-3 py-3">
            <div className="text-white/30 text-[9px] font-mono mb-2 tracking-wider">DOMAIN</div>
            <div className="space-y-1">
              <button
                onClick={() => setFilterDomain(null)}
                className={`w-full text-left px-2 py-1 rounded text-[10px] transition ${
                  !filterDomain ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-white/60'
                }`}
              >
                All domains
              </button>
              {availableDomains.map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDomain(d)}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] transition truncate ${
                    filterDomain === d ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewTab === 'agent' && (
          <div className="glass rounded-xl px-3 py-3">
            <div className="text-white/30 text-[9px] font-mono mb-2 tracking-wider">AGENT</div>
            <div className="space-y-1">
              <button
                onClick={() => setFilterAgent(null)}
                className={`w-full text-left px-2 py-1 rounded text-[10px] transition ${
                  !filterAgent ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-white/60'
                }`}
              >
                All agents
              </button>
              {Object.keys(AGENT_METHODS).map((agent) => (
                <button
                  key={agent}
                  onClick={() => setFilterAgent(agent)}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] transition ${
                    filterAgent === agent ? 'text-amber-400 bg-amber-500/10' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {agent}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Type Filter (global) */}
        {availableTypes.length > 1 && (
          <div className="glass rounded-xl px-3 py-3">
            <div className="text-white/30 text-[9px] font-mono mb-2 tracking-wider">TYPE</div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterType(null)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono transition ${
                  !filterType ? 'text-white bg-white/15' : 'text-white/30 hover:text-white/60'
                }`}
              >
                All
              </button>
              {availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono transition ${
                    filterType === t ? 'text-white bg-white/15' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="glass rounded-xl px-3 py-2.5">
          <div className="flex gap-3 text-[11px]">
            <span><span className="text-amber-400 font-semibold">{filteredData.nodes.length}</span> <span className="text-white/30">nodes</span></span>
            <span><span className="text-purple-400 font-semibold">{filteredData.links.length}</span> <span className="text-white/30">edges</span></span>
          </div>
          {filteredData.nodes.length < rawData.nodes.length && (
            <div className="text-[9px] text-white/20 mt-1">
              {rawData.nodes.length} total, {rawData.nodes.length - filteredData.nodes.length} filtered out
            </div>
          )}
          {meta?.source && (
            <div className="text-[9px] text-white/20 mt-0.5">Source: {meta.source}</div>
          )}
          {dataMode === 'live' && liveCount > 0 && (
            <div className="text-[9px] text-emerald-400 mt-0.5 animate-pulse">+{liveCount} new</div>
          )}
        </div>

        {/* Data Mode */}
        <div className="glass rounded-xl px-3 py-2">
          <div className="flex gap-1">
            {(['live', 'mock', 'seed'] as DataMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setDataMode(m); setLiveCount(0); }}
                className={`px-2 py-0.5 rounded text-[9px] font-mono transition ${
                  dataMode === m
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Node Detail ── */}
      {selected && (
        <div className="absolute top-4 right-4 w-80 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm" style={{ color: selected.color }}>{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-sm">x</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/50">
              <span>Type</span>
              <span className="font-mono text-white/70">{selected.type}</span>
            </div>
            {selected.score !== undefined && (
              <div className="flex justify-between text-white/50">
                <span>Score</span>
                <span className="font-mono text-amber-400">{selected.score}/100</span>
              </div>
            )}
            {selected.method && (
              <div className="flex justify-between text-white/50">
                <span>Method</span>
                <span className="font-mono text-white/70">{selected.method}</span>
              </div>
            )}
            {selected.description && (
              <p className="text-white/40 text-xs mt-3 border-t border-white/5 pt-3">
                {selected.description}
              </p>
            )}
            {selected.imageUrl && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <img
                  src={selected.imageUrl}
                  alt={selected.name}
                  className="w-full rounded-lg object-cover max-h-48"
                  loading="lazy"
                />
                <div className="text-[10px] text-white/30 mt-1">Visual inspiration source</div>
              </div>
            )}
          </div>

          <button
            onClick={async () => {
              const res = await fetch(`/api/v1/graph/search?nodeId=${selected.id}&hops=2`);
              const json = await res.json();
              if (json.success && json.data.nodes?.length > 0) {
                const neighborNodes = json.data.nodes.map((n: Record<string, unknown>) => ({
                  id: n.id,
                  name: n.title ?? n.id,
                  type: n.type ?? 'Idea',
                  val: 6,
                  color: n.type === 'Idea' ? '#FFD700' : n.type === 'Concept' ? '#4FC3F7' : '#81C784',
                }));
                const neighborLinks = json.data.edges?.map((e: Record<string, unknown>) => ({
                  source: e.source,
                  target: e.target,
                  type: e.type,
                  color: '#666',
                  width: 1,
                })) ?? [];
                setRawData({ nodes: neighborNodes, links: neighborLinks });
                setMeta({ source: `neighborhood of "${selected.name}"` });
              }
            }}
            className="mt-4 w-full py-2 rounded-lg text-xs bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition"
          >
            Explore Neighbors (2 hops)
          </button>
        </div>
      )}
    </div>
  );
}
