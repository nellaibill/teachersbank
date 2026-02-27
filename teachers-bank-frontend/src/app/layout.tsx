'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import {
  Users, Package, Bell, BarChart2,
  GraduationCap, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',           icon: BarChart2,     label: 'Dashboard' },
  { href: '/teachers',   icon: Users,         label: 'Teachers' },
  { href: '/dispatch',   icon: Package,       label: 'Dispatch' },
  { href: '/followups',  icon: Bell,          label: 'Follow-ups' },
  { href: '/reports',    icon: BarChart2,     label: 'Reports' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Teachers Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

        {/* Mobile overlay */}
        {open && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
        )}

        <div className="flex min-h-screen">
          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className={cn(
            'fixed top-0 left-0 h-full z-50 flex flex-col w-[240px]',
            'bg-gradient-to-b from-ink-900 to-ink-950',
            'transition-transform duration-300',
            open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}>
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'Fraunces, serif' }}>
                  Teachers Bank
                </p>
                <p className="text-ink-400 text-[11px]">Management System</p>
              </div>
              <button className="ml-auto lg:hidden text-ink-400 hover:text-white" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(({ href, icon: Icon, label }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link key={href} href={href}
                    className={cn('nav-link', active && 'active')}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-ink-500 text-[11px]">v1.0 · PHP + MySQL</p>
            </div>
          </aside>

          {/* ── Main ───────────────────────────────────────────────────────── */}
          <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
            {/* Top bar (mobile) */}
            <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-ink-100 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setOpen(true)} className="text-ink-600">
                <Menu size={22} />
              </button>
              <span className="font-semibold text-ink-900" style={{ fontFamily: 'Fraunces, serif' }}>
                Teachers Bank
              </span>
            </header>

            <main className="flex-1 p-5 lg:p-7 animate-fade-in">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
