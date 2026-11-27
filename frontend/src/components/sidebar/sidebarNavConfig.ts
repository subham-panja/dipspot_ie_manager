export type SidebarIconKey = 'users' | 'megaphone' | 'ship' | 'radar' | 'filecheck';

export interface SidebarSubLink {
  href: string;
  label: string;
  matchPaths?: string[];
}

export interface SidebarGroupConfig {
  id: string;
  label: string;
  icon: SidebarIconKey;
  activePrefixes: string[];
  items: SidebarSubLink[];
}

export const SIDEBAR_NAV_GROUPS: SidebarGroupConfig[] = [
  {
    id: 'leads',
    label: 'Leads Directory',
    icon: 'users',
    activePrefixes: ['/leads'],
    items: [
      { href: '/leads/importers', label: 'Importers & Buyers', matchPaths: ['/leads/importers', '/leads'] },
      { href: '/leads/suppliers', label: 'Verified Suppliers', matchPaths: ['/leads/suppliers'] },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'megaphone',
    activePrefixes: ['/campaigns'],
    items: [
      { href: '/campaigns', label: 'Active Sequences', matchPaths: ['/campaigns'] },
      { href: '/campaigns/inbox', label: 'Omnichannel Inbox', matchPaths: ['/campaigns/inbox'] },
      { href: '/campaigns/cadences', label: 'Follow-Up Cadences', matchPaths: ['/campaigns/cadences'] },
      { href: '/campaigns/segments', label: 'Audience Segments', matchPaths: ['/campaigns/segments'] },
      { href: '/campaigns/wizard', label: 'Campaign Builder', matchPaths: ['/campaigns/wizard'] },
      { href: '/campaigns/templates', label: 'Message Templates', matchPaths: ['/campaigns/templates'] },
    ],
  },
  {
    id: 'cargo',
    label: 'Cargo & Parcel',
    icon: 'ship',
    activePrefixes: ['/cargo', '/shipments'],
    items: [
      { href: '/cargo', label: 'Active Shipments', matchPaths: ['/cargo', '/shipments'] },
      { href: '/cargo/milestones', label: 'Milestone Tracker', matchPaths: ['/cargo/milestones'] },
      { href: '/cargo/routes', label: 'Ocean Routes & Rates', matchPaths: ['/cargo/routes'] },
      { href: '/cargo/ports', label: 'Commercial Ports', matchPaths: ['/cargo/ports'] },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: 'radar',
    activePrefixes: ['/intelligence'],
    items: [
      { href: '/intelligence?tab=competitors', label: 'Competitor Profiles' },
      { href: '/intelligence?tab=quotes', label: 'Spot Pricing Matrix' },
      { href: '/intelligence?tab=freight', label: 'Ocean Freight Index' },
      { href: '/intelligence?tab=tariffs', label: 'Customs & Tariffs' },
    ],
  },
  {
    id: 'operations',
    label: 'Trade Operations',
    icon: 'filecheck',
    activePrefixes: ['/operations'],
    items: [
      { href: '/operations/documents', label: 'Export Documents (PI/CI)', matchPaths: ['/operations/documents'] },
      { href: '/operations/fx', label: 'FX Rates & Calculator', matchPaths: ['/operations/fx'] },
      { href: '/operations/lc', label: 'Letter of Credit (L/C)', matchPaths: ['/operations/lc'] },
      { href: '/operations/compliance', label: 'Sanctions Screener', matchPaths: ['/operations/compliance'] },
    ],
  },
];
