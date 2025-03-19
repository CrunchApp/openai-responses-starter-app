import { z } from 'zod';

// Define education schema
const EducationSchema = z.object({
  degreeLevel: z.enum([
    "High School", 
    "Associate's", 
    "Bachelor's", 
    "Master's", 
    "Doctorate", 
    "Certificate", 
    "Other",
    "" // Empty string for initial state
  ]),
  institution: z.string(),
  fieldOfStudy: z.string(),
  graduationYear: z.string(),
  gpa: z.string().nullable(),
});

// Define career goals schema
const CareerGoalsSchema = z.object({
  shortTerm: z.string(),
  longTerm: z.string(),
  desiredIndustry: z.array(z.string()),
  desiredRoles: z.array(z.string()),
});

// Define preferences schema
const PreferencesSchema = z.object({
  preferredLocations: z.array(z.string()),
  studyMode: z.string(),
  startDate: z.string(),
  budgetRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
});

// Define documents schema
const DocumentsSchema = z.object({
  resume: z.string().nullable(),
  transcripts: z.string().nullable(),
  statementOfPurpose: z.string().nullable(),
  otherDocuments: z.array(z.string()).nullable(),
});

// Define complete profile data schema
export const ProfileDataSchema = z.object({
  // Personal information
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  preferredName: z.string(),
  
  // LinkedIn profile
  linkedInProfile: z.string().optional(),
  
  // Education, career, and skills
  education: z.array(EducationSchema),
  careerGoals: CareerGoalsSchema,
  skills: z.array(z.string()),
  
  // Preferences and documents
  preferences: PreferencesSchema,
  documents: DocumentsSchema,
  
  // Vector store ID
  vectorStoreId: z.string().optional(),
});

// Export type
export type ProfileData = z.infer<typeof ProfileDataSchema>; 