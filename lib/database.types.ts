export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          preferred_name: string | null
          linkedin_profile: string | null
          current_location: string | null
          nationality: string | null
          target_study_level: string | null
          language_proficiency: Json[] | null
          goal: string | null
          desired_field: string | null
          education: Json[] | null
          career_goals: Json | null
          skills: string[] | null
          preferences: Json | null
          documents: Json | null
          vector_store_id: string | null
          profile_file_id: string | null
          created_at: string
          updated_at: string | null
          recommendations_file_id: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          linkedin_profile?: string | null
          current_location?: string | null
          nationality?: string | null
          target_study_level?: string | null
          language_proficiency?: Json[] | null
          goal?: string | null
          desired_field?: string | null
          education?: Json[] | null
          career_goals?: Json | null
          skills?: string[] | null
          preferences?: Json | null
          documents?: Json | null
          vector_store_id?: string | null
          profile_file_id?: string | null
          created_at?: string
          updated_at?: string | null
          recommendations_file_id?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          linkedin_profile?: string | null
          current_location?: string | null
          nationality?: string | null
          target_study_level?: string | null
          language_proficiency?: Json[] | null
          goal?: string | null
          desired_field?: string | null
          education?: Json[] | null
          career_goals?: Json | null
          skills?: string[] | null
          preferences?: Json | null
          documents?: Json | null
          vector_store_id?: string | null
          profile_file_id?: string | null
          created_at?: string
          updated_at?: string | null
          recommendations_file_id?: string | null
        }
      },
      recommendation_files: {
        Row: {
          id: string
          recommendation_id: string
          file_id: string
          file_name: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          recommendation_id: string
          file_id: string
          file_name: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          recommendation_id?: string
          file_id?: string
          file_name?: string
          created_at?: string | null
          updated_at?: string | null
        }
      },
      password_reset_tokens: {
        Row: {
          token: string
          user_id: string
          created_at: string
          expires_at: string
          used: boolean
        }
        Insert: {
          token: string
          user_id: string
          created_at?: string
          expires_at: string
          used?: boolean
        }
        Update: {
          token?: string
          user_id?: string
          created_at?: string
          expires_at?: string
          used?: boolean
        }
      },
      recommendations: {
        Row: {
          id: string
          user_id: string
          program_id: string
          match_score: number
          is_favorite: boolean | null
          match_rationale: Json
          vector_store_id: string | null
          created_at: string
          updated_at: string | null
          feedback_negative: boolean | null
          feedback_reason: string | null
          feedback_submitted_at: string | null
          pathway_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          program_id: string
          match_score: number
          is_favorite?: boolean | null
          match_rationale: Json
          vector_store_id?: string | null
          created_at?: string
          updated_at?: string | null
          feedback_negative?: boolean | null
          feedback_reason?: string | null
          feedback_submitted_at?: string | null
          pathway_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          program_id?: string
          match_score?: number
          is_favorite?: boolean | null
          match_rationale?: Json
          vector_store_id?: string | null
          created_at?: string
          updated_at?: string | null
          feedback_negative?: boolean | null
          feedback_reason?: string | null
          feedback_submitted_at?: string | null
          pathway_id?: string | null
        }
      },
      programs: {
        Row: {
          id: string
          name: string
          institution: string
          degree_type: string
          field_of_study: string
          description: string
          cost_per_year: number
          duration: number
          location: string
          start_date: string
          application_deadline: string
          requirements: string[]
          highlights: string[]
          page_link: string
          created_at: string | null
          updated_at: string | null
          country: string | null
          duration_months: number | null
          language_requirements: Json | null
          application_deadlines: Json | null
          ranking: number | null
          study_mode: string | null
          start_dates: Json | null
          match_rationale: Json | null
          scholarships: Json | null
        }
        Insert: {
          id?: string
          name: string
          institution: string
          degree_type: string
          field_of_study: string
          description: string
          cost_per_year: number
          duration: number
          location: string
          start_date: string
          application_deadline: string
          requirements: string[]
          highlights: string[]
          page_link: string
          created_at?: string | null
          updated_at?: string | null
          country?: string | null
          duration_months?: number | null
          language_requirements?: Json | null
          application_deadlines?: Json | null
          ranking?: number | null
          study_mode?: string | null
          start_dates?: Json | null
          match_rationale?: Json | null
          scholarships?: Json | null
        }
        Update: {
          id?: string
          name?: string
          institution?: string
          degree_type?: string
          field_of_study?: string
          description?: string
          cost_per_year?: number
          duration?: number
          location?: string
          start_date?: string
          application_deadline?: string
          requirements?: string[]
          highlights?: string[]
          page_link?: string
          created_at?: string | null
          updated_at?: string | null
          country?: string | null
          duration_months?: number | null
          language_requirements?: Json | null
          application_deadlines?: Json | null
          ranking?: number | null
          study_mode?: string | null
          start_dates?: Json | null
          match_rationale?: Json | null
          scholarships?: Json | null
        }
      },
      program_scholarships: {
        Row: {
          id: string
          program_id: string
          name: string
          amount: string
          eligibility: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          program_id: string
          name: string
          amount: string
          eligibility: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          program_id?: string
          name?: string
          amount?: string
          eligibility?: string
          created_at?: string | null
          updated_at?: string | null
        }
      },
      education_pathways: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string | null
          title: string
          qualification_type: string
          field_of_study: string
          subfields: string[] | null
          target_regions: string[] | null
          budget_range_usd: Json
          duration_months: Json
          alignment_rationale: string
          alternatives: string[] | null
          query_string: string | null
          user_feedback: Json | null
          is_explored: boolean | null
          last_explored_at: string | null
          is_deleted: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string | null
          title: string
          qualification_type: string
          field_of_study: string
          subfields?: string[] | null
          target_regions?: string[] | null
          budget_range_usd: Json
          duration_months: Json
          alignment_rationale: string
          alternatives?: string[] | null
          query_string?: string | null
          user_feedback?: Json | null
          is_explored?: boolean | null
          last_explored_at?: string | null
          is_deleted?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string | null
          title?: string
          qualification_type?: string
          field_of_study?: string
          subfields?: string[] | null
          target_regions?: string[] | null
          budget_range_usd?: Json
          duration_months?: Json
          alignment_rationale?: string
          alternatives?: string[] | null
          query_string?: string | null
          user_feedback?: Json | null
          is_explored?: boolean | null
          last_explored_at?: string | null
          is_deleted?: boolean | null
        }
      },
      education_programs: {
        Row: {
          id: string
          name: string
          description: string
          institution: string
          country: string | null
          degree_type: string
          field_of_study: string
          duration_months: number | null
          cost_per_year: number | null
          language_requirements: Json | null
          application_deadlines: Json | null
          ranking: number | null
          created_at: string
          updated_at: string | null
          study_mode: string | null
          start_dates: Json | null
          location: string | null
          start_date: string | null
          application_deadline: string | null
          requirements: Json | null
          highlights: Json | null
          match_rationale: Json | null
          scholarships: Json | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          institution: string
          country?: string | null
          degree_type: string
          field_of_study: string
          duration_months?: number | null
          cost_per_year?: number | null
          language_requirements?: Json | null
          application_deadlines?: Json | null
          ranking?: number | null
          created_at?: string
          updated_at?: string | null
          study_mode?: string | null
          start_dates?: Json | null
          location?: string | null
          start_date?: string | null
          application_deadline?: string | null
          requirements?: Json | null
          highlights?: Json | null
          match_rationale?: Json | null
          scholarships?: Json | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          institution?: string
          country?: string | null
          degree_type?: string
          field_of_study?: string
          duration_months?: number | null
          cost_per_year?: number | null
          language_requirements?: Json | null
          application_deadlines?: Json | null
          ranking?: number | null
          created_at?: string
          updated_at?: string | null
          study_mode?: string | null
          start_dates?: Json | null
          location?: string | null
          start_date?: string | null
          application_deadline?: string | null
          requirements?: Json | null
          highlights?: Json | null
          match_rationale?: Json | null
          scholarships?: Json | null
        }
      },
      chat_messages: {
        Row: {
          id: string
          user_id: string
          content: string
          is_from_user: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          is_from_user: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          is_from_user?: boolean
          created_at?: string
        }
      },
      documents: {
        Row: {
          id: string
          user_id: string
          name: string
          file_path: string
          file_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          file_path: string
          file_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          file_path?: string
          file_type?: string
          created_at?: string
        }
      },
      perplexity_query_logs: {
        Row: {
          id: string
          query_text: string
          created_at: string
        }
        Insert: {
          id?: string
          query_text: string
          created_at?: string
        }
        Update: {
          id?: string
          query_text?: string
          created_at?: string
        }
      },
      applications: {
        Row: {
          id: string
          user_id: string
          recommendation_id: string | null
          profile_file_id: string
          program_file_id: string
          planner_response_id: string | null
          status: string
          checklist: Json | null
          timeline: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_id?: string | null
          profile_file_id: string
          program_file_id: string
          planner_response_id?: string | null
          status?: string
          checklist?: Json | null
          timeline?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          recommendation_id?: string | null
          profile_file_id?: string
          program_file_id?: string
          planner_response_id?: string | null
          status?: string
          checklist?: Json | null
          timeline?: Json | null
          created_at?: string
          updated_at?: string | null
        }
      },
      application_tasks: {
        Row: {
          id: string
          application_id: string
          title: string
          description: string
          due_date: string
          status: string
          sort_order: number | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          application_id: string
          title: string
          description: string
          due_date: string
          status?: string
          sort_order?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          application_id?: string
          title?: string
          description?: string
          due_date?: string
          status?: string
          sort_order?: number | null
          created_at?: string
          updated_at?: string | null
        }
      },
    },
    Functions: {
      get_user_recommendations: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      },
      store_recommendation: {
        Args: {
          p_user_id: string
          p_vector_store_id: string
          p_recommendation: Json
          p_pathway_id: string | null
        }
        Returns: {
          success: boolean
          recommendation_id: string | null
          program_id: string | null
          error: string | null
        }[]
      },
      toggle_recommendation_favorite: {
        Args: {
          p_user_id: string
          p_recommendation_id: string
        }
        Returns: boolean
      },
      get_pathway_programs: {
        Args: {
          p_pathway_id: string
          p_user_id: string
        }
        Returns: Json
      },
      store_programs_batch: {
        Args: {
          p_user_id: string
          p_pathway_id: string
          p_vector_store_id: string
          p_programs: Json[]
        }
        Returns: {
          success: boolean
          saved_count: number
          saved_program_ids: string[] | null
          saved_recommendation_ids: string[] | null
          rejected_programs: Json[] | null
          error: string | null
        }[]
      },
      create_education_pathways: {
        Args: {
          p_user_id: string
          p_title: string
          p_qualification_type: string
          p_field_of_study: string
          p_subfields: string[] | null
          p_target_regions: string[] | null
          p_budget_range_usd: Json
          p_duration_months: Json
          p_alignment_rationale: string
          p_alternatives: string[] | null
          p_query_string: string | null
          p_user_feedback: Json | null
          p_is_explored: boolean | null
          p_last_explored_at: string | null
        }
        Returns: Json
      },
      delete_pathway: {
        Args: {
          p_pathway_id: string
          p_delete_recommendations: boolean
          p_user_id: string
        }
        Returns: Json
      },
      save_recommendation_file_server: {
        Args: {
          p_recommendation_id: string
          p_file_id: string
          p_file_name: string
        }
        Returns: string
      }
    },
    Enums: {
      [_ in never]: never
    }
  }
} 