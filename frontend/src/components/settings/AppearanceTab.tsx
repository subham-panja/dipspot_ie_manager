'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { COLOR_SWATCHES } from './settingsTypes';

interface AppearanceTabProps {
  isLight: boolean;
}

export default function AppearanceTab({ isLight }: AppearanceTabProps) {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div>
        <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Theme Customization & Workspace Styling
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Customize your system accent colors, dark/light ambient modes, and data grid density.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-3">Color Mode</label>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3 transition ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-slate-800/90 shadow-md'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
                🌙
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Dark Mode</span>
                <span className="text-[10px] text-slate-400">High contrast for trading rooms</span>
              </div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-center gap-3 transition ${
                theme === 'light'
                  ? 'border-emerald-500 bg-slate-100 shadow-md'
                  : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-900">
                ☀️
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Light Mode</span>
                <span className="text-[10px] text-slate-500">Clean paper-white documents</span>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-3">Accent Brand Color</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl">
            {COLOR_SWATCHES.map((swatch) => {
              const isSelected = accent === swatch.key;
              return (
                <button
                  key={swatch.key}
                  onClick={() => setAccent(swatch.key)}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
                    isSelected
                      ? 'border-white bg-slate-800/90 shadow-lg'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/40'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full ${swatch.bg} shadow-md`} />
                  <span className="text-xs font-semibold text-slate-200">{swatch.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
