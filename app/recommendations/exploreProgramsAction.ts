"use server";

import { revalidatePath } from "next/cache";
import { generateProgramsForPathway } from "./pathway-actions";
import { UserProfile } from "./types";
import { checkUserAuthentication } from "./supabase-helpers";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action to explore programs for a specific pathway
 */
export async function exploreProgramsAction(pathwayId: string) {
  try {
    // Validate the pathway ID
    if (!pathwayId) {
      return { 
        success: false, 
        error: "Missing pathway ID" 
      };
    }

    // Get authenticated user ID and check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    if (!isAuthenticated || !userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Fetch user profile using Supabase server client directly
    const supabase = await createClient();
    const { data: dbProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*') // Select all columns needed for formatting
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile in exploreProgramsAction:", profileError);
      // Handle profile not found specifically
      if (profileError.code === 'PGRST116') {
        return { success: false, error: "User profile not found. Please complete profile setup." };
      }
      return { success: false, error: "Failed to fetch user profile" };
    }

    if (!dbProfile) {
      // Should be caught by PGRST116, but double-check
      return { success: false, error: "User profile not found" };
    }

    // Check if the vector store ID exists
    if (!dbProfile.vector_store_id) {
      return { 
        success: false, 
        error: "Vector store ID not found in user profile. Please complete profile setup." 
      };
    }

    // Format the database profile into the expected UserProfile type
    const profile: UserProfile = {
      userId: dbProfile.id,
      firstName: dbProfile.first_name || '',
      lastName: dbProfile.last_name || '',
      email: dbProfile.email || '',
      phone: dbProfile.phone || '',
      preferredName: dbProfile.preferred_name || '',
      linkedInProfile: dbProfile.linkedin_profile || '',
      goal: dbProfile.goal || '',
      desiredField: dbProfile.desired_field || '',
      education: dbProfile.education || [],
      careerGoals: dbProfile.career_goals || { shortTerm: '', longTerm: '', desiredIndustry: [], desiredRoles: [] },
      skills: dbProfile.skills || [],
      preferences: dbProfile.preferences || { preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 0 } },
      documents: dbProfile.documents || {},
      vectorStoreId: dbProfile.vector_store_id as string, // Type assertion since we've verified it exists
      profileFileId: dbProfile.profile_file_id || undefined
    };

    console.log(`Exploring programs for pathway ${pathwayId} for user ${userId}`);
    
    // Since we've already checked that dbProfile.vector_store_id exists, we can safely pass it
    // Call the pathway action to generate programs
    const result = await generateProgramsForPathway(
      dbProfile.vector_store_id as string, // Using type assertion after validation
      pathwayId,
      profile,
      null // No pathway feedback for now
    );

    // Handle errors during generation or saving
    if (result.error || result.dbSaveError) {
      return {
        success: false,
        error: result.error || result.dbSaveError || "Unknown error generating or saving programs"
      };
    }

    // Revalidate the recommendations page to show updated data
    revalidatePath("/recommendations");
    
    // If we have no recommendations but no errors, it's a successful operation with no results
    if (!result.recommendations || result.recommendations.length === 0) {
      return {
        success: true,
        programs: [],
        savedCount: 0,
        warning: "No program recommendations were found for this pathway"
      };
    }

    // Ensure any scholarship data is correctly formatted before returning
    const programs = result.recommendations.map(program => {
      const { scholarships, ...rest } = program;
      
      // Ensure scholarships is a properly structured array
      const formattedScholarships = Array.isArray(scholarships) 
        ? scholarships.map(s => ({
            name: s.name || 'Unnamed Scholarship',
            amount: s.amount || '0',
            eligibility: s.eligibility || 'No eligibility criteria specified'
          }))
        : [];
      
      // Ensure requirements and highlights are arrays of strings
      const requirements = Array.isArray(program.requirements) 
        ? program.requirements 
        : [];
        
      const highlights = Array.isArray(program.highlights) 
        ? program.highlights 
        : [];
        
      return {
        ...rest,
        scholarships: formattedScholarships,
        requirements: requirements,
        highlights: highlights
      };
    });

    // Success case with programs found
    return {
      success: true,
      programs: programs,
      savedCount: result.savedCount || 0
    };
  } catch (error) {
    console.error("Error in exploreProgramsAction:", error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : "An unexpected error occurred while exploring programs"
    };
  }
} 