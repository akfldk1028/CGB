'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { generateMockGraph, SEED_ITERATION_CHAIN } from '@/lib/mock-graph';
import { FOUR_IS_DESCRIPTIONS, SCAMPER_DESCRIPTIONS } from '@/config/creativity';
import type { Graph3DData } from '@/types/graph';

const ForceGraph3D = dynamic(() => import('@/components/graph/ForceGraph3D'), { ssr: false });

const THEORIES = [
  { name: 'Guilford SI Model', icon: '🧠', desc: 'Divergent thinking generates many ideas, convergent thinking selects the best', color: 'from-blue-500 to-cyan-500' },
  { name: 'Amabile\'s 3 Components', icon: '🔬', desc: 'Domain knowledge + Creative thinking skills + Intrinsic motivation', color: 'from-emerald-500 to-teal-500' },
  { name: 'Csikszentmihalyi Systems', icon: '🌐', desc: 'Individual × Domain × Field — creativity as a systemic process', color: 'from-violet-500 to-purple-500' },
  { name: 'Geneplore Model', icon: '⚗️', desc: 'Generate raw ideas → Explore and refine into viable solutions', color: 'from-amber-500 to-orange-500' },
  { name: 'SCAMPER Techniques', icon: '🔧', desc: '7 structured transformations: Substitute, Combine, Adapt, Modify, Put, Eliminate, Rearrange', color: 'from-rose-500 to-pink-500' },
];

export default function LandingPage() {
  const [graphData, setGraphData] = useState<Graph3DData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setGraphData(generateMockGraph(80, 120));
    setDimensions({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 실시간 노드 추가 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setGraphData((prev) => {
        if (prev.nodes.length > 120) return prev;
        const newId = `live-${Date.now()}`;
        const randomParent = prev.nodes[Math.floor(Math.random() * prev.nodes.length)];
        return {
          nodes: [...prev.nodes, {
            id: newId,
            name: `New Idea ${prev.nodes.length + 1}`,
            type: 'Idea' as const,
            val: 6 + Math.random() * 4,
            color: '#FFD700',
            score: Math.floor(50 + Math.random() * 50),
          }],
          links: [...prev.links, {
            source: newId,
            target: randomParent?.id ?? prev.nodes[0]?.id,
            type: 'INSPIRED_BY' as const,
            color: '#4FC3F7',
            width: 1.5,
            particles: 3,
            particleSpeed: 0.004,
          }],
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main>
      {/* Hero: 풀스크린 3D 그래프 */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0">
          {dimensions.width > 0 && (
            <ForceGraph3D data={graphData} width={dimensions.width} height={dimensions.height} />
          )}
        </div>

        {/* 중앙 텍스트 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="glass rounded-2xl px-12 py-10 text-center max-w-2xl">
            <h1 className="text-5xl font-bold neon-text mb-4">
              CreativeGraph AI
            </h1>
            <p className="text-lg text-white/70 mb-6">
              5 Academic Creativity Theories, coded into AI Agent Teams.
              <br />
              Every idea connects, evolves, and compounds — forever.
            </p>
            <div className="pointer-events-auto flex gap-4 justify-center">
              <a
                href="/session/new"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-purple-500 text-white font-semibold hover:opacity-90 transition"
              >
                Start Creative Session
              </a>
              <a
                href="/graph"
                className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
              >
                Explore Graph
              </a>
            </div>
          </div>
        </div>

        {/* 하단 스크롤 힌트 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-sm animate-bounce">
          Scroll to explore
        </div>
      </section>

      {/* 4I's 워크플로우 */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">The 4I&apos;s Creative Workflow</h2>
        <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">
          Every creative session follows the scientifically-proven 4I&apos;s pipeline
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(FOUR_IS_DESCRIPTIONS).map(([key, phase], i) => (
            <div key={key} className="relative">
              <div className="glass rounded-xl p-6 h-full hover:border-white/20 transition">
                <div className="text-3xl mb-3">{phase.icon}</div>
                <div className="text-xs text-white/40 font-mono mb-1">PHASE {i + 1}</div>
                <h3 className="text-lg font-semibold mb-2">{phase.name}</h3>
                <p className="text-sm text-white/50">{phase.description}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 text-white/20 text-xl">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5가지 창의성 이론 */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Powered by 5 Creativity Theories</h2>
        <p className="text-white/50 text-center mb-16 max-w-xl mx-auto">
          Not just &quot;be creative&quot; prompts — each theory is computationally implemented
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {THEORIES.map((theory) => (
            <div key={theory.name} className="glass rounded-xl p-6 hover:border-white/20 transition group">
              <div className="text-3xl mb-3">{theory.icon}</div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-amber-400 transition">{theory.name}</h3>
              <p className="text-sm text-white/50">{theory.desc}</p>
            </div>
          ))}
          {/* SCAMPER 7기법 확장 카드 */}
          <div className="glass rounded-xl p-6 md:col-span-2 hover:border-white/20 transition">
            <h3 className="text-lg font-semibold mb-4">SCAMPER — 7 Creative Transformations</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SCAMPER_DESCRIPTIONS).map(([key, s]) => (
                <div key={key} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 font-bold mt-0.5">{s.name.charAt(0)}</span>
                  <div>
                    <span className="text-white/80">{s.name}</span>
                    <span className="text-white/40 block text-xs">{s.question}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Graph grows forever */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Your Ideas Compound Forever</h2>
        <p className="text-white/50 mb-8 max-w-xl mx-auto">
          Every idea becomes a node. Every connection becomes an edge.
          The more you use it, the more creative it gets — because your Graph DB remembers everything.
        </p>
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold neon-text">∞</div>
            <div className="text-sm text-white/40 mt-2">Ideas stored</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-400">6</div>
            <div className="text-sm text-white/40 mt-2">AI Agent roles</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-cyan-400">7</div>
            <div className="text-sm text-white/40 mt-2">SCAMPER techniques</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-white/30 text-sm">
          <span>CreativeGraph AI</span>
          <span>Built with creativity science + AI agent swarms</span>
        </div>
      </footer>
    </main>
  );
}
