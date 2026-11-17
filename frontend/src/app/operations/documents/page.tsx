'use client';

import React, { useState } from 'react';
import Shell from '@/components/Shell';
import PageLeftNav, { PageSubNavItem } from '@/components/PageLeftNav';
import { useTheme } from '@/context/ThemeContext';
import {
  FileText,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  Printer,
  Download,
  Building2,
  Calendar,
  Globe,
  Sparkles,
  FileCheck2,
  Scale
} from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantityMt: number;
  unitPriceUsd: number;
}

export default function ExportDocumentsPage() {
  const { theme, accentClasses } = useTheme();
  const isLight = theme === 'light';

  const [docType, setDocType] = useState<'PI' | 'CI' | 'PL'>('PI');
  const [docNumber, setDocNumber] = useState('PI-2026-DXB-0482');
  const [exporterName, setExporterName] = useState('TradePulse Commercial Export Ltd');
  const [exporterAddress, setExporterAddress] = useState('Suite 401, Port Gateway Towers, Kolkata, India');
  const [buyerName, setBuyerName] = useState('Al-Dhiyafa Foodstuff Trading LLC');
  const [buyerAddress, setBuyerAddress] = useState('Warehouse 14, Al Ras Wholesale Market, Deira, Dubai, UAE');
  const [originPort, setOriginPort] = useState('Syama Prasad Mookerjee Port, Kolkata (INCCU)');
  const [dischargePort, setDischargePort] = useState('Jebel Ali Port, Dubai (AEJEA)');
  const [incoterm, setIncoterm] = useState('CIF Jebel Ali Port');
  const [paymentTerms, setPaymentTerms] = useState('100% Irrevocable Letter of Credit (L/C) at Sight');
  
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: 'IR-64 Parboiled Rice 5% Broken (Sortex Cleaned, Export Grade)',
      quantityMt: 250,
      unitPriceUsd: 465,
    },
    {
      description: 'Custom 50kg Heavy-Duty Polypropylene (PP) Export Bags',
      quantityMt: 5000,
      unitPriceUsd: 0.65,
    },
  ]);

  const subtotal = items.reduce((sum, item) => sum + (item.quantityMt * item.unitPriceUsd), 0);
  const freightTotal = 5750;
  const insuranceTotal = 850;
  const totalAmount = subtotal + (incoterm.startsWith('CIF') ? freightTotal + insuranceTotal : 0);

  const navItems: PageSubNavItem[] = [
    {
      id: 'docs',
      label: 'Commercial Invoices & Documents',
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      href: '/operations/documents',
      active: true,
      desc: 'Proforma, Commercial & Packing lists',
    },
    {
      id: 'fx',
      label: 'FX Hedging & Converter',
      icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
      href: '/operations/fx',
      active: false,
      desc: 'Multi-currency rates & spread',
    },
    {
      id: 'lc',
      label: 'L/C Discrepancy Checker',
      icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
      href: '/operations/lc',
      active: false,
      desc: 'UCP 600 compliance verification',
    },
    {
      id: 'compliance',
      label: 'Sanctions & Port Screener',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      href: '/operations/compliance',
      active: false,
      desc: 'High-risk trade entity filter',
    },
  ];

  return (
    <Shell>
      {/* Top Header */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/80 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase ${accentClasses.badgeBg}`}>
              Trade Operations Desk
            </span>
            <span className="text-xs text-slate-400 font-mono">Export Documentation Generator</span>
          </div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <FileText className="w-6 h-6 text-blue-400" />
            Commercial Export Invoicing & Documentation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate formal Proforma Invoices (PI), Commercial Invoices (CI), and Packing Lists (PL) compliant with international customs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF Export</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column View with Page Left Sub-Navigation */}
      <PageLeftNav
        title="Operations Hub"
        subtitle="Export Execution"
        items={navItems}
        activeId="docs"
      >
        <div className="space-y-5">
          {/* Document Type Selector Bar */}
          <div className="flex items-center gap-2">
            {(['PI', 'CI', 'PL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDocType(t);
                  setDocNumber(`${t}-2026-DXB-${Math.floor(Math.random() * 9000 + 1000)}`);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  docType === t
                    ? `${accentClasses.bg} text-white shadow-sm`
                    : 'text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/50'
                }`}
              >
                {t === 'PI' ? 'Proforma Invoice (PI)' : t === 'CI' ? 'Commercial Invoice (CI)' : 'Packing List (PL)'}
              </button>
            ))}
          </div>

          {/* Document Sheet Layout */}
          <div className={`p-6 md:p-8 rounded-2xl border shadow-lg space-y-6 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}>
            {/* Header / Document Identity */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800/80 gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest block">
                  International Trade Document
                </span>
                <h2 className="text-xl font-bold mt-1">
                  {docType === 'PI' ? 'PROFORMA INVOICE' : docType === 'CI' ? 'COMMERCIAL INVOICE' : 'OCEAN PACKING LIST'}
                </h2>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Ref No: <strong className="text-white">{docNumber}</strong> &bull; Date: {new Date().toISOString().slice(0, 10)}
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
                  Standard UCP 600 Format
                </span>
              </div>
            </div>

            {/* Exporter & Buyer Parties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Shipper / Exporter / Beneficiary:
                </span>
                <div className="font-bold text-white text-sm">{exporterName}</div>
                <div className="text-slate-300 leading-relaxed">{exporterAddress}</div>
                <div className="text-slate-400 pt-1">IEC No: 0514089201 &bull; GSTIN: 19AAACT8921K1Z2</div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Consignee / Applicant / Buyer:
                </span>
                <div className="font-bold text-white text-sm">{buyerName}</div>
                <div className="text-slate-300 leading-relaxed">{buyerAddress}</div>
                <div className="text-slate-400 pt-1">TRN / Tax ID: 100294810290003</div>
              </div>
            </div>

            {/* Shipping Terms */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Loading Port:</span>
                <strong className="text-white mt-0.5 block truncate">{originPort}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Discharge Port:</span>
                <strong className="text-white mt-0.5 block truncate">{dischargePort}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Price Term:</span>
                <strong className="text-emerald-400 mt-0.5 block">{incoterm}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Payment Mode:</span>
                <strong className="text-purple-400 mt-0.5 block truncate">{paymentTerms}</strong>
              </div>
            </div>

            {/* Invoice Line Items Table */}
            <div className="rounded-xl overflow-hidden border border-slate-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Description of Merchandise</th>
                    <th className="p-3.5 text-right">Quantity</th>
                    <th className="p-3.5 text-right">Unit Rate (USD)</th>
                    <th className="p-3.5 text-right">Amount (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-3.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3.5 font-medium text-white">{it.description}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300">{it.quantityMt.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300">${it.unitPriceUsd.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        ${(it.quantityMt * it.unitPriceUsd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Calculation Summary */}
            <div className="flex justify-end pt-2 text-xs">
              <div className="w-full md:w-80 space-y-2 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Goods Subtotal (FOB):</span>
                  <span className="font-mono text-white">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {incoterm.startsWith('CIF') && (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Ocean Freight (Kolkata &rarr; Jebel Ali):</span>
                      <span className="font-mono text-white">${freightTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Institute Cargo Marine Insurance:</span>
                      <span className="font-mono text-white">${insuranceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Total CIF Value:</span>
                  <span className="text-emerald-400 font-mono text-base">
                    ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLeftNav>
    </Shell>
  );
}

