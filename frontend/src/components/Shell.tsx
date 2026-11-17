'use client';

import React from 'react';
import Sidebar from './Sidebar';
import GlobalSettingsModal from './GlobalSettingsModal';
import { useTheme } from '@/context/ThemeContext';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { theme, isSettingsOpen, setIsSettingsOpen } = useTheme();

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#090d16] text-slate-100'
    }`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Universal Global Settings Modal available on every page */}
      <GlobalSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
