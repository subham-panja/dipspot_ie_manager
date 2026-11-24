export const IMPORTER_SORT_OPTIONS = [
  { value: 'score_desc', label: 'Sort: Priority Score (High-Low)' },
  { value: 'score_asc', label: 'Sort: Priority Score (Low-High)' },
  { value: 'name_asc', label: 'Sort: Company Name (A - Z)' },
  { value: 'name_desc', label: 'Sort: Company Name (Z - A)' },
  { value: 'date_desc', label: 'Sort: Newest First' },
  { value: 'volume_desc', label: 'Sort: Annual Volume High' },
];

export const SUPPLIER_SORT_OPTIONS = [
  { value: 'score_desc', label: 'Sort: Quality Score (High-Low)' },
  { value: 'score_asc', label: 'Sort: Quality Score (Low-High)' },
  { value: 'name_asc', label: 'Sort: Facility Name (A - Z)' },
  { value: 'name_desc', label: 'Sort: Facility Name (Z - A)' },
  { value: 'date_desc', label: 'Sort: Newest Registered First' },
];

export const IMPORTER_STAGE_OPTIONS = [
  { value: 'inquiry', label: 'Stage: Inquiry' },
  { value: 'qualified', label: 'Stage: Qualified' },
  { value: 'negotiation', label: 'Stage: Negotiation' },
  { value: 'won', label: 'Stage: Contract Won' },
];

export const SUPPLIER_STAGE_OPTIONS = [
  { value: 'inquiry', label: 'Stage: Procurement Inquiry' },
  { value: 'qualified', label: 'Stage: Verified Mill Audit' },
  { value: 'negotiation', label: 'Stage: Rate Negotiation' },
  { value: 'won', label: 'Stage: Active Supply Contract' },
];
