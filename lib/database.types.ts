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
      }
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
        }
        Returns: string
      },
      toggle_recommendation_favorite: {
        Args: {
          p_user_id: string
          p_recommendation_id: string
        }
        Returns: boolean
      }
    },
    Enums: {
      [_ in never]: never
    }
  }
} 