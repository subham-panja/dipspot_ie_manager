'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LeadsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const leadType = searchParams?.get('lead_type')?.toLowerCase();
    const queryStr = searchParams?.toString();
    const targetPath = (leadType === 'supplier' || leadType === 'suppliers' || leadType === 'wb_mill')
      ? '/leads/suppliers'
      : '/leads/importers';
    const destination = queryStr ? `${targetPath}?${queryStr}` : targetPath;
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-xs text-slate-400">
      Routing to Trade Leads Desk...
    </div>
  );
}

export default function LeadsIndexRedirect() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-xs text-slate-400">
          Loading Trade Leads...
        </div>
      }
    >
      <LeadsRedirectInner />
    </Suspense>
  );
}
