'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Compass,
  Globe2,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { SIDEBAR_NAV_GROUPS } from './sidebar/sidebarNavConfig';
import SidebarNavGroup from './sidebar/SidebarNavGroup';
import SidebarFooter from './sidebar/SidebarFooter';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    leads: pathname.startsWith('/leads'),
    campaigns: pathname.startsWith('/campaigns'),
    cargo: pathname.startsWith('/cargo') || pathname.startsWith('/shipments'),
    intelligence: pathname.startsWith('/intelligence'),
    operations: pathname.startsWith('/operations'),
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const topLinkClass = (active: boolean) =>
    `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
      active
        ? isLight
          ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm`
          : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
        : isLight
        ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
    }`;

  return (
    <aside
      className={`w-64 h-screen flex flex-col border-r transition-colors duration-200 flex-shrink-0 z-30 select-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
          : 'bg-[#0f172a] border-slate-800/80 text-slate-200 shadow-xl'
      }`}
    >
      <div
        className={`shrink-0 p-4 border-b flex items-center space-x-3 ${
          isLight ? 'border-slate-100' : 'border-slate-800'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${accentClasses.gradient} flex items-center justify-center text-white shadow-md shadow-emerald-500/20`}
        >
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h1
            className={`text-sm font-bold tracking-tight flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            TradePulse{' '}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${accentClasses.badgeBg}`}
            >
              EXIM
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">Global Trade Operating System</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto min-h-0 text-xs">
        <Link href="/" className={topLinkClass(pathname === '/')}>
          <span className="flex items-center space-x-2.5">
            <LayoutDashboard
              className={`w-4 h-4 shrink-0 ${pathname === '/' ? accentClasses.text : 'text-slate-400'}`}
            />
            <span>Dashboard</span>
          </span>
        </Link>

        <Link href="/pipeline" className={topLinkClass(pathname === '/pipeline')}>
          <span className="flex items-center space-x-2.5">
            <Kanban
              className={`w-4 h-4 shrink-0 ${
                pathname === '/pipeline' ? accentClasses.text : 'text-slate-400'
              }`}
            />
            <span>Pipeline</span>
          </span>
        </Link>

        <Link
          href="/campaigns/inbox"
          className={topLinkClass(pathname.startsWith('/campaigns/inbox'))}
        >
          <span className="flex items-center space-x-2.5">
            <MessageSquare
              className={`w-4 h-4 shrink-0 ${
                pathname.startsWith('/campaigns/inbox') ? accentClasses.text : 'text-purple-400'
              }`}
            />
            <span>Omnichannel Inbox</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">
            Live Chat
          </span>
        </Link>

        {SIDEBAR_NAV_GROUPS.slice(0, 1).map((group) => (
          <SidebarNavGroup
            key={group.id}
            group={group}
            isOpen={Boolean(openGroups[group.id])}
            onToggle={() => toggleGroup(group.id)}
            pathname={pathname}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        ))}

        <Link href="/crawler" className={topLinkClass(pathname.startsWith('/crawler'))}>
          <span className="flex items-center space-x-2.5">
            <Compass
              className={`w-4 h-4 shrink-0 ${
                pathname.startsWith('/crawler') ? accentClasses.text : 'text-slate-400'
              }`}
            />
            <span>Crawler & Lead Gen</span>
          </span>
        </Link>

        {SIDEBAR_NAV_GROUPS.slice(1).map((group) => (
          <SidebarNavGroup
            key={group.id}
            group={group}
            isOpen={Boolean(openGroups[group.id])}
            onToggle={() => toggleGroup(group.id)}
            pathname={pathname}
            isLight={isLight}
            accentClasses={accentClasses}
          />
        ))}
      </nav>

      <SidebarFooter pathname={pathname} isLight={isLight} accentClasses={accentClasses} />
    </aside>
  );
}
