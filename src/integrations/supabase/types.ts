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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      change_events: {
        Row: {
          change_category: string | null
          change_type: string
          confidence: number
          created_at: string
          description: string
          event_type: string
          extraction_run_id: string | null
          extraction_timestamp: string
          filing_date: string
          filing_type: string
          id: string
          intensity_delta: number | null
          issuer: string
          manual_label: string | null
          materiality_level: string | null
          model_version: string
          section: string
          source_context_current: string | null
          source_context_previous: string | null
          source_offset_current: number | null
          source_offset_previous: number | null
          source_span_current: string | null
          source_span_previous: string | null
          source_verified_current: boolean | null
          source_verified_previous: boolean | null
        }
        Insert: {
          change_category?: string | null
          change_type: string
          confidence: number
          created_at?: string
          description: string
          event_type: string
          extraction_run_id?: string | null
          extraction_timestamp?: string
          filing_date: string
          filing_type: string
          id?: string
          intensity_delta?: number | null
          issuer: string
          manual_label?: string | null
          materiality_level?: string | null
          model_version?: string
          section: string
          source_context_current?: string | null
          source_context_previous?: string | null
          source_offset_current?: number | null
          source_offset_previous?: number | null
          source_span_current?: string | null
          source_span_previous?: string | null
          source_verified_current?: boolean | null
          source_verified_previous?: boolean | null
        }
        Update: {
          change_category?: string | null
          change_type?: string
          confidence?: number
          created_at?: string
          description?: string
          event_type?: string
          extraction_run_id?: string | null
          extraction_timestamp?: string
          filing_date?: string
          filing_type?: string
          id?: string
          intensity_delta?: number | null
          issuer?: string
          manual_label?: string | null
          materiality_level?: string | null
          model_version?: string
          section?: string
          source_context_current?: string | null
          source_context_previous?: string | null
          source_offset_current?: number | null
          source_offset_previous?: number | null
          source_span_current?: string | null
          source_span_previous?: string | null
          source_verified_current?: boolean | null
          source_verified_previous?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_change_events_extraction_run"
            columns: ["extraction_run_id"]
            isOneToOne: false
            referencedRelation: "extraction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cik: string
          company_name: string
          created_at: string
          id: string
          ticker: string
        }
        Insert: {
          cik: string
          company_name: string
          created_at?: string
          id?: string
          ticker: string
        }
        Update: {
          cik?: string
          company_name?: string
          created_at?: string
          id?: string
          ticker?: string
        }
        Relationships: []
      }
      extraction_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_filing_id: string
          error_message: string | null
          id: string
          model_version: string
          previous_filing_id: string
          sections_aligned: number | null
          sections_total: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_filing_id: string
          error_message?: string | null
          id?: string
          model_version?: string
          previous_filing_id: string
          sections_aligned?: number | null
          sections_total?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_filing_id?: string
          error_message?: string | null
          id?: string
          model_version?: string
          previous_filing_id?: string
          sections_aligned?: number | null
          sections_total?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_runs_current_filing_id_fkey"
            columns: ["current_filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_runs_previous_filing_id_fkey"
            columns: ["previous_filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      filings: {
        Row: {
          accession_number: string | null
          cik: string
          created_at: string
          filing_date: string
          filing_type: string
          id: string
          parse_version: string | null
          parsed_sections: Json | null
          primary_document: string | null
          raw_text: string
        }
        Insert: {
          accession_number?: string | null
          cik: string
          created_at?: string
          filing_date: string
          filing_type: string
          id?: string
          parse_version?: string | null
          parsed_sections?: Json | null
          primary_document?: string | null
          raw_text: string
        }
        Update: {
          accession_number?: string | null
          cik?: string
          created_at?: string
          filing_date?: string
          filing_type?: string
          id?: string
          parse_version?: string | null
          parsed_sections?: Json | null
          primary_document?: string | null
          raw_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "filings_cik_fkey"
            columns: ["cik"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["cik"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
