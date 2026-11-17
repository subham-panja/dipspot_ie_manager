'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
export type DetailViewMode = 'right_drawer' | 'modal' | 'left_drawer';
export type SettingsTab = 'appearance' | 'smtp' | 'crawler' | 'pricing' | 'stages';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  toggleTheme: () => void;
  detailViewMode: DetailViewMode;
  setDetailViewMode: (mode: DetailViewMode) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  openSettings: (tab?: SettingsTab) => void;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  accentClasses: {
    name: AccentColor;
    bg: string;
    bgHover: string;
    text: string;
    border: string;
    badgeBg: string;
    badge: string;
    btn: string;
    gradient: string;
  };
}

const ACCENT_MAP: Record<AccentColor, ThemeContextType['accentClasses']> = {
  emerald: {
    name: 'emerald',
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-500',
    text: 'text-emerald-500',
    border: 'border-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold',
    gradient: 'from-emerald-600 to-teal-500',
  },
  blue: {
    name: 'blue',
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-500 text-white font-semibold',
    gradient: 'from-blue-600 to-cyan-500',
  },
  violet: {
    name: 'violet',
    bg: 'bg-violet-600',
    bgHover: 'hover:bg-violet-500',
    text: 'text-violet-500',
    border: 'border-violet-500',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    btn: 'bg-violet-600 hover:bg-violet-500 text-white font-semibold',
    gradient: 'from-violet-600 to-purple-500',
  },
  amber: {
    name: 'amber',
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-500',
    text: 'text-amber-500',
    border: 'border-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    btn: 'bg-amber-600 hover:bg-amber-500 text-white font-semibold',
    gradient: 'from-amber-600 to-orange-500',
  },
  rose: {
    name: 'rose',
    bg: 'bg-rose-600',
    bgHover: 'hover:bg-rose-500',
    text: 'text-rose-500',
    border: 'border-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    btn: 'bg-rose-600 hover:bg-rose-500 text-white font-semibold',
    gradient: 'from-rose-600 to-pink-500',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<AccentColor>('emerald');
  const [detailViewMode, setDetailViewModeState] = useState<DetailViewMode>('right_drawer');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('appearance');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('tradepulse_theme') as ThemeMode;
      const savedAccent = localStorage.getItem('tradepulse_accent') as AccentColor;
      const savedMode = localStorage.getItem('tradepulse_detail_mode') as DetailViewMode;
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
        setThemeState(savedTheme);
      }
      if (savedAccent && ACCENT_MAP[savedAccent]) {
        setAccentState(savedAccent);
      }
      if (savedMode && ['right_drawer', 'modal', 'left_drawer'].includes(savedMode)) {
        setDetailViewModeState(savedMode);
      }
    } catch {
      // ignore
    }
  }, []);

  const openSettings = (tab: SettingsTab = 'appearance') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem('tradepulse_theme', mode);
    } catch {}
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    try {
      localStorage.setItem('tradepulse_accent', newAccent);
    } catch {}
  };

  const setDetailViewMode = (mode: DetailViewMode) => {
    setDetailViewModeState(mode);
    try {
      localStorage.setItem('tradepulse_detail_mode', mode);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const accentClasses = ACCENT_MAP[accent] || ACCENT_MAP.emerald;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        accent,
        setAccent,
        toggleTheme,
        detailViewMode,
        setDetailViewMode,
        isSettingsOpen,
        setIsSettingsOpen,
        openSettings,
        settingsTab,
        setSettingsTab,
        accentClasses,
      }}
    >
      <div className={theme === 'light' ? 'theme-light' : 'theme-dark'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
