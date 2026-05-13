export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          cedula: string;
          person_id: string | null;
          person_name: string;
          area_id: string | null;
          cost_area: string | null;
          job_title: string | null;
          is_active: boolean;
          source_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['employees']['Row']>;
        Update: Partial<Database['public']['Tables']['employees']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string | null;
          cedula: string;
          display_name: string;
          area_id: string | null;
          role: 'collaborator' | 'admin_tthh' | 'super_admin';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      tickets: {
        Row: {
          id: string;
          code: string;
          employee_id: string;
          cedula: string;
          sold_by_user_id: string;
          status: 'sold' | 'claimed' | 'cancelled';
          claimed_by_user_id: string | null;
          claimed_at: string | null;
          cancelled_by_user_id: string | null;
          cancellation_reason: string | null;
          purchase_amount: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tickets']['Row']>;
        Update: Partial<Database['public']['Tables']['tickets']['Row']>;
      };
    };
    Views: {
      v_my_tickets: {
        Row: {
          id: string;
          codeMasked: string;
          status: string;
          predictionStatus: string;
          points: number;
          ownerName: string;
          areaId: string | null;
          claimedAt: string | null;
        };
      };
      v_ranking_public: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      validate_active_employee: {
        Args: { p_cedula: string };
        Returns: Json;
      };
      validate_registration_ticket: {
        Args: { p_cedula: string; p_ticket_code: string };
        Returns: Json;
      };
      resolve_auth_email_by_cedula: {
        Args: { p_cedula: string };
        Returns: Json;
      };
      complete_registration_with_ticket: {
        Args: { p_cedula: string; p_ticket_code: string };
        Returns: Json;
      };
      sell_ticket: {
        Args: { p_cedula: string; p_purchase_amount?: number | null };
        Returns: Json;
      };
      claim_ticket: {
        Args: { p_code: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
