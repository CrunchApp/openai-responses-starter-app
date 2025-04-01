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
          page_link: string[]
          created_at: string | null
          updated_at: string | null
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
          page_link: string[]
          created_at?: string | null
          updated_at?: string | null
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
          page_link: string[]
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
        Relationships: [
          {
            foreignKeyName: "program_scholarships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          }
        ]
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          program_id: string
          match_score: number
          is_favorite: boolean | null
          match_rationale: Json
          vector_store_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          program_id: string
          match_score: number
          is_favorite?: boolean | null
          match_rationale: Json
          vector_store_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          program_id?: string
          match_score?: number
          is_favorite?: boolean | null
          match_rationale?: Json
          vector_store_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_user_recommendations: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      store_recommendation: {
        Args: {
          p_user_id: string
          p_vector_store_id: string
          p_recommendation: Json
        }
        Returns: string
      }
      toggle_recommendation_favorite: {
        Args: {
          p_user_id: string
          p_recommendation_id: string
        }
        Returns: boolean
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