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
  id: string;
  name: string;
  institution: string;
  degreeType: string;
  fieldOfStudy: string;
  description: string;
  matchScore: number;
  costPerYear: number;
  duration: number;
  location: string;
  startDate: string;
  isFavorite?: boolean;
  applicationDeadline: string;
  requirements: string[];
  highlights: string[];
  matchRationale: {
    careerAlignment: number;
    budgetFit: number;
    locationMatch: number;
    academicFit: number;
  };
  scholarships?: {
    name: string;
    amount: string;
    eligibility: string;
  }[];
} 