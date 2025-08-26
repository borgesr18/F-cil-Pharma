export type OrderStatus = 'draft'|'submitted'|'picking'|'checking'|'ready'|'delivered'|'received'|'cancelled';
export type Priority = 'normal'|'urgente';
export type UserRole = 'nurse'|'pharmacy'|'admin'|'auditor';

// Tipos para RPC responses
export type RPCResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

export type SetOrderStatusResponse = {
  success: boolean;
  error?: string;
  from?: OrderStatus;
  to?: OrderStatus;
  checks_count?: number;
  required_checks?: number;
};

export type ClaimOrderResponse = {
  success: boolean;
  error?: string;
  assigned_to?: string;
};

export type MAVCheckResponse = {
  success: boolean;
  error?: string;
  checks_count?: number;
  can_advance?: boolean;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { user_id: string; role: UserRole; room_id: number|null; display_name: string|null } };
      rooms: { Row: { id: number; name: string; active: boolean } };
      kits: { Row: { id: number; key: string; name: string; active: boolean } };
      kit_items: { Row: { kit_id: number; med_id: number; qty: number; unit: string } };
      meds: { Row: { id: number; name: string; unit: string; high_alert: boolean; active: boolean } };
      orders: { 
        Row: { 
          id: number; 
          room_id: number; 
          status: OrderStatus; 
          priority: Priority; 
          kit_key: string|null; 
          notes: string|null; 
          created_by: string; 
          created_at: string; 
          updated_at: string;
          assigned_to: string|null;
          assigned_at: string|null;
        } 
      };
      order_items: { Row: { id: number; order_id: number; med_id: number; qty: number; unit: string; high_alert: boolean } };
      order_events: { 
        Row: { 
          id: number; 
          order_id: number; 
          from_status: OrderStatus|null; 
          to_status: OrderStatus; 
          actor_id: string; 
          created_at: string;
          reason: string|null;
          ip_address: string|null;
          user_agent: string|null;
          metadata: any|null;
        } 
      };
      high_alert_checks: {
        Row: {
          id: number;
          order_id: number;
          checker_id: string;
          checked_at: string;
          notes: string|null;
        }
      };
      sla_config: {
        Row: {
          priority: Priority;
          sla_minutes: number;
          warning_threshold_percent: number|null;
          created_at: string|null;
        }
      };
    };
    Functions: {
      set_order_status: {
        Args: {
          p_order_id: number;
          p_to: OrderStatus;
          p_reason?: string;
          p_metadata?: any;
        };
        Returns: SetOrderStatusResponse;
      };
      claim_order: {
        Args: {
          p_order_id: number;
        };
        Returns: ClaimOrderResponse;
      };
      add_mav_check: {
        Args: {
          p_order_id: number;
          p_notes?: string;
        };
        Returns: MAVCheckResponse;
      };
    };
  };
};
