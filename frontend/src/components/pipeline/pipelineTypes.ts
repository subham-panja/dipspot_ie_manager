export interface Stage {
  stage_id: string;
  name: string;
  order: number;
  color?: string;
  is_terminal?: boolean;
}

export interface Deal {
  deal_id: string;
  title: string;
  company_name: string;
  country: string;
  commodity: string;
  quantity_mt: number;
  value_usd?: number;
  incoterm: string;
  payment_terms: string;
  stage_id: string;
  stage_name?: string;
  expected_close_date?: string;
  notes?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DealComment {
  id: string;
  author: string;
  text: string;
  tag: string;
  created_at: string;
}

export interface NewDealFormData {
  title: string;
  company_name: string;
  country: string;
  commodity: string;
  quantity_mt: number;
  value_usd?: number;
  incoterm: string;
  payment_terms: string;
  stage_id: string;
  expected_close_date?: string;
  note?: string;
}

export interface NewStageFormData {
  name: string;
  color: string;
  is_terminal: boolean;
}
