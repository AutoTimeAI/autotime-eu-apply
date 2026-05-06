export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionPlan = "free" | "pro"
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
export type RelocationWillingness = "yes" | "no" | "depends"
export type SourceSurface = "web" | "extension"
export type SyncEntityType = "profile" | "profile_revision"
export type SyncAction = "created" | "updated" | "deleted"

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string | null
          phone: string | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          current_country: string
          current_city: string | null
          target_countries: string
          target_roles: string
          work_right_details: string
          sponsorship_needed: boolean
          relocation_willingness: RelocationWillingness
          salary_expectation: string | null
          notice_period: string | null
          base_cv_text: string
          project_summaries: string | null
          experience_highlights: string | null
          source_surface: SourceSurface
          schema_version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          current_country: string
          current_city?: string | null
          target_countries: string
          target_roles: string
          work_right_details: string
          sponsorship_needed?: boolean
          relocation_willingness?: RelocationWillingness
          salary_expectation?: string | null
          notice_period?: string | null
          base_cv_text: string
          project_summaries?: string | null
          experience_highlights?: string | null
          source_surface?: SourceSurface
          schema_version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          current_country?: string
          current_city?: string | null
          target_countries?: string
          target_roles?: string
          work_right_details?: string
          sponsorship_needed?: boolean
          relocation_willingness?: RelocationWillingness
          salary_expectation?: string | null
          notice_period?: string | null
          base_cv_text?: string
          project_summaries?: string | null
          experience_highlights?: string | null
          source_surface?: SourceSurface
          schema_version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          plan: SubscriptionPlan
          status: SubscriptionStatus
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: SubscriptionPlan
          status?: SubscriptionStatus
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          plan?: SubscriptionPlan
          status?: SubscriptionStatus
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          id: string
          user_id: string
          feature: string
          model: string
          prompt_tokens: number
          completion_tokens: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: string
          model: string
          prompt_tokens: number
          completion_tokens: number
          cost_usd: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: string
          model?: string
          prompt_tokens?: number
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          id: string
          user_id: string
          entity_type: SyncEntityType
          entity_id: string
          source_surface: SourceSurface
          action: SyncAction
          message: string
          schema_version: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: SyncEntityType
          entity_id: string
          source_surface: SourceSurface
          action: SyncAction
          message?: string
          schema_version?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: SyncEntityType
          entity_id?: string
          source_surface?: SourceSurface
          action?: SyncAction
          message?: string
          schema_version?: number
          created_at?: string
        }
        Relationships: []
      }
      profile_revisions: {
        Row: {
          id: string
          profile_id: string
          user_id: string
          revision_number: number
          changed_fields: string[]
          reason: string
          snapshot: Json
          source_surface: SourceSurface
          schema_version: number
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          user_id: string
          revision_number: number
          changed_fields?: string[]
          reason?: string
          snapshot: Json
          source_surface?: SourceSurface
          schema_version?: number
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          user_id?: string
          revision_number?: number
          changed_fields?: string[]
          reason?: string
          snapshot?: Json
          source_surface?: SourceSurface
          schema_version?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_monthly_ai_calls: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
