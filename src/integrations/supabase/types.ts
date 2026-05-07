export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          plan_id: string
          subject: string | null
          user_display: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          plan_id: string
          subject?: string | null
          user_display?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          plan_id?: string
          subject?: string | null
          user_display?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          guest_id: string
          id: string
          pinned: boolean
          plan_id: string
          scenario_id: string
          seat_index: number | null
          table_id: string
        }
        Insert: {
          guest_id: string
          id?: string
          pinned?: boolean
          plan_id: string
          scenario_id: string
          seat_index?: number | null
          table_id: string
        }
        Update: {
          guest_id?: string
          id?: string
          pinned?: boolean
          plan_id?: string
          scenario_id?: string
          seat_index?: number | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables_def"
            referencedColumns: ["id"]
          },
        ]
      }
      constraints_def: {
        Row: {
          guest_a: string
          guest_b: string
          id: string
          kind: string
          plan_id: string
        }
        Insert: {
          guest_a: string
          guest_b: string
          id?: string
          kind: string
          plan_id: string
        }
        Update: {
          guest_a?: string
          guest_b?: string
          id?: string
          kind?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constraints_def_guest_a_fkey"
            columns: ["guest_a"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constraints_def_guest_b_fkey"
            columns: ["guest_b"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constraints_def_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          accessibility: string | null
          created_at: string
          id: string
          is_kid: boolean
          meal: string | null
          name: string
          notes: string | null
          party: string | null
          plan_id: string
          rsvp: string
          side: string | null
        }
        Insert: {
          accessibility?: string | null
          created_at?: string
          id?: string
          is_kid?: boolean
          meal?: string | null
          name: string
          notes?: string | null
          party?: string | null
          plan_id: string
          rsvp?: string
          side?: string | null
        }
        Update: {
          accessibility?: string | null
          created_at?: string
          id?: string
          is_kid?: boolean
          meal?: string | null
          name?: string
          notes?: string | null
          party?: string | null
          plan_id?: string
          rsvp?: string
          side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_paddle_sessions: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          magic_link_url: string
          paddle_session_id: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          magic_link_url: string
          paddle_session_id: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          magic_link_url?: string
          paddle_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_owners: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_owners_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          event_date: string | null
          id: string
          name: string
          owner_id: string | null
          room_config: Json | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          event_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          room_config?: Json | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          event_date?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          room_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          environment: string
          id: string
          is_grandfathered: boolean
          is_paid: boolean
          paddle_customer_id: string | null
          paddle_transaction_id: string | null
          paid_at: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id: string
          is_grandfathered?: boolean
          is_paid?: boolean
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          is_grandfathered?: boolean
          is_paid?: boolean
          paddle_customer_id?: string | null
          paddle_transaction_id?: string | null
          paid_at?: string | null
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          plan_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tables_def: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          plan_id: string
          rotation: number
          scenario_id: string
          shape: string
          x: number
          y: number
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          name: string
          plan_id: string
          rotation?: number
          scenario_id: string
          shape?: string
          x?: number
          y?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          plan_id?: string
          rotation?: number
          scenario_id?: string
          shape?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "tables_def_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_plan: { Args: { p_plan_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_get_stats: { Args: never; Returns: Json }
      admin_list_plans: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          code: string
          created_at: string
          event_date: string
          guest_count: number
          id: string
          name: string
          owner_email: string
          table_count: number
          updated_at: string
        }[]
      }
      admin_list_users: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          plan_count: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_sample_plan: { Args: never; Returns: string }
      get_plan_snapshot: { Args: { _code: string }; Returns: Json }
      is_plan_editor: {
        Args: { _plan_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      plan_has_any_owner: { Args: { _plan_id: string }; Returns: boolean }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_is_paid: {
        Args: { _env?: string; _user_id: string }
        Returns: boolean
      }
      validate_plan_code: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
