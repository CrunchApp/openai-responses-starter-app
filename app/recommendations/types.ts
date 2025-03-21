/**
 * Types for the recommendation engine and UI
 */

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

/**
 * Unified user profile information used throughout the application
 * This encompasses the data structure used in profile creation and recommendation generation
 */
export interface UserProfile {
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredName?: string;
  linkedInProfile?: string | null;
  
  // For UI display purposes
  goal?: string;
  desiredField?: string;
  
  // Educational background
  education: Array<{
    degreeLevel: string;
    institution: string;
    fieldOfStudy: string;
    graduationYear: string;
    gpa?: string | null;
  }>;
  
  // Career aspirations
  careerGoals: {
    shortTerm: string;
    longTerm: string;
    desiredIndustry: string[];
    desiredRoles: string[];
  };
  
  // Skills and competencies
  skills: string[];
  
  // Program preferences
  preferences: {
    preferredLocations: string[];
    studyMode: string;
    startDate: string;
    budgetRange: {
      min: number;
      max: number;
    };
  };
  
  // Documents uploaded by the user
  documents?: {
    resume?: string | null;
    transcripts?: string | null;
    statementOfPurpose?: string | null;
    otherDocuments?: string[] | null;
  };
  
  // For integration with the vector store
  vectorStoreId?: string;
} 