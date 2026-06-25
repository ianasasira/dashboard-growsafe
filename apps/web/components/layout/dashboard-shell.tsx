import Link from 'next/link';
import { Bell, Menu, Sprout } from 'lucide-react';
const nav = ['overview','products','batches','verification','fraud','heatmaps','analytics','supply-chain','retailers','complaints','recalls','reports','ai-insights','settings'];
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-slate-900 md:pl-60">
    <aside className="fixed inset-y-0 left-0 hidden w-60 bg-sidebar text-white md:block"><div className="flex h-16 items-center gap-2 px-5 text-lg font-semibold"><Sprout className="h-5 w-5 text-accent" />GrowSafe</div><div className="px-5 text-xs text-slate-400">Bukoola Chemicals</div><nav className="mt-6 grid gap-1 px-3">{nav.map((item) => <Link key={item} className="rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/10" href={'/' + item}>{item.replace('-', ' ')}</Link>)}</nav></aside>
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6"><div className="flex items-center gap-2"><Menu className="h-5 w-5 md:hidden" /><span className="text-sm font-medium">GrowSafe Dashboard</span></div><Link href="/notifications" aria-label="Notifications"><Bell className="h-5 w-5" /></Link></header>
    <main className="p-4 md:p-6">{children}</main>
  </div>;
}
