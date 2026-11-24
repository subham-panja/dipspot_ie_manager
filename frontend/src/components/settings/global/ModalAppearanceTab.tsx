'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun, CheckCircle } from 'lucide-react';
import { COLOR_SWATCHES } from '../settingsTypes';

interface ModalAppearanceTabProps {
  isLight: boolean;
  accentClasses: { border: string; [key: string]: any };
}

export default function ModalAppearanceTab({
  isLight,
  accentClasses,
}: ModalAppearanceTabProps) {
  const { theme, setTheme, accent, setAccent, detailViewMode, setDetailViewMode } = useTheme();

  return (
    <div className="space-y-5">
      <div>
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Interface Mode
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Select your primary interface contrast preference.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mt-2.5">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
              theme === 'dark'
                ? `border-2 ${accentClasses.border} bg-slate-950 text-white shadow-md`
                : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-300">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Dark Mode</div>
              <div className="text-[10px] text-slate-400">High contrast slate</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
              theme === 'light'
                ? `border-2 ${accentClasses.border} bg-white text-slate-900 shadow-md`
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-amber-600">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Light Mode</div>
              <div className="text-[10px] text-slate-500">Crisp modern white</div>
            </div>
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/40">
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Brand Accent Highlight
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Applied to buttons, badges, navigation borders, and active tabs.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2.5">
          {COLOR_SWATCHES.map((swatch) => {
            const isSelected = accent === swatch.key;
            return (
              <button
                key={swatch.key}
                type="button"
                onClick={() => setAccent(swatch.key)}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                  isSelected
                    ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-100' : 'bg-slate-800/80 shadow-md'}`
                    : isLight
                    ? 'border-slate-200 bg-white hover:bg-slate-50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className={`w-6 h-6 rounded-full ${swatch.bg} shadow-md flex items-center justify-center text-white`}>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  {swatch.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/40">
        <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Customer Profile & Location Dossier Presentation
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Configure how the customer intelligence dossier (with Google Maps & contact intelligence) opens when clicking any company name.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2.5">
          <button
            type="button"
            onClick={() => setDetailViewMode('right_drawer')}
            className={`p-3.5 rounded-xl border text-left transition ${
              detailViewMode === 'right_drawer'
                ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                : isLight
                ? 'border-slate-200 bg-white'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-xs text-cyan-400">
              <span>Right Flyout Drawer</span>
              {detailViewMode === 'right_drawer' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20">Active</span>}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Slides out smoothly from the right edge. Keeps directory tables visible behind.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDetailViewMode('modal')}
            className={`p-3.5 rounded-xl border text-left transition ${
              detailViewMode === 'modal'
                ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                : isLight
                ? 'border-slate-200 bg-white'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-xs text-purple-400">
              <span>Centered Modal</span>
              {detailViewMode === 'modal' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20">Active</span>}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Centered focused popup with dark blurred background.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDetailViewMode('left_drawer')}
            className={`p-3.5 rounded-xl border text-left transition ${
              detailViewMode === 'left_drawer'
                ? `border-2 ${accentClasses.border} ${isLight ? 'bg-slate-50' : 'bg-slate-800/80 shadow-lg'}`
                : isLight
                ? 'border-slate-200 bg-white'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-xs text-amber-400">
              <span>Left Flyout Drawer</span>
              {detailViewMode === 'left_drawer' && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20">Active</span>}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Slides out from the left navigation boundary.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
