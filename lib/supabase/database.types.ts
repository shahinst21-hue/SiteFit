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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          business_category: Database["public"]["Enums"]["business_category"]
          business_type: string
          created_at: string
          failure_code: string | null
          id: string
          owner_id: string
          property_id: string | null
          schema_version: number
          status: Database["public"]["Enums"]["analysis_status"]
          submission_nonce: string | null
          submission_sha256: string | null
          updated_at: string
        }
        Insert: {
          business_category: Database["public"]["Enums"]["business_category"]
          business_type: string
          created_at?: string
          failure_code?: string | null
          id?: string
          owner_id: string
          property_id?: string | null
          schema_version?: number
          status?: Database["public"]["Enums"]["analysis_status"]
          submission_nonce?: string | null
          submission_sha256?: string | null
          updated_at?: string
        }
        Update: {
          business_category?: Database["public"]["Enums"]["business_category"]
          business_type?: string
          created_at?: string
          failure_code?: string | null
          id?: string
          owner_id?: string
          property_id?: string | null
          schema_version?: number
          status?: Database["public"]["Enums"]["analysis_status"]
          submission_nonce?: string | null
          submission_sha256?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_inputs: {
        Row: {
          analysis_id: string
          context_schema_version: number | null
          created_at: string
          id: string
          resolved_context: Json | null
          schema_version: number
          user_supplied: Json
          version: number
        }
        Insert: {
          analysis_id: string
          context_schema_version?: number | null
          created_at?: string
          id?: string
          resolved_context?: Json | null
          schema_version?: number
          user_supplied: Json
          version: number
        }
        Update: {
          analysis_id?: string
          context_schema_version?: number | null
          created_at?: string
          id?: string
          resolved_context?: Json | null
          schema_version?: number
          user_supplied?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_inputs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: Json
          canonical_url: string | null
          category: string
          content: Json
          created_at: string
          cta: Json | null
          date_modified: string | null
          date_published: string | null
          excerpt: string
          featured: boolean
          featured_image: Json | null
          featured_image_alt: string
          id: string
          og_description: string
          og_image: Json | null
          og_title: string
          scheduled_for: string | null
          seo_description: string
          seo_title: string
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author: Json
          canonical_url?: string | null
          category: string
          content: Json
          created_at?: string
          cta?: Json | null
          date_modified?: string | null
          date_published?: string | null
          excerpt: string
          featured?: boolean
          featured_image?: Json | null
          featured_image_alt?: string
          id?: string
          og_description: string
          og_image?: Json | null
          og_title: string
          scheduled_for?: string | null
          seo_description: string
          seo_title: string
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: Json
          canonical_url?: string | null
          category?: string
          content?: Json
          created_at?: string
          cta?: Json | null
          date_modified?: string | null
          date_published?: string | null
          excerpt?: string
          featured?: boolean
          featured_image?: Json | null
          featured_image_alt?: string
          id?: string
          og_description?: string
          og_image?: Json | null
          og_title?: string
          scheduled_for?: string | null
          seo_description?: string
          seo_title?: string
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      competitors: {
        Row: {
          address: string | null
          analysis_id: string
          business_name: string
          category: string | null
          created_at: string
          evidence_id: string | null
          id: string
          latitude: number | null
          limitations: string | null
          longitude: number | null
          observed_at: string | null
        }
        Insert: {
          address?: string | null
          analysis_id: string
          business_name: string
          category?: string | null
          created_at?: string
          evidence_id?: string | null
          id?: string
          latitude?: number | null
          limitations?: string | null
          longitude?: number | null
          observed_at?: string | null
        }
        Update: {
          address?: string | null
          analysis_id?: string
          business_name?: string
          category?: string | null
          created_at?: string
          evidence_id?: string | null
          id?: string
          latitude?: number | null
          limitations?: string | null
          longitude?: number | null
          observed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_analysis_id_evidence_id_fkey"
            columns: ["analysis_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "competitors_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      data_snapshots: {
        Row: {
          adapter_version: string | null
          analysis_id: string
          availability: string
          cache_metadata: Json
          collection_key: string | null
          contract_version: number
          cost_metadata: Json | null
          created_at: string
          dataset_release_id: string | null
          dataset_version: string | null
          effective_from: string | null
          effective_to: string | null
          expires_at: string | null
          id: string
          input_id: string | null
          licence_metadata: Json
          normalisation_version: string | null
          normalised_data: Json | null
          observed_at: string | null
          payload_sha256: string | null
          permitted_raw_reference: string | null
          provider_metadata: Json
          quality_metadata: Json
          request_sha256: string | null
          retrieved_at: string
          source: string
          source_retrieved_at: string | null
        }
        Insert: {
          adapter_version?: string | null
          analysis_id: string
          availability: string
          cache_metadata?: Json
          collection_key?: string | null
          contract_version?: number
          cost_metadata?: Json | null
          created_at?: string
          dataset_release_id?: string | null
          dataset_version?: string | null
          effective_from?: string | null
          effective_to?: string | null
          expires_at?: string | null
          id?: string
          input_id?: string | null
          licence_metadata?: Json
          normalisation_version?: string | null
          normalised_data?: Json | null
          observed_at?: string | null
          payload_sha256?: string | null
          permitted_raw_reference?: string | null
          provider_metadata?: Json
          quality_metadata?: Json
          request_sha256?: string | null
          retrieved_at: string
          source: string
          source_retrieved_at?: string | null
        }
        Update: {
          adapter_version?: string | null
          analysis_id?: string
          availability?: string
          cache_metadata?: Json
          collection_key?: string | null
          contract_version?: number
          cost_metadata?: Json | null
          created_at?: string
          dataset_release_id?: string | null
          dataset_version?: string | null
          effective_from?: string | null
          effective_to?: string | null
          expires_at?: string | null
          id?: string
          input_id?: string | null
          licence_metadata?: Json
          normalisation_version?: string | null
          normalised_data?: Json | null
          observed_at?: string | null
          payload_sha256?: string | null
          permitted_raw_reference?: string | null
          provider_metadata?: Json
          quality_metadata?: Json
          request_sha256?: string | null
          retrieved_at?: string
          source?: string
          source_retrieved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_snapshots_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_snapshots_input_fk"
            columns: ["analysis_id", "input_id"]
            isOneToOne: false
            referencedRelation: "analysis_inputs"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      economic_models: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          input_id: string
          inputs: Json
          missing_inputs: string[]
          model_version: string
          outputs: Json | null
          scenario_assumptions: Json
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          input_id: string
          inputs: Json
          missing_inputs?: string[]
          model_version: string
          outputs?: Json | null
          scenario_assumptions?: Json
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          input_id?: string
          inputs?: Json
          missing_inputs?: string[]
          model_version?: string
          outputs?: Json | null
          scenario_assumptions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "economic_models_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_models_analysis_id_input_id_fkey"
            columns: ["analysis_id", "input_id"]
            isOneToOne: false
            referencedRelation: "analysis_inputs"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          analysis_id: string
          claim: string
          classification: Database["public"]["Enums"]["evidence_classification"]
          created_at: string
          derivation: Json | null
          envelope: Json | null
          geographic_scope: Json | null
          id: string
          input_id: string | null
          knowledge: Database["public"]["Enums"]["knowledge_status"]
          limitations: string | null
          observed_at: string | null
          snapshot_id: string | null
          source_reference: string | null
          units: string | null
          value: Json | null
        }
        Insert: {
          analysis_id: string
          claim: string
          classification: Database["public"]["Enums"]["evidence_classification"]
          created_at?: string
          derivation?: Json | null
          envelope?: Json | null
          geographic_scope?: Json | null
          id?: string
          input_id?: string | null
          knowledge?: Database["public"]["Enums"]["knowledge_status"]
          limitations?: string | null
          observed_at?: string | null
          snapshot_id?: string | null
          source_reference?: string | null
          units?: string | null
          value?: Json | null
        }
        Update: {
          analysis_id?: string
          claim?: string
          classification?: Database["public"]["Enums"]["evidence_classification"]
          created_at?: string
          derivation?: Json | null
          envelope?: Json | null
          geographic_scope?: Json | null
          id?: string
          input_id?: string | null
          knowledge?: Database["public"]["Enums"]["knowledge_status"]
          limitations?: string | null
          observed_at?: string | null
          snapshot_id?: string | null
          source_reference?: string | null
          units?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_items_analysis_id_input_id_fkey"
            columns: ["analysis_id", "input_id"]
            isOneToOne: false
            referencedRelation: "analysis_inputs"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "evidence_items_analysis_id_snapshot_id_fkey"
            columns: ["analysis_id", "snapshot_id"]
            isOneToOne: false
            referencedRelation: "data_snapshots"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      guest_account_claims: {
        Row: {
          analysis_id: string
          auth_target_id: string | null
          auth_verified_at: string | null
          browser_sha256: string
          capability_sha256: string
          completed_at: string | null
          created_at: string
          email_sha256: string | null
          expires_at: string
          guest_id: string
          id: string
          method: string | null
          report_id: string
          state: string
          target_id: string | null
        }
        Insert: {
          analysis_id: string
          auth_target_id?: string | null
          auth_verified_at?: string | null
          browser_sha256: string
          capability_sha256: string
          completed_at?: string | null
          created_at?: string
          email_sha256?: string | null
          expires_at?: string
          guest_id: string
          id: string
          method?: string | null
          report_id: string
          state?: string
          target_id?: string | null
        }
        Update: {
          analysis_id?: string
          auth_target_id?: string | null
          auth_verified_at?: string | null
          browser_sha256?: string
          capability_sha256?: string
          completed_at?: string | null
          created_at?: string
          email_sha256?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          method?: string | null
          report_id?: string
          state?: string
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_account_claims_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_account_claims_analysis_id_report_id_fkey"
            columns: ["analysis_id", "report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "guest_account_claims_auth_target_id_fkey"
            columns: ["auth_target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_account_claims_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_account_claims_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          observed_at: string
          outcome: string
          payment_id: string
          reversal_state: string
          test_mode: boolean
        }
        Insert: {
          event_type: string
          id: string
          observed_at?: string
          outcome: string
          payment_id: string
          reversal_state: string
          test_mode: boolean
        }
        Update: {
          event_type?: string
          id?: string
          observed_at?: string
          outcome?: string
          payment_id?: string
          reversal_state?: string
          test_mode?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          access_state: string
          amount_minor: number
          analysis_id: string
          attempt_parameters: Json | null
          checkout_reference: string | null
          created_at: string
          currency: string
          expired_at: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          owner_id: string | null
          payment_reference: string | null
          payment_version: number | null
          price_reference: string
          product_type: string | null
          provider: string
          report_id: string | null
          reversal_state: string
          revision: number
          status: string
          test_mode: boolean | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          access_state?: string
          amount_minor: number
          analysis_id: string
          attempt_parameters?: Json | null
          checkout_reference?: string | null
          created_at?: string
          currency: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          owner_id?: string | null
          payment_reference?: string | null
          payment_version?: number | null
          price_reference: string
          product_type?: string | null
          provider: string
          report_id?: string | null
          reversal_state?: string
          revision?: number
          status?: string
          test_mode?: boolean | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          access_state?: string
          amount_minor?: number
          analysis_id?: string
          attempt_parameters?: Json | null
          checkout_reference?: string | null
          created_at?: string
          currency?: string
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          owner_id?: string | null
          payment_reference?: string | null
          payment_version?: number | null
          price_reference?: string
          product_type?: string | null
          provider?: string
          report_id?: string | null
          reversal_state?: string
          revision?: number
          status?: string
          test_mode?: boolean | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_report_binding"
            columns: ["analysis_id", "report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "payments_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_exports: {
        Row: {
          analysis_id: string
          created_at: string
          expires_at: string | null
          id: string
          private_storage_path: string | null
          report_id: string
          status: string
          updated_at: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          private_storage_path?: string | null
          report_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          private_storage_path?: string | null
          report_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_exports_analysis_id_report_id_fkey"
            columns: ["analysis_id", "report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      premises_events: {
        Row: {
          analysis_id: string
          business_category: string | null
          business_name: string | null
          confidence: number | null
          created_at: string
          estimated_end: string | null
          estimated_start: string | null
          evidence_id: string | null
          evidence_quality: Json | null
          id: string
          knowledge: Database["public"]["Enums"]["knowledge_status"]
          property_id: string | null
          source: string | null
          vacancy_signal: string | null
        }
        Insert: {
          analysis_id: string
          business_category?: string | null
          business_name?: string | null
          confidence?: number | null
          created_at?: string
          estimated_end?: string | null
          estimated_start?: string | null
          evidence_id?: string | null
          evidence_quality?: Json | null
          id?: string
          knowledge?: Database["public"]["Enums"]["knowledge_status"]
          property_id?: string | null
          source?: string | null
          vacancy_signal?: string | null
        }
        Update: {
          analysis_id?: string
          business_category?: string | null
          business_name?: string | null
          confidence?: number | null
          created_at?: string
          estimated_end?: string | null
          estimated_start?: string | null
          evidence_id?: string | null
          evidence_quality?: Json | null
          id?: string
          knowledge?: Database["public"]["Enums"]["knowledge_status"]
          property_id?: string | null
          source?: string | null
          vacancy_signal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premises_events_analysis_id_evidence_id_fkey"
            columns: ["analysis_id", "evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "premises_events_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_components: Json
          address_provider: string | null
          address_resolution_state: string
          coordinate_precision: string
          coordinate_source: string | null
          country: string | null
          created_at: string
          external_place_id: string | null
          formatted_address: string
          id: string
          latitude: number | null
          longitude: number | null
          post_town: string | null
          postcode: string | null
          provider_address_id: string | null
          resolution_status: Database["public"]["Enums"]["knowledge_status"]
          resolved_at: string | null
          udprn: string | null
          updated_at: string
          uprn: string | null
        }
        Insert: {
          address_components?: Json
          address_provider?: string | null
          address_resolution_state?: string
          coordinate_precision?: string
          coordinate_source?: string | null
          country?: string | null
          created_at?: string
          external_place_id?: string | null
          formatted_address: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          post_town?: string | null
          postcode?: string | null
          provider_address_id?: string | null
          resolution_status?: Database["public"]["Enums"]["knowledge_status"]
          resolved_at?: string | null
          udprn?: string | null
          updated_at?: string
          uprn?: string | null
        }
        Update: {
          address_components?: Json
          address_provider?: string | null
          address_resolution_state?: string
          coordinate_precision?: string
          coordinate_source?: string | null
          country?: string | null
          created_at?: string
          external_place_id?: string | null
          formatted_address?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          post_town?: string | null
          postcode?: string | null
          provider_address_id?: string | null
          resolution_status?: Database["public"]["Enums"]["knowledge_status"]
          resolved_at?: string | null
          udprn?: string | null
          updated_at?: string
          uprn?: string | null
        }
        Relationships: []
      }
      report_sections: {
        Row: {
          analysis_id: string
          claim_evidence: Json
          created_at: string
          id: string
          position: number
          report_id: string
          section_key: string
          structured_content: Json
        }
        Insert: {
          analysis_id: string
          claim_evidence?: Json
          created_at?: string
          id?: string
          position: number
          report_id: string
          section_key: string
          structured_content: Json
        }
        Update: {
          analysis_id?: string
          claim_evidence?: Json
          created_at?: string
          id?: string
          position?: number
          report_id?: string
          section_key?: string
          structured_content?: Json
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_analysis_id_report_id_fkey"
            columns: ["analysis_id", "report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      reports: {
        Row: {
          analysis_id: string
          created_at: string
          economic_model_id: string | null
          free_projection: Json | null
          id: string
          input_id: string
          provenance: Json
          schema_version: number
          status: string
          tier: string
          updated_at: string
          version: number
        }
        Insert: {
          analysis_id: string
          created_at?: string
          economic_model_id?: string | null
          free_projection?: Json | null
          id?: string
          input_id: string
          provenance?: Json
          schema_version: number
          status?: string
          tier: string
          updated_at?: string
          version: number
        }
        Update: {
          analysis_id?: string
          created_at?: string
          economic_model_id?: string | null
          free_projection?: Json | null
          id?: string
          input_id?: string
          provenance?: Json
          schema_version?: number
          status?: string
          tier?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_economic_model_id_fkey"
            columns: ["analysis_id", "economic_model_id"]
            isOneToOne: false
            referencedRelation: "economic_models"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "reports_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_analysis_id_input_id_fkey"
            columns: ["analysis_id", "input_id"]
            isOneToOne: false
            referencedRelation: "analysis_inputs"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
      system_events: {
        Row: {
          analysis_id: string | null
          correlation_id: string | null
          event_type: string
          id: string
          occurred_at: string
          outcome: string | null
          payment_id: string | null
          report_id: string | null
          safe_metadata: Json
        }
        Insert: {
          analysis_id?: string | null
          correlation_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          outcome?: string | null
          payment_id?: string | null
          report_id?: string | null
          safe_metadata?: Json
        }
        Update: {
          analysis_id?: string | null
          correlation_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          outcome?: string | null
          payment_id?: string | null
          report_id?: string | null
          safe_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_events_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_events_analysis_id_payment_id_fkey"
            columns: ["analysis_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["analysis_id", "id"]
          },
          {
            foreignKeyName: "system_events_analysis_id_report_id_fkey"
            columns: ["analysis_id", "report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["analysis_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_sitefit_census_release: {
        Args: { p_expected_rows: number; p_release_id: string }
        Returns: Json
      }
      activate_sitefit_constraint_release: {
        Args: { p_release_id: string }
        Returns: Json
      }
      activate_sitefit_native_release: {
        Args: { p_release_id: string }
        Returns: Json
      }
      activate_sitefit_os_release: {
        Args: { p_release_id: string }
        Returns: Json
      }
      activate_sitefit_places_release: {
        Args: { p_release_id: string }
        Returns: Json
      }
      activate_sitefit_release: {
        Args: { p_expected_rows: number; p_release_id: string }
        Returns: Json
      }
      activate_sitefit_station_release: {
        Args: { p_release_id: string }
        Returns: Json
      }
      append_sitefit_snapshot: {
        Args: {
          p_analysis_id: string
          p_collection_key: string
          p_input_id: string
          p_request_sha256: string
          p_result: Json
        }
        Returns: {
          adapter_version: string | null
          analysis_id: string
          availability: string
          cache_metadata: Json
          collection_key: string | null
          contract_version: number
          cost_metadata: Json | null
          created_at: string
          dataset_release_id: string | null
          dataset_version: string | null
          effective_from: string | null
          effective_to: string | null
          expires_at: string | null
          id: string
          input_id: string | null
          licence_metadata: Json
          normalisation_version: string | null
          normalised_data: Json | null
          observed_at: string | null
          payload_sha256: string | null
          permitted_raw_reference: string | null
          provider_metadata: Json
          quality_metadata: Json
          request_sha256: string | null
          retrieved_at: string
          source: string
          source_retrieved_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "data_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bind_sitefit_checkout: {
        Args: { p_id: string; p_session: string }
        Returns: undefined
      }
      cancel_sitefit_claim: {
        Args: {
          p_browser: string
          p_capability: string
          p_guest: string
          p_id: string
        }
        Returns: undefined
      }
      complete_sitefit_claim: {
        Args: {
          p_browser: string
          p_capability: string
          p_id: string
          p_target: string
        }
        Returns: string
      }
      confirm_sitefit_payment: {
        Args: {
          p_event: string
          p_id: string
          p_intent: string
          p_outcome: string
          p_reversal: string
          p_revision: number
          p_session: string
          p_type: string
        }
        Returns: boolean
      }
      finalise_sitefit_free: {
        Args: {
          p_analysis: string
          p_evidence: Json
          p_input: string
          p_owner: string
          p_projection: Json
          p_provenance: Json
          p_sections: Json
        }
        Returns: string
      }
      import_sitefit_census_profiles: {
        Args: {
          p_geography_release_id: string
          p_release_id: string
          p_rows: Json
        }
        Returns: number
      }
      import_sitefit_constraints: {
        Args: { p_release_id: string; p_rows: Json }
        Returns: number
      }
      import_sitefit_geographies: {
        Args: { p_release_id: string; p_rows: Json }
        Returns: number
      }
      import_sitefit_native_memberships: {
        Args: { p_release_id: string; p_rows: Json }
        Returns: number
      }
      import_sitefit_native_statistics: {
        Args: { p_release_id: string; p_rows: Json }
        Returns: number
      }
      import_sitefit_os_chunk: {
        Args: { p_hex: string; p_ordinal: number; p_release_id: string }
        Returns: number
      }
      import_sitefit_place_tile: {
        Args: { p_hex: string; p_ordinal: number; p_release_id: string }
        Returns: number
      }
      import_sitefit_station_activity: {
        Args: { p_release_id: string; p_rows: Json }
        Returns: number
      }
      import_sitefit_statistics: {
        Args: {
          p_geography_release_id: string
          p_release_id: string
          p_rows: Json
        }
        Returns: number
      }
      list_sitefit_free: { Args: never; Returns: Json }
      list_sitefit_history: { Args: { p_offset?: number }; Returns: Json }
      lookup_sitefit_census_profile: {
        Args: {
          p_code: string
          p_geography_release_id: string
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_constraints: {
        Args: {
          p_geography_release_id: string
          p_latitude: number
          p_longitude: number
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_geography: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_precision: string
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_native_statistic: {
        Args: {
          p_code: string
          p_geography_release_id: string
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_os_uprn: {
        Args: {
          p_geography_release_id: string
          p_release_id: string
          p_uprn: string
        }
        Returns: Json
      }
      lookup_sitefit_place_tiles: {
        Args: {
          p_geography_release_id: string
          p_geometry: Json
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_places: {
        Args: {
          p_geography_release_id: string
          p_geometry: Json
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_population: {
        Args: {
          p_code: string
          p_geography_release_id: string
          p_release_id: string
        }
        Returns: Json
      }
      lookup_sitefit_residential_comparison: {
        Args: {
          p_code: string
          p_geography_release: string
          p_population_release: string
        }
        Returns: Json
      }
      lookup_sitefit_station_activity: {
        Args: {
          p_day_type: string
          p_release_id: string
          p_station_asc: string
        }
        Returns: Json
      }
      measure_sitefit_catchment: {
        Args: {
          p_bres_release_id: string
          p_census_release_id: string
          p_geography_release_id: string
          p_geometry: Json
          p_income_release_id: string
          p_native_release_id: string
        }
        Returns: Json
      }
      nearby_sitefit_geographies: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_radius_metres: number
          p_release_id: string
        }
        Returns: Json
      }
      prepare_sitefit_claim: {
        Args: {
          p_browser: string
          p_capability: string
          p_guest: string
          p_id: string
          p_report: string
        }
        Returns: {
          analysis_id: string
          auth_target_id: string | null
          auth_verified_at: string | null
          browser_sha256: string
          capability_sha256: string
          completed_at: string | null
          created_at: string
          email_sha256: string | null
          expires_at: string
          guest_id: string
          id: string
          method: string | null
          report_id: string
          state: string
          target_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guest_account_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_sitefit_enriched_input: {
        Args: {
          p_analysis_id: string
          p_context: Json
          p_enrichment: Json
          p_user_supplied: Json
        }
        Returns: {
          analysis_id: string
          context_schema_version: number | null
          created_at: string
          id: string
          resolved_context: Json | null
          schema_version: number
          user_supplied: Json
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "analysis_inputs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_sitefit_input: {
        Args: { p_analysis_id: string; p_context: Json; p_user_supplied: Json }
        Returns: {
          analysis_id: string
          context_schema_version: number | null
          created_at: string
          id: string
          resolved_context: Json | null
          schema_version: number
          user_supplied: Json
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "analysis_inputs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_sitefit_payment: {
        Args: {
          p_expiry: string
          p_id: string
          p_owner: string
          p_parameters: Json
          p_price: string
          p_report: string
        }
        Returns: {
          access_state: string
          amount_minor: number
          analysis_id: string
          attempt_parameters: Json | null
          checkout_reference: string | null
          created_at: string
          currency: string
          expired_at: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          owner_id: string | null
          payment_reference: string | null
          payment_version: number | null
          price_reference: string
          product_type: string | null
          provider: string
          report_id: string | null
          reversal_state: string
          revision: number
          status: string
          test_mode: boolean | null
          updated_at: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      read_sitefit_free: { Args: { p_report: string }; Returns: Json }
      read_sitefit_purchase: { Args: { p_report: string }; Returns: Json }
      resolve_sitefit_property: {
        Args: { address: Json }
        Returns: {
          address_components: Json
          address_provider: string | null
          address_resolution_state: string
          coordinate_precision: string
          coordinate_source: string | null
          country: string | null
          created_at: string
          external_place_id: string | null
          formatted_address: string
          id: string
          latitude: number | null
          longitude: number | null
          post_town: string | null
          postcode: string | null
          provider_address_id: string | null
          resolution_status: Database["public"]["Enums"]["knowledge_status"]
          resolved_at: string | null
          udprn: string | null
          updated_at: string
          uprn: string | null
        }
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_sitefit_analysis_releases: { Args: never; Returns: Json }
      sitefit_access_owner: { Args: { p_original: string }; Returns: string }
      sitefit_assert_collectable: {
        Args: { p_analysis_id: string }
        Returns: {
          business_category: Database["public"]["Enums"]["business_category"]
          business_type: string
          created_at: string
          failure_code: string | null
          id: string
          owner_id: string
          property_id: string | null
          schema_version: number
          status: Database["public"]["Enums"]["analysis_status"]
          submission_nonce: string | null
          submission_sha256: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "analyses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sitefit_free_frozen: { Args: { p_analysis_id: string }; Returns: boolean }
      sitefit_owner_is: { Args: { p_original: string }; Returns: boolean }
      sitefit_permanent_account: { Args: { p_owner: string }; Returns: boolean }
      sitefit_session_available: { Args: never; Returns: boolean }
      stage_sitefit_release: { Args: { p_manifest: Json }; Returns: Json }
      start_sitefit_claim_auth: {
        Args: {
          p_browser: string
          p_capability: string
          p_email_hash: string
          p_guest: string
          p_id: string
          p_method: string
        }
        Returns: {
          analysis_id: string
          auth_target_id: string | null
          auth_verified_at: string | null
          browser_sha256: string
          capability_sha256: string
          completed_at: string | null
          created_at: string
          email_sha256: string | null
          expires_at: string
          guest_id: string
          id: string
          method: string | null
          report_id: string
          state: string
          target_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guest_account_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_sitefit_analysis: {
        Args: {
          p_business: string
          p_nonce: string
          p_owner: string
          p_property: string
          p_sha256: string
        }
        Returns: {
          business_category: Database["public"]["Enums"]["business_category"]
          business_type: string
          created_at: string
          failure_code: string | null
          id: string
          owner_id: string
          property_id: string | null
          schema_version: number
          status: Database["public"]["Enums"]["analysis_status"]
          submission_nonce: string | null
          submission_sha256: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "analyses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_sitefit_claim_auth: {
        Args: {
          p_browser: string
          p_capability: string
          p_id: string
          p_method: string
          p_target: string
        }
        Returns: undefined
      }
    }
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
        | "failed"
      blog_status: "draft" | "scheduled" | "published" | "archived"
      business_category: "coffee-shop" | "restaurant" | "hair-beauty-salon"
      evidence_classification:
        | "measured_data"
        | "official_public_data"
        | "commercial_data"
        | "modelled_estimate"
        | "ai_inference"
        | "user_supplied_information"
      knowledge_status: "known" | "estimated" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  source_data: {
    Tables: {
      area_statistics: {
        Row: {
          effective_at: string
          geography_code: string
          geography_release_id: string
          geography_type: string
          measure_code: string
          population_universe: string
          quality_metadata: Json
          release_id: string
          unit: string
          value: number | null
        }
        Insert: {
          effective_at: string
          geography_code: string
          geography_release_id: string
          geography_type?: string
          measure_code: string
          population_universe: string
          quality_metadata: Json
          release_id: string
          unit: string
          value?: number | null
        }
        Update: {
          effective_at?: string
          geography_code?: string
          geography_release_id?: string
          geography_type?: string
          measure_code?: string
          population_universe?: string
          quality_metadata?: Json
          release_id?: string
          unit?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "area_statistics_geography_release_id_fkey"
            columns: ["geography_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_statistics_geography_release_id_geography_type_geogra_fkey"
            columns: [
              "geography_release_id",
              "geography_type",
              "geography_code",
            ]
            isOneToOne: false
            referencedRelation: "geography_features"
            referencedColumns: [
              "release_id",
              "geography_type",
              "geography_code",
            ]
          },
          {
            foreignKeyName: "area_statistics_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      census_profiles: {
        Row: {
          geography_code: string
          geography_release_id: string
          geography_type: string
          missing_reasons: string[]
          profile_schema_version: number
          release_id: string
          values_data: number[]
        }
        Insert: {
          geography_code: string
          geography_release_id: string
          geography_type?: string
          missing_reasons: string[]
          profile_schema_version?: number
          release_id: string
          values_data: number[]
        }
        Update: {
          geography_code?: string
          geography_release_id?: string
          geography_type?: string
          missing_reasons?: string[]
          profile_schema_version?: number
          release_id?: string
          values_data?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "census_profiles_geography_release_id_fkey"
            columns: ["geography_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "census_profiles_geography_release_id_geography_type_geogra_fkey"
            columns: [
              "geography_release_id",
              "geography_type",
              "geography_code",
            ]
            isOneToOne: false
            referencedRelation: "geography_features"
            referencedColumns: [
              "release_id",
              "geography_type",
              "geography_code",
            ]
          },
          {
            foreignKeyName: "census_profiles_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      constraint_features: {
        Row: {
          entity: number
          geometry: unknown
          profile: Json
          release_id: string
        }
        Insert: {
          entity: number
          geometry: unknown
          profile: Json
          release_id: string
        }
        Update: {
          entity?: number
          geometry?: unknown
          profile?: Json
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constraint_features_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_releases: {
        Row: {
          dataset_id: string
          effective_from: string | null
          effective_to: string | null
          id: string
          imported_at: string
          licence_metadata: Json
          manifest: Json
          provider_id: string
          retrieved_at: string
          row_count: number
          schema_version: number
          sha256: string
          source_published_at: string | null
          source_url: string
          state: string
          subset_id: string
          supersedes_release_id: string | null
          version: string
        }
        Insert: {
          dataset_id: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          imported_at?: string
          licence_metadata: Json
          manifest: Json
          provider_id: string
          retrieved_at: string
          row_count?: number
          schema_version: number
          sha256: string
          source_published_at?: string | null
          source_url: string
          state?: string
          subset_id: string
          supersedes_release_id?: string | null
          version: string
        }
        Update: {
          dataset_id?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          imported_at?: string
          licence_metadata?: Json
          manifest?: Json
          provider_id?: string
          retrieved_at?: string
          row_count?: number
          schema_version?: number
          sha256?: string
          source_published_at?: string | null
          source_url?: string
          state?: string
          subset_id?: string
          supersedes_release_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_releases_supersedes_release_id_fkey"
            columns: ["supersedes_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_features: {
        Row: {
          geography_code: string
          geography_type: string
          geometry: unknown
          name: string
          parent_code: string | null
          properties: Json
          release_id: string
          source_reference: string
        }
        Insert: {
          geography_code: string
          geography_type: string
          geometry: unknown
          name: string
          parent_code?: string | null
          properties?: Json
          release_id: string
          source_reference: string
        }
        Update: {
          geography_code?: string
          geography_type?: string
          geometry?: unknown
          name?: string
          parent_code?: string | null
          properties?: Json
          release_id?: string
          source_reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "geography_features_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      native_memberships: {
        Row: {
          lad22_code: string
          lsoa_code: string
          msoa_code: string
          oa_code: string
          oa_release_id: string
          oa_type: string
          release_id: string
        }
        Insert: {
          lad22_code: string
          lsoa_code: string
          msoa_code: string
          oa_code: string
          oa_release_id: string
          oa_type?: string
          release_id: string
        }
        Update: {
          lad22_code?: string
          lsoa_code?: string
          msoa_code?: string
          oa_code?: string
          oa_release_id?: string
          oa_type?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "native_memberships_oa_release_id_fkey"
            columns: ["oa_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "native_memberships_oa_release_id_oa_type_oa_code_fkey"
            columns: ["oa_release_id", "oa_type", "oa_code"]
            isOneToOne: false
            referencedRelation: "geography_features"
            referencedColumns: [
              "release_id",
              "geography_type",
              "geography_code",
            ]
          },
          {
            foreignKeyName: "native_memberships_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      native_statistics: {
        Row: {
          geography_code: string
          geography_release_id: string
          geography_type: string
          profile: Json
          release_id: string
        }
        Insert: {
          geography_code: string
          geography_release_id: string
          geography_type: string
          profile: Json
          release_id: string
        }
        Update: {
          geography_code?: string
          geography_release_id?: string
          geography_type?: string
          profile?: Json
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "native_statistics_geography_release_id_fkey"
            columns: ["geography_release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "native_statistics_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      os_uprn_chunks: {
        Row: {
          first_uprn: number
          last_uprn: number
          ordinal: number
          records: string
          release_id: string
          rows_count: number
          sha256: string
        }
        Insert: {
          first_uprn: number
          last_uprn: number
          ordinal: number
          records: string
          release_id: string
          rows_count: number
          sha256: string
        }
        Update: {
          first_uprn?: number
          last_uprn?: number
          ordinal?: number
          records?: string
          release_id?: string
          rows_count?: number
          sha256?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_uprn_chunks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      place_tiles: {
        Row: {
          boundary: unknown
          ordinal: number
          records: string
          release_id: string
          row_count: number
          sha256: string
          tile_x: number
          tile_y: number
        }
        Insert: {
          boundary: unknown
          ordinal: number
          records: string
          release_id: string
          row_count: number
          sha256: string
          tile_x: number
          tile_y: number
        }
        Update: {
          boundary?: unknown
          ordinal?: number
          records?: string
          release_id?: string
          row_count?: number
          sha256?: string
          tile_x?: number
          tile_y?: number
        }
        Relationships: [
          {
            foreignKeyName: "place_tiles_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      station_activity: {
        Row: {
          day_type: string
          measure: string
          profile: Json
          release_id: string
          station_asc: string
        }
        Insert: {
          day_type: string
          measure: string
          profile: Json
          release_id: string
          station_asc: string
        }
        Update: {
          day_type?: string
          measure?: string
          profile?: Json
          release_id?: string
          station_asc?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_activity_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "dataset_releases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      address_component_identity: { Args: { v: string }; Returns: string }
      check_constraint_release: {
        Args: { p_release_id: string }
        Returns: number
      }
      check_enrichment_input: {
        Args: { c: Json; p_property: string }
        Returns: undefined
      }
      check_native_release: { Args: { p_id: string }; Returns: number }
      check_place_release: { Args: { p_id: string }; Returns: number }
      check_station_release: { Args: { p_id: string }; Returns: number }
      checked_enrichment_polygon: {
        Args: { p_geometry: Json }
        Returns: unknown
      }
      lookup_os_record: {
        Args: { p_release_id: string; p_uprn: string }
        Returns: Json
      }
      os_i32: { Args: { b: string; o: number }; Returns: number }
      os_u64: { Args: { b: string; o: number }; Returns: number }
      valid_constraint_native_date: { Args: { v: Json }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
  source_data: {
    Enums: {},
  },
} as const
