'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Megaphone,
  Ship,
  Radar,
  FileCheck2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { SidebarGroupConfig, SidebarIconKey } from './sidebarNavConfig';

interface SidebarNavGroupProps {
  group: SidebarGroupConfig;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  isLight: boolean;
  accentClasses: {
    text: string;
    border: string;
  };
}

function renderGroupIcon(icon: SidebarIconKey, isActive: boolean, activeTextClass: string) {
  const cls = `w-4 h-4 shrink-0 ${isActive ? activeTextClass : 'text-slate-400'}`;
  switch (icon) {
    case 'users':
      return <Users className={cls} />;
    case 'megaphone':
      return <Megaphone className={cls} />;
    case 'ship':
      return <Ship className={cls} />;
    case 'radar':
      return <Radar className={cls} />;
    case 'filecheck':
      return <FileCheck2 className={cls} />;
  }
}

export default function SidebarNavGroup({
  group,
  isOpen,
  onToggle,
  pathname,
  isLight,
  accentClasses,
}: SidebarNavGroupProps) {
  const isGroupActive = group.activePrefixes.some((prefix) => pathname.startsWith(prefix));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
          isGroupActive
            ? isLight
              ? `bg-slate-100 ${accentClasses.text} font-bold`
              : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
            : isLight
            ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          {renderGroupIcon(group.icon, isGroupActive, accentClasses.text)}
          <span>{group.label}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="pl-6 pt-1 space-y-0.5">
          {group.items.map((item) => {
            const isItemActive = item.matchPaths ? item.matchPaths.includes(pathname) : false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-1.5 rounded-lg text-[11px] transition ${
                  isItemActive
                    ? `${accentClasses.text} font-bold bg-slate-800/20`
                    : isLight
                    ? 'text-slate-500 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                &bull; {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
