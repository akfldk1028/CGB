import Link from 'next/link';
import { navItems } from '@/config/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 p-4 flex flex-col gap-1 shrink-0">
        <Link href="/" className="flex items-center gap-2 mb-6 px-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center text-xs font-bold">
            CG
          </div>
          <span className="font-semibold text-sm text-white/80">CreativeGraph</span>
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition"
          >
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
