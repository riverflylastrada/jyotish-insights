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
          chart_id: string | null
          completion_tokens: number
          cost_usd: number
          created_at: string
          error: string | null
          function: string | null
          guru: string | null
          id: string
          language: string | null
          latency_ms: number | null
          mode: string | null
          model: string | null
          prompt_tokens: number
          provider: string | null
          question: string | null
          success: boolean
          total_tokens: number
          turn_id: string | null
          turn_kind: string | null
          user_id: string | null
        }
        Insert: {
          chart_id?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          function?: string | null
          guru?: string | null
          id?: string
          language?: string | null
          latency_ms?: number | null
          mode?: string | null
          model?: string | null
          prompt_tokens?: number
          provider?: string | null
          question?: string | null
          success?: boolean
          total_tokens?: number
          turn_id?: string | null
          turn_kind?: string | null
          user_id?: string | null
        }
        Update: {
          chart_id?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          error?: string | null
          function?: string | null
          guru?: string | null
          id?: string
          language?: string | null
          latency_ms?: number | null
          mode?: string | null
          model?: string | null
          prompt_tokens?: number
          provider?: string | null
          question?: string | null
          success?: boolean
          total_tokens?: number
          turn_id?: string | null
          turn_kind?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          key: string
          label: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      charts: {
        Row: {
          auto_insights: Json | null
          birth_details: Json
          created_at: string
          id: string
          name: string
          share_token: string
          snapshot: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_insights?: Json | null
          birth_details: Json
          created_at?: string
          id?: string
          name: string
          share_token?: string
          snapshot?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_insights?: Json | null
          birth_details?: Json
          created_at?: string
          id?: string
          name?: string
          share_token?: string
          snapshot?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_email_sends: {
        Row: {
          created_at: string
          error: string | null
          id: string
          listmonk_message_id: string | null
          llm_used: boolean
          local_date: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          listmonk_message_id?: string | null
          llm_used?: boolean
          local_date: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          listmonk_message_id?: string | null
          llm_used?: boolean
          local_date?: string
          sent_at?: string | null
          status?: string
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
          email_daily_enabled: boolean
          house_system: string
          id: string
          role: string
          transit_alerts_categories: string[]
          transit_alerts_enabled: boolean
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
          email_daily_enabled?: boolean
          house_system?: string
          id?: string
          role?: string
          transit_alerts_categories?: string[]
          transit_alerts_enabled?: boolean
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
          email_daily_enabled?: boolean
          house_system?: string
          id?: string
          role?: string
          transit_alerts_categories?: string[]
          transit_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_chart_id_fkey"
            columns: ["default_chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_readings: {
        Row: {
          answer: Json
          chart_id: string | null
          created_at: string
          gurus: string[]
          id: string
          kind: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: Json
          chart_id?: string | null
          created_at?: string
          gurus?: string[]
          id?: string
          kind?: string
          question: string
          user_id: string
        }
        Update: {
          answer?: Json
          chart_id?: string | null
          created_at?: string
          gurus?: string[]
          id?: string
          kind?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_readings_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tweets: {
        Row: {
          body: string | null
          content_type: string
          created_at: string
          error: string | null
          generated_by: string
          id: string
          impressions: number
          language: string
          likes: number
          media_url: string | null
          posted_at: string | null
          rashi: string | null
          scheduled_at: string
          status: string
          thread: Json | null
          tweet_id: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          body?: string | null
          content_type: string
          created_at?: string
          error?: string | null
          generated_by?: string
          id?: string
          impressions?: number
          language?: string
          likes?: number
          media_url?: string | null
          posted_at?: string | null
          rashi?: string | null
          scheduled_at: string
          status?: string
          thread?: Json | null
          tweet_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          body?: string | null
          content_type?: string
          created_at?: string
          error?: string | null
          generated_by?: string
          id?: string
          impressions?: number
          language?: string
          likes?: number
          media_url?: string | null
          posted_at?: string | null
          rashi?: string | null
          scheduled_at?: string
          status?: string
          thread?: Json | null
          tweet_id?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: []
      }
      social_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          label: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_runs: {
        Row: {
          action: string | null
          detail: Json | null
          id: string
          ran_at: string
          result: string | null
        }
        Insert: {
          action?: string | null
          detail?: Json | null
          id?: string
          ran_at?: string
          result?: string | null
        }
        Update: {
          action?: string | null
          detail?: Json | null
          id?: string
          ran_at?: string
          result?: string | null
        }
        Relationships: []
      }
      social_settings: {
        Row: {
          default_city: string
          default_lat: number | null
          default_lon: number | null
          default_tz: string
          fetch_metrics: boolean
          id: number
          include_link: boolean
          languages: Json
          last_poll_at: string | null
          max_per_day: number
          max_per_hour: number
          poll_interval_min: number
          twitter_enabled: boolean
          updated_at: string
        }
        Insert: {
          default_city?: string
          default_lat?: number | null
          default_lon?: number | null
          default_tz?: string
          fetch_metrics?: boolean
          id?: number
          include_link?: boolean
          languages?: Json
          last_poll_at?: string | null
          max_per_day?: number
          max_per_hour?: number
          poll_interval_min?: number
          twitter_enabled?: boolean
          updated_at?: string
        }
        Update: {
          default_city?: string
          default_lat?: number | null
          default_lon?: number | null
          default_tz?: string
          fetch_metrics?: boolean
          id?: number
          include_link?: boolean
          languages?: Json
          last_poll_at?: string | null
          max_per_day?: number
          max_per_hour?: number
          poll_interval_min?: number
          twitter_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      transit_alerts: {
        Row: {
          affected_houses: number[] | null
          chart_id: string
          citation: string | null
          created_at: string | null
          description: string
          ends: string | null
          event_key: string
          id: string
          read_at: string | null
          severity: string
          starts: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          affected_houses?: number[] | null
          chart_id: string
          citation?: string | null
          created_at?: string | null
          description: string
          ends?: string | null
          event_key: string
          id?: string
          read_at?: string | null
          severity: string
          starts: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          affected_houses?: number[] | null
          chart_id?: string
          citation?: string | null
          created_at?: string | null
          description?: string
          ends?: string | null
          event_key?: string
          id?: string
          read_at?: string | null
          severity?: string
          starts?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transit_alerts_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          chart_id: string | null
          conversation_id: string | null
          created_at: string
          credits_consumed: number
          duration_seconds: number
          ended_at: string | null
          guru_persona: string
          id: string
          language: string | null
          started_at: string | null
          transcript: Json | null
          user_id: string
        }
        Insert: {
          chart_id?: string | null
          conversation_id?: string | null
          created_at?: string
          credits_consumed?: number
          duration_seconds?: number
          ended_at?: string | null
          guru_persona?: string
          id?: string
          language?: string | null
          started_at?: string | null
          transcript?: Json | null
          user_id: string
        }
        Update: {
          chart_id?: string | null
          conversation_id?: string | null
          created_at?: string
          credits_consumed?: number
          duration_seconds?: number
          ended_at?: string | null
          guru_persona?: string
          id?: string
          language?: string | null
          started_at?: string | null
          transcript?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_stats: { Args: never; Returns: Json }
      admin_get_users: {
        Args: never
        Returns: {
          ayanamsa: string
          chart_style: string
          charts_count: number
          created_at: string
          display_name: string
          email: string
          house_system: string
          last_sign_in_at: string
          role: string
          user_id: string
        }[]
      }
      admin_get_voice_stats: { Args: never; Returns: Json }
      get_app_settings_by_category: {
        Args: { _category: string }
        Returns: {
          key: string
          value: string
        }[]
      }
      get_chart_by_share_token: {
        Args: { _token: string }
        Returns: {
          auto_insights: Json | null
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
      usage_turn_counts: {
        Args: { p_exclude_turn?: string; p_since: string; p_user: string }
        Returns: {
          debates_used: number
          questions_used: number
        }[]
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
