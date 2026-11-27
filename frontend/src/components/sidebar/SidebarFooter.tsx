'use client';

import React from 'react';
import Link from 'next/link';
import { Settings, ExternalLink, MessageSquare } from 'lucide-react';
import { sanitizeHttpUrl } from '@/components/chatwootWidgetUtils';

interface SidebarFooterProps {
  pathname: string;
  isLight: boolean;
  accentClasses: {
    border: string;
  };
}

export default function SidebarFooter({ pathname, isLight, accentClasses }: SidebarFooterProps) {
  const chatwootConsoleUrl = sanitizeHttpUrl(process.env.NEXT_PUBLIC_CHATWOOT_URL);

  return (
    <div
      className={`shrink-0 mt-auto p-3.5 border-t space-y-2 ${
        isLight ? 'border-slate-100 bg-slate-50/70' : 'border-slate-800/90 bg-[#090d16]/95'
      }`}
    >
      {chatwootConsoleUrl ? (
        <a
          href={chatwootConsoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition font-medium ${
            isLight
              ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30'
          }`}
          title="Open Self-Hosted Chatwoot Console"
        >
          <span className="flex items-center space-x-2">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-[11px]">Chatwoot Console</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
        </a>
      ) : (
        <Link
          href="/settings?tab=chatwoot"
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition font-medium ${
            isLight
              ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30'
          }`}
          title="Configure Self-Hosted Chatwoot Omnichannel"
        >
          <span className="flex items-center space-x-2">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-[11px]">Chatwoot Gateway</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
            Setup
          </span>
        </Link>
      )}

      <Link
        href="/settings"
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition cursor-pointer font-medium ${
          pathname === '/settings'
            ? isLight
              ? `bg-slate-200 text-slate-900 font-bold shadow-sm border ${accentClasses.border}`
              : `bg-slate-800 text-white font-bold border ${accentClasses.border}`
            : isLight
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
        }`}
        title="Open Global Settings & Configuration Page"
      >
        <div className="flex items-center space-x-2.5">
          <Settings className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs">Settings & Config</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Connected" />
      </Link>

      <div className="px-2 pt-1 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>EXIM Engine</span>
        </span>
        <span>v3.3 Global</span>
      </div>
    </div>
  );
}
