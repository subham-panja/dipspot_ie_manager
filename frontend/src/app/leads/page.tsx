'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadsIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leads/importers');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-xs text-slate-400">
      Loading Global Importers & Buyers...
    </div>
  );
}
