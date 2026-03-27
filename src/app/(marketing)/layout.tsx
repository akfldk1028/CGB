import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center text-sm font-bold">
              CG
            </div>
            <span className="font-semibold text-white/90">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/graph" className="text-sm text-white/60 hover:text-white transition">Graph</Link>
            <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition">Pricing</Link>
            <Link
              href="/session/new"
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-purple-500 text-white font-medium hover:opacity-90 transition"
            >
              Start Session
            </Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
