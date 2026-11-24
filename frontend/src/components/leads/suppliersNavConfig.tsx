import React from 'react';
import { Globe, Building2, Factory, Compass } from 'lucide-react';
import { PageSubNavItem } from '@/components/PageLeftNav';

interface SuppliersNavParams {
  total: number;
  district: string;
  setDistrict: (v: string) => void;
  setPage: (v: number) => void;
}

export function buildSuppliersNavItems({
  total,
  district,
  setDistrict,
  setPage,
}: SuppliersNavParams): PageSubNavItem[] {
  return [
    {
      id: 'importers',
      label: 'Importers & Buyers',
      icon: <Globe className="w-4 h-4" />,
      href: '/leads/importers',
      active: false,
      desc: 'Global wholesale buyers',
    },
    {
      id: 'suppliers',
      label: 'Verified Suppliers',
      icon: <Building2 className="w-4 h-4" />,
      badge: total,
      href: '/leads/suppliers',
      active: true,
      desc: 'Domestic processing facilities',
    },
    {
      id: 'burdwan',
      label: 'Burdwan Agro Cluster',
      icon: <Factory className="w-4 h-4 text-emerald-400" />,
      onClick: () => {
        setDistrict('Burdwan');
        setPage(1);
      },
      active: district === 'Burdwan',
      desc: 'Sortex cleaned ready units',
    },
    {
      id: 'crawler',
      label: 'Lead Crawler Engine',
      icon: <Compass className="w-4 h-4 text-purple-400" />,
      href: '/crawler',
      active: false,
      desc: 'Discover fresh suppliers',
    },
  ];
}
