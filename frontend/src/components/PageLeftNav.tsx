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
    <div className="flex flex-col gap-5 w-full min-w-0">
      {/* Sleek Horizontal Sub-Navigation Header Bar (Replaces duplicate in-page sidebar) */}
      <div
        className={`w-full rounded-2xl border p-3 transition ${
          isLight
            ? 'bg-white border-slate-200 shadow-sm'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Section Branding / Title */}
          {(title || subtitle || badge) && (
            <div className="flex items-center gap-2.5 shrink-0">
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
            </div>
          )}

          {/* Horizontal Navigation Pills */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-wrap">
            {items.map((item) => {
              const isActive = item.active !== undefined ? item.active : item.id === activeId;

              const content = (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                    isActive
                      ? isLight
                        ? `bg-slate-100 ${accentClasses.text} font-bold shadow-sm border border-slate-200`
                        : `bg-slate-800 text-white font-bold border ${accentClasses.border}`
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  {item.icon && <span className={isActive ? accentClasses.text : 'text-slate-400'}>{item.icon}</span>}
                  <span className="truncate">{item.label}</span>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-1 ${
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
                  <Link key={item.id} href={item.href} className="block shrink-0">
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={item.id}
                  className="shrink-0"
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    if (onSelect) onSelect(item.id);
                  }}
                >
                  {content}
                </div>
              );
            })}
          </nav>

          {/* Right-aligned Header Action Button */}
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>

      {/* Main Full-Width Content Pane */}
      <div className="w-full min-w-0 space-y-5">
        {children}
      </div>
    </div>
  );
}
