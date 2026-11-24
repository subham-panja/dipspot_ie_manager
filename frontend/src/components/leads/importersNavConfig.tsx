import React from 'react';
import { Globe, Building2, Compass, Star, Ship } from 'lucide-react';
import { PageSubNavItem } from '@/components/PageLeftNav';

interface NavParams {
  total: number;
  tier: string;
  port: string;
  minScore: number | '';
  setTier: (v: string) => void;
  setPort: (v: string) => void;
  setCountry: (v: string) => void;
  setMinScore: (v: number | '') => void;
  setPage: (v: number) => void;
}

export function buildImportersNavItems({
  total,
  tier,
  port,
  minScore,
  setTier,
  setPort,
  setCountry,
  setMinScore,
  setPage,
}: NavParams): PageSubNavItem[] {
  return [
    {
      id: 'importers',
      label: 'All Importers & Buyers',
      icon: <Globe className="w-4 h-4" />,
      badge: total,
      onClick: () => {
        setTier('');
        setPort('');
        setCountry('');
        setPage(1);
      },
      active: !tier && !port,
      desc: 'Global wholesale buyers',
    },
    {
      id: 'customs_sme',
      label: 'Customs Manifests (1-3 FCL)',
      icon: <Ship className="w-4 h-4 text-cyan-400" />,
      onClick: () => {
        setTier('sme');
        setPage(1);
      },
      active: tier === 'sme',
      desc: 'SME buyers (no conglomerates)',
    },
    {
      id: 'port_jebel_ali',
      label: '🇦🇪 Jebel Ali Port (UAE)',
      icon: <Ship className="w-4 h-4 text-blue-400" />,
      onClick: () => {
        setPort('Jebel Ali');
        setPage(1);
      },
      active: port === 'Jebel Ali',
      desc: 'Dubai & Northern Emirates',
    },
    {
      id: 'port_kbs',
      label: '🇧🇭 Khalifa Bin Salman',
      icon: <Ship className="w-4 h-4 text-rose-400" />,
      onClick: () => {
        setPort('Khalifa Bin Salman');
        setPage(1);
      },
      active: port === 'Khalifa Bin Salman',
      desc: 'Bahrain Milled Rice Consignees',
    },
    {
      id: 'port_dammam',
      label: '🇸🇦 King Abdulaziz (Dammam)',
      icon: <Ship className="w-4 h-4 text-emerald-400" />,
      onClick: () => {
        setPort('Dammam');
        setPage(1);
      },
      active: port === 'Dammam',
      desc: 'Saudi Eastern Province',
    },
    {
      id: 'port_mombasa',
      label: '🇰🇪 Port of Mombasa',
      icon: <Ship className="w-4 h-4 text-amber-400" />,
      onClick: () => {
        setPort('Mombasa');
        setPage(1);
      },
      active: port === 'Mombasa',
      desc: 'Kenya & East Africa Hub',
    },
    {
      id: 'suppliers',
      label: 'Verified Suppliers',
      icon: <Building2 className="w-4 h-4" />,
      href: '/leads/suppliers',
      active: false,
      desc: 'Domestic processing facilities',
    },
    {
      id: 'tier1',
      label: 'Tier 1 Priority (80+)',
      icon: <Star className="w-4 h-4 text-emerald-400" />,
      onClick: () => {
        setMinScore(80);
        setPage(1);
      },
      active: minScore === 80,
      desc: 'Pre-qualified active RFQs',
    },
    {
      id: 'crawler',
      label: 'Lead Crawler Engine',
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      href: '/crawler',
      active: false,
      desc: 'Harvest fresh trade leads',
    },
  ];
}
