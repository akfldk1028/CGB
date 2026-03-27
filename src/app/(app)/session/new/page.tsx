'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FOUR_IS_DESCRIPTIONS } from '@/config/creativity';
import type { FourIsPhase } from '@/types/creativity';
import type { CreativeSession } from '@/types/session';
import type { SessionMode } from '@/types/session';

interface HealthStatus {
  llm: boolean;
  search: boolean;
  graph: 'memgraph' | 'file' | 'memory';
  model: string;
  ready: boolean;
}

export default function NewSessionPage() {
  const [topic, setTopic] = useState('');
  const [domain, setDomain] = useState('');
  const [mode, setMode] = useState<SessionMode>('light');
  const [loading, setLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<FourIsPhase | null>(null);
  const [result, setResult] = useState<CreativeSession | null>(null);
  const [graphPersistence, setGraphPersistence] = useState<{ nodesCreated: number; edgesCreated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);

    // Upload immediately
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vision/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setImageUrl(data.data.url);
    } catch { /* upload failed — will proceed without image */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic || !domain) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setGraphPersistence(null);
    setCurrentPhase('immersion');

    try {
      // 이미지가 있으면 먼저 분석
      if (imageUrl) {
        await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, context: `${topic} ${domain}` }),
        });
      }

      const res = await fetch('/api/creative/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, domain, mode, imageUrl }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setResult(data.data.session ?? data.data);
      setGraphPersistence(data.data.graphPersistence ?? null);
      setCurrentPhase(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">New Creative Session</h1>
      <p className="text-white/50 mb-8">Run the full 4I&apos;s pipeline to generate, evaluate, and iterate ideas</p>

      {/* Health Status */}
      {health && !health.ready && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm space-y-1">
          <div className="font-semibold text-amber-400">Setup Required</div>
          {!health.llm && <div className="text-white/60">Missing: <code className="text-amber-300">GOOGLE_GENERATIVE_AI_API_KEY</code> in .env.local</div>}
          {!health.search && <div className="text-white/40">Optional: <code className="text-white/50">GOOGLE_SEARCH_API_KEY</code> for web search</div>}
          <div className="text-white/40">Graph: {health.graph} | Model: {health.model}</div>
        </div>
      )}

      {health?.ready && (
        <div className="mb-6 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Ready — {health.model} | Graph: {health.graph}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 mb-10">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., AI-powered personal finance assistant"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-amber-500/50 focus:outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g., Fintech, Healthcare, Education"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-amber-500/50 focus:outline-none transition"
          />
        </div>

        {/* Image Upload (optional) */}
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Visual Inspiration (optional)</label>
          <div className="relative">
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); setImageUrl(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white/70 hover:text-white text-xs flex items-center justify-center"
                >x</button>
                {imageUrl && <div className="absolute bottom-2 left-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Uploaded</div>}
                {imageFile && !imageUrl && <div className="absolute bottom-2 left-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded animate-pulse">Uploading...</div>}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-white/15 bg-white/3 cursor-pointer hover:border-white/25 transition">
                <span className="text-white/30 text-sm">Drop image or click to upload</span>
                <span className="text-white/20 text-[10px] mt-1">VLM will extract concepts and create graph nodes</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div>
          <label className="block text-sm text-white/60 mb-2">Pipeline Mode</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode('light')}
              className={`flex-1 p-3 rounded-xl border text-sm transition ${
                mode === 'light'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}
            >
              <div className="font-semibold mb-1">Light</div>
              <div className="text-[10px] opacity-70">TypeScript engine, fast (~30s)</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('heavy')}
              className={`flex-1 p-3 rounded-xl border text-sm transition ${
                mode === 'heavy'
                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-400'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}
            >
              <div className="font-semibold mb-1">Heavy</div>
              <div className="text-[10px] opacity-70">5 AI agents + 11 tools (~2min)</div>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !topic || !domain}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-40 transition"
        >
          {loading ? `Running ${mode} pipeline...` : `Start 4I's Pipeline (${mode})`}
        </button>
      </form>

      {/* 4I's 진행 상태 */}
      {loading && (
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-white/60 mb-4">Pipeline Progress</h3>
          <div className="flex gap-3">
            {(Object.entries(FOUR_IS_DESCRIPTIONS) as [FourIsPhase, typeof FOUR_IS_DESCRIPTIONS.immersion][]).map(([key, phase]) => (
              <div
                key={key}
                className={`flex-1 p-3 rounded-lg text-center text-xs ${
                  currentPhase === key
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : 'bg-white/5 text-white/30'
                }`}
              >
                <div className="text-lg mb-1">{phase.icon}</div>
                {phase.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="glass rounded-xl p-5 border-red-500/30 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Session Complete</h3>
              <span className="text-xs text-white/40 font-mono">{result.duration ? `${(result.duration / 1000).toFixed(1)}s` : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-white/50">Mode</div>
              <div className="text-white/70 font-mono">{result.mode}</div>
              <div className="text-white/50">Total ideas generated</div>
              <div className="text-amber-400 font-semibold">{result.totalGenerated}</div>
              <div className="text-white/50">Final curated ideas</div>
              <div className="text-purple-400 font-semibold">{result.finalIdeas.length}</div>
              {graphPersistence && (
                <>
                  <div className="text-white/50">Saved to Graph</div>
                  <div className="text-emerald-400 font-semibold">
                    {graphPersistence.nodesCreated} nodes, {graphPersistence.edgesCreated} edges
                  </div>
                </>
              )}
            </div>
            {graphPersistence && (
              <Link
                href="/graph?mode=live"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-sm text-white/60 hover:text-white/90 hover:bg-white/10 transition"
              >
                View in 3D Graph &rarr;
              </Link>
            )}
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-4">Final Ideas</h3>
            <div className="space-y-3">
              {result.finalIdeas.map((idea, i) => (
                <div key={idea.id} className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{idea.title}</h4>
                    {idea.scores && (
                      <span className="text-xs font-mono text-amber-400">{idea.scores.overall}/100</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1">{idea.description}</p>
                  {idea.method && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                      {idea.method}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
