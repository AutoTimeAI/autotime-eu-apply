export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";
export type RelocationWillingness = "yes" | "no" | "depends";
export type SourceSurface = "web" | "extension";
export type ApplicationStatus =
  | "Saved"
  | "Checking fit"
  | "Ready to apply"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Archived";
export type ApplicationOutcomeReason =
  | "Unknown"
  | "Interview secured"
  | "Offer or final stage"
  | "No response"
  | "Sponsorship blocker"
  | "Work-right blocker"
  | "Skill mismatch"
  | "Location mismatch"
  | "Role closed";
export type CountryFitDecision =
  | "Apply now"
  | "Stretch application"
  | "Skip for now"
  | "Improve profile first";
export type ContentGenerationGate = "ready" | "stretch" | "blocked";
export type EvidenceRecordStatus = "found" | "missing" | "risk" | "limit";
export type EvidenceSourceType =
  | "profile"
  | "cv"
  | "job_text"
  | "user_answer"
  | "official_source"
  | "system_rule";
export type SyncEntityType =
  | "profile"
  | "profile_revision"
  | "reusable_answers"
  | "application"
  | "evidence_record"
  | "outcome_record"
  | "interview_prep_pack";
export type SyncAction = "created" | "updated" | "deleted";
export type OperationalLogLevel = "severe" | "warn" | "info";
export type AccountAiTone = "concise" | "coaching" | "detailed";

