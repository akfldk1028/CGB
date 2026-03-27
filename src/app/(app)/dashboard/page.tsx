'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  byType: Record<string, number>;
  mode: 'memgraph' | 'in_memory';
  connection?: { connected: boolean; mode?: string };
}

interface SessionNode {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [sessions, setSessions] = useState<SessionNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, nodesRes] = await Promise.all([
          fetch('/api/graph/stats'),
          fetch('/api/graph/nodes?type=Session&limit=10'),
        ]);
        const statsData = await statsRes.json();
        const nodesData = await nodesRes.json();

        if (statsData.success) setStats(statsData.data);
        if (nodesData.success) setSessions(nodesData.data.nodes ?? []);
      } catch {
        // 에러 무시 — 빈 상태 유지
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const ideaCount = stats?.byType?.Idea ?? 0;
  const conceptCount = stats?.byType?.Concept ?? 0;
  const sessionCount = stats?.byType?.Session ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-white/50 mb-8">Creative analytics and session history</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Sessions"
          value={loading ? '...' : String(sessionCount)}
          color="text-amber-400"
        />
        <StatCard
          label="Ideas Generated"
          value={loading ? '...' : String(ideaCount)}
          color="text-purple-400"
        />
        <StatCard
          label="Concepts"
          value={loading ? '...' : String(conceptCount)}
          color="text-cyan-400"
        />
        <StatCard
          label="Graph Nodes"
          value={loading ? '...' : String(stats?.totalNodes ?? 0)}
          color="text-emerald-400"
          sub={`${stats?.totalEdges ?? 0} edges`}
        />
      </div>

      {/* Graph Mode Indicator */}
      {stats && (
        <div className="glass rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${
              stats.mode === 'memgraph' ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
            <span className="text-sm text-white/60">
              Graph Mode: <span className="text-white/90 font-mono">{stats.mode === 'memgraph' ? 'Memgraph (Persistent)' : 'In-Memory (Session)'}</span>
            </span>
          </div>
          {stats.byType && Object.keys(stats.byType).length > 0 && (
            <div className="flex gap-3 text-xs text-white/40">
              {Object.entries(stats.byType).map(([type, count]) => (
                <span key={type}>{type}: <span className="text-white/70">{count}</span></span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/session/new" className="glass rounded-xl p-5 hover:border-white/20 transition group">
          <div className="text-2xl mb-2">+</div>
          <div className="font-semibold group-hover:text-amber-400 transition">New Session</div>
          <div className="text-xs text-white/40 mt-1">Run the 4I&apos;s creative pipeline</div>
        </Link>
        <Link href="/graph" className="glass rounded-xl p-5 hover:border-white/20 transition group">
          <div className="text-2xl mb-2">3D</div>
          <div className="font-semibold group-hover:text-purple-400 transition">Explore Graph</div>
          <div className="text-xs text-white/40 mt-1">Visualize your idea network</div>
        </Link>
        <Link href="/pricing" className="glass rounded-xl p-5 hover:border-white/20 transition group">
          <div className="text-2xl mb-2">$</div>
          <div className="font-semibold group-hover:text-cyan-400 transition">Upgrade Plan</div>
          <div className="text-xs text-white/40 mt-1">Unlock heavy pipeline + API access</div>
        </Link>
      </div>

      {/* Recent Sessions */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        {loading ? (
          <div className="text-white/30 text-sm text-center py-8">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/20 text-sm mb-4">No sessions yet</div>
            <Link
              href="/session/new"
              className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition"
            >
              Start First Session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{session.title.replace('Session: ', '')}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {session.description}
                  </div>
                </div>
                <div className="text-xs text-white/30 font-mono">
                  {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="text-xs text-white/40 font-mono mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}
