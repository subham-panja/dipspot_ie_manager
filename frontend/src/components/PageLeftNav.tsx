'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export interface PageSubNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  desc?: string;
}

interface PageLeftNavProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  headerAction?: React.ReactNode;
  items: PageSubNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  children?: React.ReactNode;
}

export default function PageLeftNav({
  title,
  subtitle,
  badge,
  headerAction,
  items,
  activeId,
  onSelect,
  children,
}: PageLeftNavProps) {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="flex flex-col md:flex-row items-start gap-6 w-full">
      {/* Left Vertical Sub-Navigation Panel */}
      <aside
        className={`w-full md:w-60 shrink-0 rounded-2xl border p-3 space-y-1.5 transition ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        {(title || headerAction) && (
          <div className="px-3 py-2 border-b border-slate-800/40 mb-1 flex items-center justify-between">
            <div>
              {title && (
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {title}
                </h3>
              )}
              {(subtitle || badge) && (
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle || badge}</p>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}

        <div className="space-y-1">
          {items.map((item) => {
            const isActive = item.active !== undefined ? item.active : item.id === activeId;

            const content = (
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? isLight
                      ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm`
                      : `bg-slate-800/90 text-white font-bold border-l-2 ${accentClasses.border}`
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.icon && <span className={isActive ? accentClasses.text : 'text-slate-400'}>{item.icon}</span>}
                  <div className="truncate">
                    <span className="truncate block">{item.label}</span>
                    {item.desc && <span className="text-[10px] text-slate-500 font-normal block truncate">{item.desc}</span>}
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-bold ${
                      isActive
                        ? isLight
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-slate-700 text-white'
                        : isLight
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="block">
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  if (onSelect) onSelect(item.id);
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 w-full space-y-5">
        {children}
      </div>
    </div>
  );
}
