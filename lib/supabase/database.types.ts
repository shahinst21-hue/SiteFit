export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      analyses: {
        Row: {
          business_category: Database["public"]["Enums"]["business_category"];
          business_type: string;
          created_at: string;
          failure_code: string | null;
          id: string;
          owner_id: string;
          property_id: string | null;
          schema_version: number;
          status: Database["public"]["Enums"]["analysis_status"];
          updated_at: string;
        };
        Insert: {
          business_category: Database["public"]["Enums"]["business_category"];
          business_type: string;
          created_at?: string;
          failure_code?: string | null;
          id?: string;
          owner_id: string;
          property_id?: string | null;
          schema_version?: number;
          status?: Database["public"]["Enums"]["analysis_status"];
          updated_at?: string;
        };
        Update: {
          business_category?: Database["public"]["Enums"]["business_category"];
          business_type?: string;
          created_at?: string;
          failure_code?: string | null;
          id?: string;
          owner_id?: string;
          property_id?: string | null;
          schema_version?: number;
          status?: Database["public"]["Enums"]["analysis_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analyses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analyses_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      analysis_inputs: {
        Row: {
          analysis_id: string;
          created_at: string;
          id: string;
          schema_version: number;
          user_supplied: Json;
          version: number;
        };
        Insert: {
          analysis_id: string;
          created_at?: string;
          id?: string;
          schema_version?: number;
          user_supplied: Json;
          version: number;
        };
        Update: {
          analysis_id?: string;
          created_at?: string;
          id?: string;
          schema_version?: number;
          user_supplied?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_inputs_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_posts: {
        Row: {
          author: Json;
          canonical_url: string | null;
          category: string;
          content: Json;
          created_at: string;
          cta: Json | null;
          date_modified: string | null;
          date_published: string | null;
          excerpt: string;
          featured: boolean;
          featured_image: Json | null;
          featured_image_alt: string;
          id: string;
          og_description: string;
          og_image: Json | null;
          og_title: string;
          scheduled_for: string | null;
          seo_description: string;
          seo_title: string;
          slug: string;
          status: Database["public"]["Enums"]["blog_status"];
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          author: Json;
          canonical_url?: string | null;
          category: string;
          content: Json;
          created_at?: string;
          cta?: Json | null;
          date_modified?: string | null;
          date_published?: string | null;
          excerpt: string;
          featured?: boolean;
          featured_image?: Json | null;
          featured_image_alt?: string;
          id?: string;
          og_description: string;
          og_image?: Json | null;
          og_title: string;
          scheduled_for?: string | null;
          seo_description: string;
          seo_title: string;
          slug: string;
          status?: Database["public"]["Enums"]["blog_status"];
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          author?: Json;
          canonical_url?: string | null;
          category?: string;
          content?: Json;
          created_at?: string;
          cta?: Json | null;
          date_modified?: string | null;
          date_published?: string | null;
          excerpt?: string;
          featured?: boolean;
          featured_image?: Json | null;
          featured_image_alt?: string;
          id?: string;
          og_description?: string;
          og_image?: Json | null;
          og_title?: string;
          scheduled_for?: string | null;
          seo_description?: string;
          seo_title?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["blog_status"];
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      competitors: {
        Row: {
          address: string | null;
          analysis_id: string;
          business_name: string;
          category: string | null;
          created_at: string;
          evidence_id: string | null;
          id: string;
          latitude: number | null;
          limitations: string | null;
          longitude: number | null;
          observed_at: string | null;
        };
        Insert: {
          address?: string | null;
          analysis_id: string;
          business_name: string;
          category?: string | null;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          latitude?: number | null;
          limitations?: string | null;
          longitude?: number | null;
          observed_at?: string | null;
        };
        Update: {
          address?: string | null;
          analysis_id?: string;
          business_name?: string;
          category?: string | null;
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          latitude?: number | null;
          limitations?: string | null;
          longitude?: number | null;
          observed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "competitors_analysis_id_evidence_id_fkey";
            columns: ["analysis_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_items";
            referencedColumns: ["analysis_id", "id"];
          },
          {
            foreignKeyName: "competitors_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      data_snapshots: {
        Row: {
          analysis_id: string;
          availability: string;
          cost_metadata: Json | null;
          created_at: string;
          dataset_version: string | null;
          expires_at: string | null;
          id: string;
          normalised_data: Json | null;
          observed_at: string | null;
          permitted_raw_reference: string | null;
          provider_metadata: Json;
          retrieved_at: string;
          source: string;
        };
        Insert: {
          analysis_id: string;
          availability: string;
          cost_metadata?: Json | null;
          created_at?: string;
          dataset_version?: string | null;
          expires_at?: string | null;
          id?: string;
          normalised_data?: Json | null;
          observed_at?: string | null;
          permitted_raw_reference?: string | null;
          provider_metadata?: Json;
          retrieved_at: string;
          source: string;
        };
        Update: {
          analysis_id?: string;
          availability?: string;
          cost_metadata?: Json | null;
          created_at?: string;
          dataset_version?: string | null;
          expires_at?: string | null;
          id?: string;
          normalised_data?: Json | null;
          observed_at?: string | null;
          permitted_raw_reference?: string | null;
          provider_metadata?: Json;
          retrieved_at?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_snapshots_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      economic_models: {
        Row: {
          analysis_id: string;
          created_at: string;
          id: string;
          input_id: string;
          inputs: Json;
          missing_inputs: string[];
          model_version: string;
          outputs: Json | null;
          scenario_assumptions: Json;
        };
        Insert: {
          analysis_id: string;
          created_at?: string;
          id?: string;
          input_id: string;
          inputs: Json;
          missing_inputs?: string[];
          model_version: string;
          outputs?: Json | null;
          scenario_assumptions?: Json;
        };
        Update: {
          analysis_id?: string;
          created_at?: string;
          id?: string;
          input_id?: string;
          inputs?: Json;
          missing_inputs?: string[];
          model_version?: string;
          outputs?: Json | null;
          scenario_assumptions?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "economic_models_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "economic_models_analysis_id_input_id_fkey";
            columns: ["analysis_id", "input_id"];
            isOneToOne: false;
            referencedRelation: "analysis_inputs";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
      evidence_items: {
        Row: {
          analysis_id: string;
          claim: string;
          classification: Database["public"]["Enums"]["evidence_classification"];
          created_at: string;
          derivation: Json | null;
          geographic_scope: Json | null;
          id: string;
          input_id: string | null;
          knowledge: Database["public"]["Enums"]["knowledge_status"];
          limitations: string | null;
          observed_at: string | null;
          snapshot_id: string | null;
          source_reference: string | null;
          units: string | null;
          value: Json | null;
        };
        Insert: {
          analysis_id: string;
          claim: string;
          classification: Database["public"]["Enums"]["evidence_classification"];
          created_at?: string;
          derivation?: Json | null;
          geographic_scope?: Json | null;
          id?: string;
          input_id?: string | null;
          knowledge?: Database["public"]["Enums"]["knowledge_status"];
          limitations?: string | null;
          observed_at?: string | null;
          snapshot_id?: string | null;
          source_reference?: string | null;
          units?: string | null;
          value?: Json | null;
        };
        Update: {
          analysis_id?: string;
          claim?: string;
          classification?: Database["public"]["Enums"]["evidence_classification"];
          created_at?: string;
          derivation?: Json | null;
          geographic_scope?: Json | null;
          id?: string;
          input_id?: string | null;
          knowledge?: Database["public"]["Enums"]["knowledge_status"];
          limitations?: string | null;
          observed_at?: string | null;
          snapshot_id?: string | null;
          source_reference?: string | null;
          units?: string | null;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_items_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_items_analysis_id_input_id_fkey";
            columns: ["analysis_id", "input_id"];
            isOneToOne: false;
            referencedRelation: "analysis_inputs";
            referencedColumns: ["analysis_id", "id"];
          },
          {
            foreignKeyName: "evidence_items_analysis_id_snapshot_id_fkey";
            columns: ["analysis_id", "snapshot_id"];
            isOneToOne: false;
            referencedRelation: "data_snapshots";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_minor: number;
          analysis_id: string;
          checkout_reference: string | null;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string;
          payment_reference: string | null;
          price_reference: string;
          provider: string;
          status: string;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          amount_minor: number;
          analysis_id: string;
          checkout_reference?: string | null;
          created_at?: string;
          currency: string;
          id?: string;
          idempotency_key: string;
          payment_reference?: string | null;
          price_reference: string;
          provider: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          amount_minor?: number;
          analysis_id?: string;
          checkout_reference?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string;
          payment_reference?: string | null;
          price_reference?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
        ];
      };
      pdf_exports: {
        Row: {
          analysis_id: string;
          created_at: string;
          expires_at: string | null;
          id: string;
          private_storage_path: string | null;
          report_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          analysis_id: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          private_storage_path?: string | null;
          report_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          analysis_id?: string;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          private_storage_path?: string | null;
          report_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pdf_exports_analysis_id_report_id_fkey";
            columns: ["analysis_id", "report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
      premises_events: {
        Row: {
          analysis_id: string;
          business_category: string | null;
          business_name: string | null;
          confidence: number | null;
          created_at: string;
          estimated_end: string | null;
          estimated_start: string | null;
          evidence_id: string | null;
          evidence_quality: Json | null;
          id: string;
          knowledge: Database["public"]["Enums"]["knowledge_status"];
          property_id: string | null;
          source: string | null;
          vacancy_signal: string | null;
        };
        Insert: {
          analysis_id: string;
          business_category?: string | null;
          business_name?: string | null;
          confidence?: number | null;
          created_at?: string;
          estimated_end?: string | null;
          estimated_start?: string | null;
          evidence_id?: string | null;
          evidence_quality?: Json | null;
          id?: string;
          knowledge?: Database["public"]["Enums"]["knowledge_status"];
          property_id?: string | null;
          source?: string | null;
          vacancy_signal?: string | null;
        };
        Update: {
          analysis_id?: string;
          business_category?: string | null;
          business_name?: string | null;
          confidence?: number | null;
          created_at?: string;
          estimated_end?: string | null;
          estimated_start?: string | null;
          evidence_id?: string | null;
          evidence_quality?: Json | null;
          id?: string;
          knowledge?: Database["public"]["Enums"]["knowledge_status"];
          property_id?: string | null;
          source?: string | null;
          vacancy_signal?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "premises_events_analysis_id_evidence_id_fkey";
            columns: ["analysis_id", "evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_items";
            referencedColumns: ["analysis_id", "id"];
          },
          {
            foreignKeyName: "premises_events_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "premises_events_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          created_at: string;
          external_place_id: string | null;
          formatted_address: string;
          id: string;
          latitude: number | null;
          longitude: number | null;
          postcode: string | null;
          resolution_status: Database["public"]["Enums"]["knowledge_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          external_place_id?: string | null;
          formatted_address: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          postcode?: string | null;
          resolution_status?: Database["public"]["Enums"]["knowledge_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          external_place_id?: string | null;
          formatted_address?: string;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          postcode?: string | null;
          resolution_status?: Database["public"]["Enums"]["knowledge_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      report_sections: {
        Row: {
          analysis_id: string;
          claim_evidence: Json;
          created_at: string;
          id: string;
          position: number;
          report_id: string;
          section_key: string;
          structured_content: Json;
        };
        Insert: {
          analysis_id: string;
          claim_evidence?: Json;
          created_at?: string;
          id?: string;
          position: number;
          report_id: string;
          section_key: string;
          structured_content: Json;
        };
        Update: {
          analysis_id?: string;
          claim_evidence?: Json;
          created_at?: string;
          id?: string;
          position?: number;
          report_id?: string;
          section_key?: string;
          structured_content?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "report_sections_analysis_id_report_id_fkey";
            columns: ["analysis_id", "report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
      reports: {
        Row: {
          analysis_id: string;
          created_at: string;
          economic_model_id: string | null;
          id: string;
          input_id: string;
          provenance: Json;
          schema_version: number;
          status: string;
          tier: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          analysis_id: string;
          created_at?: string;
          economic_model_id?: string | null;
          id?: string;
          input_id: string;
          provenance?: Json;
          schema_version: number;
          status?: string;
          tier: string;
          updated_at?: string;
          version: number;
        };
        Update: {
          analysis_id?: string;
          created_at?: string;
          economic_model_id?: string | null;
          id?: string;
          input_id?: string;
          provenance?: Json;
          schema_version?: number;
          status?: string;
          tier?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_economic_model_id_fkey";
            columns: ["analysis_id", "economic_model_id"];
            isOneToOne: false;
            referencedRelation: "economic_models";
            referencedColumns: ["analysis_id", "id"];
          },
          {
            foreignKeyName: "reports_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_analysis_id_input_id_fkey";
            columns: ["analysis_id", "input_id"];
            isOneToOne: false;
            referencedRelation: "analysis_inputs";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
      system_events: {
        Row: {
          analysis_id: string | null;
          correlation_id: string | null;
          event_type: string;
          id: string;
          occurred_at: string;
          outcome: string | null;
          payment_id: string | null;
          report_id: string | null;
          safe_metadata: Json;
        };
        Insert: {
          analysis_id?: string | null;
          correlation_id?: string | null;
          event_type: string;
          id?: string;
          occurred_at?: string;
          outcome?: string | null;
          payment_id?: string | null;
          report_id?: string | null;
          safe_metadata?: Json;
        };
        Update: {
          analysis_id?: string | null;
          correlation_id?: string | null;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          outcome?: string | null;
          payment_id?: string | null;
          report_id?: string | null;
          safe_metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "system_events_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "system_events_analysis_id_payment_id_fkey";
            columns: ["analysis_id", "payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["analysis_id", "id"];
          },
          {
            foreignKeyName: "system_events_analysis_id_report_id_fkey";
            columns: ["analysis_id", "report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["analysis_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      analysis_status:
        | "draft"
        | "collecting_free_data"
        | "free_ready"
        | "awaiting_payment"
        | "paid"
        | "collecting_full_data"
        | "calculating"
        | "generating_report"
        | "ready"
        | "failed";
      blog_status: "draft" | "scheduled" | "published" | "archived";
      business_category: "coffee-shop" | "restaurant" | "hair-beauty-salon";
      evidence_classification:
        | "measured_data"
        | "official_public_data"
        | "commercial_data"
        | "modelled_estimate"
        | "ai_inference"
        | "user_supplied_information";
      knowledge_status: "known" | "estimated" | "unknown";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      analysis_status: [
        "draft",
        "collecting_free_data",
        "free_ready",
        "awaiting_payment",
        "paid",
        "collecting_full_data",
        "calculating",
        "generating_report",
        "ready",
        "failed",
      ],
      blog_status: ["draft", "scheduled", "published", "archived"],
      business_category: ["coffee-shop", "restaurant", "hair-beauty-salon"],
      evidence_classification: [
        "measured_data",
        "official_public_data",
        "commercial_data",
        "modelled_estimate",
        "ai_inference",
        "user_supplied_information",
      ],
      knowledge_status: ["known", "estimated", "unknown"],
    },
  },
} as const;
