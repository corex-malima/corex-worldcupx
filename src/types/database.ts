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
        };
        Insert: Partial<Database['public']['Tables']['employees']['Row']>;
        Update: Partial<Database['public']['Tables']['employees']['Row']>;
      };
      tickets: {
        Row: {
          id: string;
          code: string;
          employee_id: string;
          cedula: string;
          status: string;
          claimed_by_user_id: string | null;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['tickets']['Row']>;
        Update: Partial<Database['public']['Tables']['tickets']['Row']>;
      };
    };
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
  };
}
