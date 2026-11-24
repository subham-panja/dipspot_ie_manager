'use client';

import React from 'react';
import { Megaphone, Kanban } from 'lucide-react';
import { CustomerLead } from './dossierTypes';

interface DossierActionBarProps {
  lead: CustomerLead;
  onEnroll?: (customer: CustomerLead) => void;
  onConvertToDeal?: (customer: CustomerLead) => void;
  onConvert?: (customer?: any) => void;
  accentBgClass: string;
}

export default function DossierActionBar({
  lead,
  onEnroll,
  onConvertToDeal,
  onConvert,
  accentBgClass,
}: DossierActionBarProps) {
  return (
    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2.5">
      {onEnroll && (
        <button
          type="button"
          onClick={() => onEnroll(lead)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <Megaphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Enroll Campaign</span>
        </button>
      )}

      {(onConvertToDeal || onConvert) && (
        <button
          type="button"
          onClick={() => {
            if (onConvertToDeal) onConvertToDeal(lead);
            else if (onConvert) onConvert(lead);
          }}
          className={`text-xs font-semibold px-4 py-2 rounded-xl text-white ${accentBgClass} shadow-md transition flex items-center gap-1.5`}
        >
          <Kanban className="w-3.5 h-3.5" />
          <span>Move to Pipeline</span>
        </button>
      )}
    </div>
  );
}
