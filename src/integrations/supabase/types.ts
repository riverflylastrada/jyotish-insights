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
      ai_usage: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          function: string | null
          mode: string | null
          guru: string | null
          chart_id: string | null
          question: string | null
          model: string | null
          provider: string | null
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          cost_usd: number
          language: string | null
          success: boolean
          error: string | null
          latency_ms: number | null
          turn_id: string | null
          turn_kind: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          function?: string | null
          mode?: string | null
          guru?: string | null
          chart_id?: string | null
          question?: string | null
          model?: string | null
          provider?: string | null
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost_usd?: number
          language?: string | null
          success?: boolean
          error?: string | null
          latency_ms?: number | null
          turn_id?: string | null
          turn_kind?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          function?: string | null
          mode?: string | null
          guru?: string | null
          chart_id?: string | null
          question?: string | null
          model?: string | null
          provider?: string | null
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost_usd?: number
          language?: string | null
          success?: boolean
          error?: string | null
          latency_ms?: number | null
          turn_id?: string | null
          turn_kind?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          category: string
          label: string | null
          description: string | null
          is_secret: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          category?: string
          label?: string | null
          description?: string | null
          is_secret?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          category?: string
          label?: string | null
          description?: string | null
          is_secret?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      charts: {
        Row: {
          birth_details: Json
          created_at: string
          id: string
          name: string
          share_token: string
          snapshot: Json | null
          auto_insights: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_details: Json
          created_at?: string
          id?: string
          name: string
          share_token?: string
          snapshot?: Json | null
          auto_insights?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_details?: Json
          created_at?: string
          id?: string
          name?: string
          share_token?: string
          snapshot?: Json | null
          auto_insights?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ayanamsa: string
          chart_style: string
          created_at: string
          current_lat: number | null
          current_lon: number | null
          current_place_name: string | null
          current_timezone: string | null
          default_chart_id: string | null
          display_name: string | null
          house_system: string
          id: string
          role: string
          transit_alerts_enabled: boolean
          transit_alerts_categories: string[]
          email_daily_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ayanamsa?: string
          chart_style?: string
          created_at?: string
          current_lat?: number | null
          current_lon?: number | null
          current_place_name?: string | null
          current_timezone?: string | null
          default_chart_id?: string | null
          display_name?: string | null
          house_system?: string
          id?: string
          role?: string
          transit_alerts_enabled?: boolean
          transit_alerts_categories?: string[]
          email_daily_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ayanamsa?: string
          chart_style?: string
          created_at?: string
          current_lat?: number | null
          current_lon?: number | null
          current_place_name?: string | null
          current_timezone?: string | null
          default_chart_id?: string | null
          display_name?: string | null
          house_system?: string
          id?: string
          role?: string
          transit_alerts_enabled?: boolean
          transit_alerts_categories?: string[]
          email_daily_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transit_alerts: {
        Row: {
          id: string
          chart_id: string
          user_id: string
          event_key: string
          type: string
          severity: string
          starts: string
          ends: string | null
          title: string
          description: string
          citation: string | null
          affected_houses: number[] | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chart_id: string
          user_id: string
          event_key: string
          type: string
          severity: string
          starts: string
          ends?: string | null
          title: string
          description: string
          citation?: string | null
          affected_houses?: number[] | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chart_id?: string
          user_id?: string
          event_key?: string
          type?: string
          severity?: string
          starts?: string
          ends?: string | null
          title?: string
          description?: string
          citation?: string | null
          affected_houses?: number[] | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_stats: {
        Args: Record<string, never>
        Returns: Json
      }
      admin_get_users: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          email: string
          display_name: string | null
          role: string
          ayanamsa: string
          chart_style: string
          house_system: string
          charts_count: number
          created_at: string
          last_sign_in_at: string | null
        }[]
      }
      get_chart_by_share_token: {
        Args: { _token: string }
        Returns: {
          birth_details: Json
          created_at: string
          id: string
          name: string
          share_token: string
          snapshot: Json | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "charts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