export type Database = {
  public: {
    Tables: {
      job_listings: {
        Row: { id: string; title: string; company: string; location: string | null; url: string; posted_date: string | null; source: string; ats_platform: string; description_raw: string | null; dedup_hash: string; identity_hash: string; esco_occupation_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; title: string; company: string; location?: string | null; url: string; posted_date?: string | null; source: string; ats_platform?: string; description_raw?: string | null; dedup_hash: string; identity_hash: string; esco_occupation_id?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["job_listings"]["Insert"]>;
        Relationships: [];
      };
      outreach_messages: {
        Row: { id: string; user_id: string; job_id: string; recruiter_name: string | null; recruiter_role: string | null; recruiter_email: string | null; contact_type: "recruiter"|"hiring_manager"|"peer_target_role"; channel: "linkedin_note" | "linkedin_inmail" | "email"; draft_subject: string | null; draft_body: string; status: "drafted" | "sent" | "replied" | "no_response"; sent_at: string | null; follow_up_due: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; job_id: string; recruiter_name?: string | null; recruiter_role?: string | null; recruiter_email?: string | null; contact_type?: "recruiter"|"hiring_manager"|"peer_target_role"; channel: "linkedin_note" | "linkedin_inmail" | "email"; draft_subject?: string | null; draft_body: string; status?: "drafted" | "sent" | "replied" | "no_response"; sent_at?: string | null; follow_up_due?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["outreach_messages"]["Insert"]>;
        Relationships: [];
      };
      cover_letters: {
        Row: { id:string; user_id:string; job_id:string|null; company_name:string; job_title:string; version:number; content:string; created_at:string; updated_at:string };
        Insert: { id?:string; user_id:string; job_id?:string|null; company_name:string; job_title:string; version:number; content:string; created_at?:string; updated_at?:string };
        Update: Partial<Database["public"]["Tables"]["cover_letters"]["Insert"]>;
        Relationships: [];
      };
      esco_skills: {
        Row: { id: string; preferred_label: string; alt_labels: string[]; skill_type: string|null; language: string; embedding: string|null };
        Insert: { id: string; preferred_label: string; alt_labels?: string[]; skill_type?: string|null; language?: string; embedding?: string|null };
        Update: Partial<Database["public"]["Tables"]["esco_skills"]["Insert"]>; Relationships: [];
      };
      esco_occupations: {
        Row: { id: string; preferred_label: string; isco_group: string|null; description: string|null; language: string; embedding: string|null };
        Insert: { id: string; preferred_label: string; isco_group?: string|null; description?: string|null; language?: string; embedding?: string|null };
        Update: Partial<Database["public"]["Tables"]["esco_occupations"]["Insert"]>; Relationships: [];
      };
      esco_occupation_skills: {
        Row: { occupation_id: string; skill_id: string; relation_type: "essential"|"optional" };
        Insert: { occupation_id: string; skill_id: string; relation_type: "essential"|"optional" };
        Update: Partial<Database["public"]["Tables"]["esco_occupation_skills"]["Insert"]>; Relationships: [];
      };
      user_skill_profile: {
        Row: { user_id: string; esco_skill_id: string; confidence: number; source: "stated"|"inferred"|"confirmed"; updated_at: string };
        Insert: { user_id: string; esco_skill_id: string; confidence: number; source: "stated"|"inferred"|"confirmed"; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_skill_profile"]["Insert"]>; Relationships: [];
      };
      esco_questionnaire_answers: {
        Row: { id: string; user_id: string; question: string; answer: string; sequence: number; next_question: string|null; created_at: string };
        Insert: { id?: string; user_id: string; question: string; answer: string; sequence: number; next_question?: string|null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["esco_questionnaire_answers"]["Insert"]>; Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          photo_url: string | null;
          country_current: string | null;
          countries_target: string[];
          onboarding_step: number;
          onboarding_completed_at: string | null;
          work_authorisation_category: "eu_eea_swiss_citizen" | "existing_permission" | "sponsorship_required" | "country_specific" | "unsure" | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          current_country: string;
          current_city: string | null;
          target_countries: string;
          target_roles: string;
          work_right_details: string;
          sponsorship_needed: boolean;
          relocation_willingness: RelocationWillingness;
          salary_expectation: string | null;
          notice_period: string | null;
          base_cv_text: string;
          project_summaries: string | null;
          experience_highlights: string | null;
          source_surface: SourceSurface;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          country_current?: string | null;
          countries_target?: string[];
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          work_authorisation_category?: "eu_eea_swiss_citizen" | "existing_permission" | "sponsorship_required" | "country_specific" | "unsure" | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          current_country: string;
          current_city?: string | null;
          target_countries: string;
          target_roles: string;
          work_right_details: string;
          sponsorship_needed?: boolean;
          relocation_willingness?: RelocationWillingness;
          salary_expectation?: string | null;
          notice_period?: string | null;
          base_cv_text: string;
          project_summaries?: string | null;
          experience_highlights?: string | null;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          country_current?: string | null;
          countries_target?: string[];
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          work_authorisation_category?: "eu_eea_swiss_citizen" | "existing_permission" | "sponsorship_required" | "country_specific" | "unsure" | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          current_country?: string;
          current_city?: string | null;
          target_countries?: string;
          target_roles?: string;
          work_right_details?: string;
          sponsorship_needed?: boolean;
          relocation_willingness?: RelocationWillingness;
          salary_expectation?: string | null;
          notice_period?: string | null;
          base_cv_text?: string;
          project_summaries?: string | null;
          experience_highlights?: string | null;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mobility_profiles: {
        Row: {
          user_id: string;
          profile: Json;
          schema_version: number;
          consent_version: number;
          consent_granted_at: string;
          sync_enabled: boolean;
          migrated_from_legacy_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          profile: Json;
          schema_version?: number;
          consent_version: number;
          consent_granted_at: string;
          sync_enabled?: boolean;
          migrated_from_legacy_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          profile?: Json;
          schema_version?: number;
          consent_version?: number;
          consent_granted_at?: string;
          sync_enabled?: boolean;
          migrated_from_legacy_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_accounts: {
        Row: {
          user_id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          last_sign_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_settings: {
        Row: {
          user_id: string;
          default_region: string;
          ai_tone: AccountAiTone;
          notifications_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_region?: string;
          ai_tone?: AccountAiTone;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          default_region?: string;
          ai_tone?: AccountAiTone;
          notifications_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      extension_connections: {
        Row: {
          id: string;
          user_id: string;
          extension_id: string | null;
          browser_label: string | null;
          last_connected_at: string;
          last_synced_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          extension_id?: string | null;
          browser_label?: string | null;
          last_connected_at?: string;
          last_synced_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          extension_id?: string | null;
          browser_label?: string | null;
          last_connected_at?: string;
          last_synced_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: SubscriptionPlan;
          status: SubscriptionStatus;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: SubscriptionPlan;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          id: string;
          user_id: string;
          feature: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          cost_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          feature: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          cost_usd: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          feature?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_usd?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_rate_limits: {
        Row: {
          rate_limit_key: string;
          request_count: number;
          reset_at: string;
          updated_at: string;
        };
        Insert: {
          rate_limit_key: string;
          request_count?: number;
          reset_at: string;
          updated_at?: string;
        };
        Update: {
          rate_limit_key?: string;
          request_count?: number;
          reset_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reusable_answers: {
        Row: {
          user_id: string;
          sponsorship_answer: string;
          relocation_answer: string;
          work_authorisation_answer: string;
          notice_period_answer: string;
          salary_expectation_answer: string;
          motivation_answer: string;
          strengths_answer: string;
          availability_answer: string;
          source_surface: SourceSurface;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sponsorship_answer?: string;
          relocation_answer?: string;
          work_authorisation_answer?: string;
          notice_period_answer?: string;
          salary_expectation_answer?: string;
          motivation_answer?: string;
          strengths_answer?: string;
          availability_answer?: string;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          sponsorship_answer?: string;
          relocation_answer?: string;
          work_authorisation_answer?: string;
          notice_period_answer?: string;
          salary_expectation_answer?: string;
          motivation_answer?: string;
          strengths_answer?: string;
          availability_answer?: string;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string;
          url_key: string;
          company: string | null;
          role_title: string | null;
          source: string | null;
          ats_platform: string;
          status: ApplicationStatus;
          next_action: string | null;
          next_action_date: string | null;
          notes: string | null;
          outcome_reason: ApplicationOutcomeReason;
          fit_score: number | null;
          fit_decision: CountryFitDecision | null;
          content_gate: ContentGenerationGate | null;
          content_snapshot: Json | null;
          job_snapshot: Json | null;
          source_surface: SourceSurface;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          url?: string;
          url_key: string;
          company?: string | null;
          role_title?: string | null;
          source?: string | null;
          ats_platform?: string;
          status?: ApplicationStatus;
          next_action?: string | null;
          next_action_date?: string | null;
          notes?: string | null;
          outcome_reason?: ApplicationOutcomeReason;
          fit_score?: number | null;
          fit_decision?: CountryFitDecision | null;
          content_gate?: ContentGenerationGate | null;
          content_snapshot?: Json | null;
          job_snapshot?: Json | null;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          url?: string;
          url_key?: string;
          company?: string | null;
          role_title?: string | null;
          source?: string | null;
          ats_platform?: string;
          status?: ApplicationStatus;
          next_action?: string | null;
          next_action_date?: string | null;
          notes?: string | null;
          outcome_reason?: ApplicationOutcomeReason;
          fit_score?: number | null;
          fit_decision?: CountryFitDecision | null;
          content_gate?: ContentGenerationGate | null;
          content_snapshot?: Json | null;
          job_snapshot?: Json | null;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deleted_application_tombstones: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          url_key: string;
          deleted_at: string;
          source_surface: SourceSurface;
          reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          url_key: string;
          deleted_at?: string;
          source_surface?: SourceSurface;
          reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string | null;
          url_key?: string;
          deleted_at?: string;
          source_surface?: SourceSurface;
          reason?: string | null;
        };
        Relationships: [];
      };
      evidence_records: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          job_url: string | null;
          check_key: string;
          check_label: string;
          status: EvidenceRecordStatus;
          evidence_text: string;
          source_type: EvidenceSourceType;
          source_label: string;
          missing_input: string | null;
          risk_flag: string | null;
          explanation: string;
          limit_text: string;
          schema_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          job_url?: string | null;
          check_key: string;
          check_label: string;
          status: EvidenceRecordStatus;
          evidence_text: string;
          source_type: EvidenceSourceType;
          source_label: string;
          missing_input?: string | null;
          risk_flag?: string | null;
          explanation: string;
          limit_text: string;
          schema_version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string | null;
          job_url?: string | null;
          check_key?: string;
          check_label?: string;
          status?: EvidenceRecordStatus;
          evidence_text?: string;
          source_type?: EvidenceSourceType;
          source_label?: string;
          missing_input?: string | null;
          risk_flag?: string | null;
          explanation?: string;
          limit_text?: string;
          schema_version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      outcome_records: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          role_title: string;
          company: string | null;
          country: string | null;
          source: string | null;
          status: ApplicationStatus;
          outcome_reason: ApplicationOutcomeReason;
          decision_index_at_save: number | null;
          decision_label_at_save: CountryFitDecision | null;
          content_gate_at_save: ContentGenerationGate | null;
          applied_at: string | null;
          interview_at: string | null;
          closed_at: string | null;
          notes: string | null;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          role_title: string;
          company?: string | null;
          country?: string | null;
          source?: string | null;
          status: ApplicationStatus;
          outcome_reason: ApplicationOutcomeReason;
          decision_index_at_save?: number | null;
          decision_label_at_save?: CountryFitDecision | null;
          content_gate_at_save?: ContentGenerationGate | null;
          applied_at?: string | null;
          interview_at?: string | null;
          closed_at?: string | null;
          notes?: string | null;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          role_title?: string;
          company?: string | null;
          country?: string | null;
          source?: string | null;
          status?: ApplicationStatus;
          outcome_reason?: ApplicationOutcomeReason;
          decision_index_at_save?: number | null;
          decision_label_at_save?: CountryFitDecision | null;
          content_gate_at_save?: ContentGenerationGate | null;
          applied_at?: string | null;
          interview_at?: string | null;
          closed_at?: string | null;
          notes?: string | null;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_prep_packs: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          role_summary: string;
          positioning_statement: string;
          fit_and_gap_recap: string;
          likely_questions: string[];
          star_answer_prompts: string[];
          project_talking_points: string[];
          skills_to_revise: string[];
          questions_to_ask_employer: string[];
          final_prep_checklist: string[];
          source_surface: SourceSurface;
          schema_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          role_summary: string;
          positioning_statement: string;
          fit_and_gap_recap: string;
          likely_questions?: string[];
          star_answer_prompts?: string[];
          project_talking_points?: string[];
          skills_to_revise?: string[];
          questions_to_ask_employer?: string[];
          final_prep_checklist?: string[];
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string;
          role_summary?: string;
          positioning_statement?: string;
          fit_and_gap_recap?: string;
          likely_questions?: string[];
          star_answer_prompts?: string[];
          project_talking_points?: string[];
          skills_to_revise?: string[];
          questions_to_ask_employer?: string[];
          final_prep_checklist?: string[];
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_events: {
        Row: {
          id: string;
          user_id: string;
          entity_type: SyncEntityType;
          entity_id: string;
          source_surface: SourceSurface;
          action: SyncAction;
          message: string;
          schema_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entity_type: SyncEntityType;
          entity_id: string;
          source_surface: SourceSurface;
          action: SyncAction;
          message?: string;
          schema_version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entity_type?: SyncEntityType;
          entity_id?: string;
          source_surface?: SourceSurface;
          action?: SyncAction;
          message?: string;
          schema_version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_revisions: {
        Row: {
          id: string;
          profile_id: string;
          user_id: string;
          revision_number: number;
          changed_fields: string[];
          reason: string;
          snapshot: Json;
          source_surface: SourceSurface;
          schema_version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          user_id: string;
          revision_number: number;
          changed_fields?: string[];
          reason?: string;
          snapshot: Json;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          user_id?: string;
          revision_number?: number;
          changed_fields?: string[];
          reason?: string;
          snapshot?: Json;
          source_surface?: SourceSurface;
          schema_version?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      operational_logs: {
        Row: {
          id: string;
          level: OperationalLogLevel;
          area: string;
          code: string;
          message: string;
          diagnostic_id: string | null;
          user_id: string | null;
          request_method: string | null;
          request_path: string | null;
          http_status: number | null;
          metadata: Json;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          level: OperationalLogLevel;
          area: string;
          code: string;
          message: string;
          diagnostic_id?: string | null;
          user_id?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          http_status?: number | null;
          metadata?: Json;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          level?: OperationalLogLevel;
          area?: string;
          code?: string;
          message?: string;
          diagnostic_id?: string | null;
          user_id?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          http_status?: number | null;
          metadata?: Json;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_memberships: {
        Row: {
          user_id: string;
          role: "owner" | "admin" | "support" | "analyst";
          status: "active" | "suspended";
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          user_id: string;
          role: "owner" | "admin" | "support" | "analyst";
          status?: "active" | "suspended";
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          role?: "owner" | "admin" | "support" | "analyst";
          status?: "active" | "suspended";
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      admin_audit_events: {
        Row: {
          id: string;
          actor_user_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      beta_access: {
        Row: {
          user_id: string;
          status: "pending" | "active" | "suspended";
          suspension_reason: string | null;
          approved_at: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          user_id: string;
          status?: "pending" | "active" | "suspended";
          suspension_reason?: string | null;
          approved_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          status?: "pending" | "active" | "suspended";
          suspension_reason?: string | null;
          approved_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      beta_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          category: string;
          rating: number | null;
          message: string;
          product_area: string;
          route: string | null;
          status: "New" | "Reviewing" | "Planned" | "Resolved" | "Closed";
          internal_notes: string | null;
          technical_context: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category: string;
          rating?: number | null;
          message: string;
          product_area: string;
          route?: string | null;
          status?: "New" | "Reviewing" | "Planned" | "Resolved" | "Closed";
          internal_notes?: string | null;
          technical_context?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "New" | "Reviewing" | "Planned" | "Resolved" | "Closed";
          internal_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          environment: "development" | "preview" | "production";
          version: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          enabled?: boolean;
          environment: "development" | "preview" | "production";
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          version?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      market_refresh_requests: {
        Row: {
          id: string;
          idempotency_key: string;
          provider: string;
          country: string | null;
          status: "requested" | "running" | "succeeded" | "failed";
          requested_by: string;
          failure_reason: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          idempotency_key: string;
          provider: string;
          country?: string | null;
          status?: "requested" | "running" | "succeeded" | "failed";
          requested_by: string;
          failure_reason?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: "requested" | "running" | "succeeded" | "failed";
          failure_reason?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      workflow_operational_events: {
        Row: {
          id: string;
          user_id: string;
          event:
            | "job_saved"
            | "job_analysed"
            | "application_prepared"
            | "application_submitted";
          transition_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event:
            | "job_saved"
            | "job_analysed"
            | "application_prepared"
            | "application_submitted";
          transition_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_esco_jobs: {
        Args: { p_user_id: string; p_limit?: number };
        Returns: Array<{ job_id:string; title:string; company:string; location:string|null; matched_skills:number; total_essential_skills:number; matched_skill_labels:string[]; missing_skill_labels:string[]; overlap:number|null }>;
      };
      classify_job_listings_esco: { Args: { p_limit?: number }; Returns: number };
      admin_change_beta_access: {
        Args: {
          p_actor_user_id: string;
          p_reason: string;
          p_status: string;
          p_target_user_id: string;
        };
        Returns: Array<{ user_id: string; status: string; updated_at: string }>;
      };
      admin_update_feature_flag: {
        Args: {
          p_actor_user_id: string;
          p_enabled: boolean;
          p_environment: string;
          p_expected_version: number;
          p_key: string;
        };
        Returns: Array<{
          outcome: string;
          key: string;
          environment: string;
          enabled: boolean;
          version: number;
          updated_at: string;
        }>;
      };
      admin_request_market_refresh: {
        Args: { p_actor_user_id: string; p_idempotency_key: string };
        Returns: Array<{
          outcome: string;
          id: string | null;
          status: string | null;
          created_at: string | null;
        }>;
      };
      record_workflow_operational_event: {
        Args: { p_event: string; p_transition_id: string; p_user_id: string };
        Returns: Array<{
          outcome: string;
          event_id: string | null;
          created_at: string | null;
        }>;
      };
      get_monthly_ai_calls: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      increment_ai_rate_limit: {
        Args: {
          p_rate_limit_key: string;
          p_window_seconds: number;
          p_max_requests: number;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
