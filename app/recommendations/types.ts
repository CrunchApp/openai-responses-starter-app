/**
 * Types for the recommendation engine and UI
 */
import { UserProfile } from "@/app/types/profile-schema";

// Re-export for convenience
export type { UserProfile };

/**
 * Represents a single educational program recommendation
 */
export interface RecommendationProgram {
  id?: string;
  name: string;
  institution: string;
  degreeType: string;
  fieldOfStudy: string;
  description: string;
  costPerYear: number | null;
  duration: number | null;
  location: string;
  startDate: string;
  applicationDeadline: string;
  requirements?: string[];
  highlights?: string[];
  pageLink?: string;
  matchScore: number;
  matchRationale?: {
    careerAlignment?: number;
    budgetFit?: number;
    locationMatch?: number;
    academicFit?: number;
  };
  isFavorite?: boolean;
  feedbackNegative?: boolean;
  feedbackReason?: string | null;
  feedbackSubmittedAt?: string | null;
  scholarships?: Scholarship[];
  pathway_id?: string; // ID of the education pathway this program belongs to
  program_id?: string; // ID of the program in the programs table
  is_deleted?: boolean; // Added for soft delete
}

// Education Pathway Types
export interface EducationPathway {
  id: string;
  title: string;
  field_of_study: string;
  subfields?: string[];
  qualification_type: string;
  description?: string;
  duration_months: number;
  budget_range_usd: {
    min: number;
    max: number;
  };
  target_regions?: string[];
  alignment_rationale: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  status?: 'draft' | 'published' | 'archived';
  learning_style_match?: string;
  programs?: EducationProgram[];
  is_explored?: boolean;
  last_explored_at?: string;
  alternatives?: string[];
  query_string?: string;
  user_feedback?: any;
  is_deleted?: boolean; // Added for soft delete
}

export interface EducationProgram {
  id: string;
  pathway_id?: string;
  title: string;
  provider: string;
  qualification_awarded: string;
  description: string;
  url?: string;
  cost_usd?: number;
  duration_months?: number;
  format?: string;
  location?: string;
  prerequisites?: string[];
  key_subjects?: string[];
  learning_outcomes?: string[];
  skills_gained?: string[];
  career_relevance?: string;
  accreditation?: string;
  reviews_summary?: string;
  created_at?: string;
  updated_at?: string;
  user_feedback?: ProgramFeedback;
  // Fields matching education_programs table
  country?: string;
  degree_type?: string;
  field_of_study?: string;
  language_requirements?: any;
  application_deadlines?: any;
  ranking?: number;
  study_mode?: string;
  start_dates?: any;
  start_date?: string;
  application_deadline?: string;
  requirements?: any;
  highlights?: any;
  match_rationale?: any;
  scholarships?: any;
}

export interface ProgramFeedback {
  interest_level?: 'high' | 'medium' | 'low';
  notes?: string;
  status?: 'interested' | 'applied' | 'enrolled' | 'completed' | 'rejected';
}

// Types for program recommendation rationales
export interface MatchRationale {
  careerAlignment: number;
  budgetFit: number;
  locationMatch: number;
  academicFit: number;
}

// Type for scholarship information
export interface Scholarship {
  name: string;
  amount: string;
  eligibility: string;
}

// Types for recommendations store interface
export interface RecommendationState {
  recommendations: RecommendationProgram[];
  isLoading: boolean;
  error: string | null;
}

// Payload types for recommendation generation
export interface GeneratePathwaysPayload {
  userProfile: UserProfile;
  previousResponseId?: string;
  existingPathways?: EducationPathway[];
  feedbackContext?: Array<{ pathwaySummary: string; feedback: object }>;
}

export interface GenerateProgramsPayload {
  userProfile: UserProfile;
  pathwayId: string;
  pathwayFeedback?: any;
} 