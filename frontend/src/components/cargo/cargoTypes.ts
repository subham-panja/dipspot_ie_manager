export interface Milestone {
  stage_id: string;
  name: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending';
  location?: string;
  actual_date?: string;
  planned_date?: string;
  notes?: string;
}

export interface Shipment {
  tracking_number: string;
  deal_id?: string;
  customer_name: string;
  destination_country: string;
  cargo_description: string;
  container_numbers: string[];
  bl_number: string;
  vessel_name: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  etd: string;
  eta: string;
  current_stage_id: string;
  current_stage_name: string;
  progress_percent: number;
  is_delivered: boolean;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface MasterStage {
  stage_id: string;
  name: string;
  order: number;
  description?: string;
  is_terminal?: boolean;
}

export interface CreateShipmentFormData {
  customer_name: string;
  destination_country: string;
  cargo_description: string;
  container_numbers: string;
  bl_number: string;
  vessel_name: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  etd: string;
  eta: string;
}
