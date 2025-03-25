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
  gpa: z.string().nullable().optional(),
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
  resume: z.string().nullable().optional(),
  transcripts: z.string().nullable().optional(),
  statementOfPurpose: z.string().nullable().optional(),
  otherDocuments: z.array(z.string()).nullable().optional(),
}).optional();

// Define complete unified profile schema
export const ProfileSchema = z.object({
  // Personal information
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().optional().default(""),
  preferredName: z.string().optional().default(""),
  
  // LinkedIn profile
  linkedInProfile: z.string().optional().nullable().default(""),
  
  // For UI display purposes
  goal: z.string().optional(),
  desiredField: z.string().optional(),
  
  // Education, career, and skills
  education: z.array(EducationSchema),
  careerGoals: CareerGoalsSchema,
  skills: z.array(z.string()),
  
  // Preferences and documents
  preferences: PreferencesSchema,
  documents: DocumentsSchema.optional().default({}),
  
  // Vector store ID
  vectorStoreId: z.string().optional(),
});

// Export a single unified type to be used throughout the application
export type UserProfile = z.infer<typeof ProfileSchema> & {
  userId?: string;
};