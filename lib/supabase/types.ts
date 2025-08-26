export type OrderStatus = 'draft'|'submitted'|'picking'|'checking'|'ready'|'delivered'|'received'|'cancelled';
export type Priority = 'normal'|'urgente';
export type UserRole = 'nurse'|'pharmacy'|'admin'|'auditor';

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { user_id: string; role: UserRole; room_id: number|null; display_name: string|null } };
      rooms: { Row: { id: number; name: string; active: boolean } };
      kits: { Row: { id: number; key: string; name: string; active: boolean } };
      kit_items: { Row: { kit_id: number; med_id: number; qty: number; unit: string } };
      meds: { Row: { id: number; name: string; unit: string; high_alert: boolean; active: boolean } };
      orders: { Row: { id: number; room_id: number; status: OrderStatus; priority: Priority; kit_key: string|null; notes: string|null; created_by: string; created_at: string; updated_at: string } };
      order_items: { Row: { id: number; order_id: number; med_id: number; qty: number; unit: string; high_alert: boolean } };
      order_events: { Row: { id: number; order_id: number; from_status: OrderStatus|null; to_status: OrderStatus; actor_id: string; created_at: string } };
    };
  };
};