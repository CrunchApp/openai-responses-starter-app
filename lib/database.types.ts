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
          linkedin_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          linkedin_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          preferred_name?: string | null
          linkedin_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      reset_tokens: {
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
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          created_at: string
          program_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          created_at?: string
          program_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          created_at?: string
          program_id?: string | null
        }
      }
      education_programs: {
        Row: {
          id: string
          name: string
          description: string
          institution: string
          level: string
          duration: string
          cost: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          institution: string
          level: string
          duration: string
          cost: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          institution?: string
          level?: string
          duration?: string
          cost?: number
          created_at?: string
        }
      }
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
      }
      user_documents: {
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
  }
} 