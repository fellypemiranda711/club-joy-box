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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      lab_lens_products: {
        Row: {
          active: boolean
          cost_cents: number
          created_at: string
          id: string
          lab_id: string
          lens_type: string | null
          name: string
          notes: string | null
          price_cents: number
          refraction_index: string | null
          treatments: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_cents?: number
          created_at?: string
          id?: string
          lab_id: string
          lens_type?: string | null
          name: string
          notes?: string | null
          price_cents?: number
          refraction_index?: string | null
          treatments?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_cents?: number
          created_at?: string
          id?: string
          lab_id?: string
          lens_type?: string | null
          name?: string
          notes?: string | null
          price_cents?: number
          refraction_index?: string | null
          treatments?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_lens_products_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          active: boolean
          city: string | null
          commission_percent: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          cpf: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id: string
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          cpf?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_measurements: {
        Row: {
          admin_notes: string | null
          created_at: string
          dnp_left_mm: number | null
          dnp_right_mm: number | null
          front_photo_path: string | null
          height_left_mm: number | null
          height_right_mm: number | null
          id: string
          pantoscopic_angle_deg: number | null
          pd_mm: number | null
          points: Json
          profile_photo_path: string | null
          quote_id: string
          reference_width_mm: number
          status: string
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          dnp_left_mm?: number | null
          dnp_right_mm?: number | null
          front_photo_path?: string | null
          height_left_mm?: number | null
          height_right_mm?: number | null
          id?: string
          pantoscopic_angle_deg?: number | null
          pd_mm?: number | null
          points?: Json
          profile_photo_path?: string | null
          quote_id: string
          reference_width_mm?: number
          status?: string
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          dnp_left_mm?: number | null
          dnp_right_mm?: number | null
          front_photo_path?: string | null
          height_left_mm?: number | null
          height_right_mm?: number | null
          id?: string
          pantoscopic_angle_deg?: number | null
          pd_mm?: number | null
          points?: Json
          profile_photo_path?: string | null
          quote_id?: string
          reference_width_mm?: number
          status?: string
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_measurements_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          content: string
          created_at: string
          id: string
          is_admin: boolean
          quote_id: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          content: string
          created_at?: string
          id?: string
          is_admin?: boolean
          quote_id: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          content?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          quote_id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_messages_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_options: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lab_id: string | null
          lens_product_id: string | null
          market_price_cents: number
          member_price_cents: number
          quote_id: string
          selected: boolean
          tier: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lab_id?: string | null
          lens_product_id?: string | null
          market_price_cents?: number
          member_price_cents?: number
          quote_id: string
          selected?: boolean
          tier: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lab_id?: string | null
          lens_product_id?: string | null
          market_price_cents?: number
          member_price_cents?: number
          quote_id?: string
          selected?: boolean
          tier?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_options_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_options_lens_product_id_fkey"
            columns: ["lens_product_id"]
            isOneToOne: false
            referencedRelation: "lab_lens_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_options_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          carrier: string | null
          commission_cents: number | null
          created_at: string
          estimated_delivery: string | null
          fulfillment_status: string
          id: string
          lab_id: string | null
          lens_type: string | null
          notes: string | null
          paid_at: string | null
          patient_name: string
          payment_status: string
          prescription_path: string | null
          quoted_amount_cents: number | null
          status: string
          stripe_session_id: string | null
          tracking_code: string | null
          treatments: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          carrier?: string | null
          commission_cents?: number | null
          created_at?: string
          estimated_delivery?: string | null
          fulfillment_status?: string
          id?: string
          lab_id?: string | null
          lens_type?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_name: string
          payment_status?: string
          prescription_path?: string | null
          quoted_amount_cents?: number | null
          status?: string
          stripe_session_id?: string | null
          tracking_code?: string | null
          treatments?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          carrier?: string | null
          commission_cents?: number | null
          created_at?: string
          estimated_delivery?: string | null
          fulfillment_status?: string
          id?: string
          lab_id?: string | null
          lens_type?: string | null
          notes?: string | null
          paid_at?: string | null
          patient_name?: string
          payment_status?: string
          prescription_path?: string | null
          quoted_amount_cents?: number | null
          status?: string
          stripe_session_id?: string | null
          tracking_code?: string | null
          treatments?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          quote_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quote_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          quote_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          expires_at: string
          id: string
          installments: number
          member_number: string
          monthly_price_cents: number
          plan_name: string
          plan_slug: string
          price_id: string | null
          product_id: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          expires_at?: string
          id?: string
          installments?: number
          member_number?: string
          monthly_price_cents?: number
          plan_name: string
          plan_slug: string
          price_id?: string | null
          product_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          expires_at?: string
          id?: string
          installments?: number
          member_number?: string
          monthly_price_cents?: number
          plan_name?: string
          plan_slug?: string
          price_id?: string | null
          product_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      choose_quote_option: { Args: { _option_id: string }; Returns: undefined }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_any_active_subscription: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      respond_to_quote: {
        Args: { _decision: string; _quote_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
