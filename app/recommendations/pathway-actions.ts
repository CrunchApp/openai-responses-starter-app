'use server';

import { EducationPathway, RecommendationProgram, UserProfile } from './types';
import { 
  checkUserAuthentication
  // syncProgramsToVectorStore is handled within saveProgramsForPathway now
  // saveProgramsForPathway is defined below, not imported
} from './supabase-helpers';
import { researchSpecificPrograms } from '@/lib/ai/programResearchAgent';
import { createClient } from '@/lib/supabase/server';
import { syncProgramsToVectorStore } from './vector-store-helpers'; // Import sync function

// API URL from environment variables with fallback
const API_URL = (() => {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    // In the browser, if NEXT_PUBLIC_API_URL is set to localhost,
    // but we're not on localhost, use the current hostname
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    if (configuredUrl.includes('localhost') && !window.location.host.includes('localhost')) {
      // We're in production but using localhost URL
      // Construct URL from current origin
      return window.location.origin;
    }
    
    return configuredUrl;
  }
  
  // Server-side, just use the configured URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
})();

// --- Helper function to fetch pathway data directly ---
async function fetchPathwayData(pathwayId: string, userId: string): Promise<{ pathway?: any; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Fetch the pathway data
    const { data, error } = await supabase
      .from('education_pathways')
      .select('*')
      .eq('id', pathwayId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching pathway:', error);
      // Handle specific errors like not found
      if (error.code === 'PGRST116') {
         return { error: 'Pathway not found or does not belong to the current user' };
      }
      return { error: `Failed to fetch pathway: ${error.message}` };
    }
    
    if (!data) {
      // Should be caught by PGRST116, but double check
      return { error: 'Pathway not found or does not belong to the current user' };
    }
    
    return { pathway: data };
  } catch (error) {
    console.error('Unexpected error fetching pathway:', error);
    return { 
      error: error instanceof Error 
        ? `Failed to fetch pathway: ${error.message}` 
        : 'An unexpected error occurred while fetching pathway data'
    };
  }
}
// --- End helper function ---

/**
 * Generate educational pathways based on the user's profile
 */
export async function generateEducationPathways(
  vectorStoreId: string,
  userProfile: UserProfile
): Promise<{
  pathways: EducationPathway[];
  error?: string;
  isGuest: boolean;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  try {
    console.log('Generating education pathways...');
    
    // Check authentication status
    const { isAuthenticated, userId } = await checkUserAuthentication();
    console.log(`Auth check result: isAuthenticated=${isAuthenticated}, userId=${userId}`);
    
    // Call the pathways generation API
    const pathwaysResult = await fetchPathwaysFromAPI(userProfile);
    
    if (pathwaysResult.error) {
      return {
        pathways: [],
        error: pathwaysResult.error,
        isGuest: !isAuthenticated
      };
    }
    
    if (!isAuthenticated || !userId) {
      console.log('User not authenticated, returning generated pathways without saving');
      return {
        pathways: pathwaysResult.pathways,
        isGuest: true
      };
    }
    
    // At this point, we have a logged-in user and generated pathways
    console.log(`Saving ${pathwaysResult.pathways.length} pathways for user ${userId}`);
    
    try {
      // Save the pathways to Supabase
      const savedPathways = await savePathways(userId, pathwaysResult.pathways);
      
      if (!savedPathways.success) {
        console.error('Failed to save pathways to database:', savedPathways.error);
        
        return {
          pathways: pathwaysResult.pathways,
          isGuest: false,
          dbSaveError: savedPathways.error,
          partialSave: savedPathways.savedCount > 0,
          savedCount: savedPathways.savedCount
        };
      }
      
      console.log(`Successfully saved ${savedPathways.savedCount} pathways to the database`);
      return {
        pathways: savedPathways.pathways,
        isGuest: false,
        savedCount: savedPathways.savedCount
      };
    } catch (dbError) {
      console.error('Unexpected error saving to database:', dbError);
      
      // Still return pathways but include the database error
      return {
        pathways: pathwaysResult.pathways,
        isGuest: false,
        dbSaveError: dbError instanceof Error 
          ? dbError.message 
          : 'An unexpected error occurred while saving to database'
      };
    }
  } catch (error) {
    console.error('Error generating education pathways:', error);
    return {
      pathways: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating education pathways',
      isGuest: false
    };
  }
}

/**
 * Fetch education pathways from the API
 */
async function fetchPathwaysFromAPI(
  userProfile: UserProfile
): Promise<{
  pathways: EducationPathway[];
  error?: string;
}> {
  try {
    // Input validation
    if (!userProfile) {
      throw new Error('User profile is required to generate education pathways');
    }

    // Construct the API endpoint URL
    const endpoint = `${API_URL}/api/recommendations/pathways/generate`;
    console.log(`Calling pathways API at: ${endpoint}`);

    // Call our backend API to generate pathways
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userProfile
      }),
      // Use a longer timeout as this operation can take time
      signal: AbortSignal.timeout(120000), // 120 second timeout
      cache: 'no-store',
      credentials: 'include', // Include cookies in the request to pass authentication
    });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage = `API error (${response.status}): ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        console.error('API error details:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      throw new Error(errorMessage);
    }

    // Parse the successful response
    const data = await response.json();
    
    // Check for error in the response
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.pathways || !Array.isArray(data.pathways)) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from pathways API');
    }
    
    return {
      pathways: data.pathways,
    };
  } catch (error) {
    console.error('Error fetching pathways:', error);
    
    // Return a user-friendly error message
    return {
      pathways: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating education pathways',
    };
  }
}

/**
 * Save pathways to the database
 */
async function savePathways(
  userId: string,
  pathways: any[]
): Promise<{
  success: boolean;
  pathways: EducationPathway[];
  savedCount: number;
  error?: string;
}> {
  try {
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    
    // Convert pathways to the expected format for the stored procedure
    const pathwaysArray = pathways.map(pathway => ({
      title: pathway.title,
      qualificationType: pathway.qualificationType,
      fieldOfStudy: pathway.fieldOfStudy,
      subfields: pathway.subfields || [],
      targetRegions: pathway.targetRegions || [],
      budgetRange: pathway.budgetRange || { min: 0, max: 0 },
      duration: pathway.duration || { min: 0, max: 0 },
      alignment: pathway.alignment,
      alternatives: pathway.alternatives || [],
      queryString: pathway.queryString
    }));
    
    // Call the stored procedure to create the pathways
    const { data, error } = await supabase.rpc(
      'create_education_pathways',
      {
        p_user_id: userId,
        p_pathways: pathwaysArray
      }
    );
    
    if (error) {
      console.error('Error saving pathways:', error);
      return {
        success: false,
        pathways: pathways as EducationPathway[],
        savedCount: 0,
        error: `Failed to save pathways: ${error.message}`
      };
    }
    
    // Fetch the newly created pathways with their IDs
    const { data: savedPathwaysData, error: fetchError } = await supabase.rpc(
      'get_user_pathways',
      { p_user_id: userId }
    );
    
    if (fetchError) {
      console.error('Error fetching saved pathways:', fetchError);
      return {
        success: true,
        pathways: pathways as EducationPathway[],
        savedCount: data.length || 0,
        error: `Pathways saved but failed to retrieve them: ${fetchError.message}`
      };
    }
    
    return {
      success: true,
      pathways: savedPathwaysData as EducationPathway[],
      savedCount: savedPathwaysData.length
    };
  } catch (error) {
    console.error('Unexpected error saving pathways:', error);
    return {
      success: false,
      pathways: pathways as EducationPathway[],
      savedCount: 0,
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred while saving pathways'
    };
  }
}

/**
 * Fetch education pathways for a user
 */
export async function fetchUserPathways(): Promise<{
  pathways: EducationPathway[];
  error?: string;
}> {
  try {
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        pathways: [],
        error: 'Authentication required to fetch pathways'
      };
    }
    
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    
    // Call the stored procedure to get the pathways
    const { data, error } = await supabase.rpc(
      'get_user_pathways',
      { p_user_id: userId }
    );
    
    console.log('[fetchUserPathways] RPC Result:', { data, error });
    
    if (error) {
      console.error('Error fetching pathways:', error);
      return {
        pathways: [],
        error: `Failed to fetch pathways: ${error.message}`
      };
    }
    
    console.log(`[fetchUserPathways] Returning ${data?.length || 0} pathways for user ${userId}`);
    
    return {
      pathways: data as EducationPathway[]
    };
  } catch (error) {
    console.error('Unexpected error fetching pathways:', error);
    return {
      pathways: [],
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred while fetching pathways'
    };
  }
}

/**
 * Update feedback for a pathway
 */
export async function updatePathwayFeedback(
  pathwayId: string,
  feedback: any
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        success: false,
        error: 'Authentication required to update pathway feedback'
      };
    }
    
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    
    // Call the stored procedure to update the feedback
    const { data, error } = await supabase.rpc(
      'update_pathway_feedback',
      {
        p_pathway_id: pathwayId,
        p_feedback: feedback
      }
    );
    
    if (error) {
      console.error('Error updating pathway feedback:', error);
      return {
        success: false,
        error: `Failed to update pathway feedback: ${error.message}`
      };
    }
    
    return {
      success: data as boolean
    };
  } catch (error) {
    console.error('Unexpected error updating pathway feedback:', error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred while updating pathway feedback'
    };
  }
}

/**
 * Generate specific program recommendations for a pathway
 */
export async function generateProgramsForPathway(
  vectorStoreId: string,
  pathwayId: string,
  userProfile: UserProfile,
  pathwayFeedback?: any
): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
  warning?: string;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  const startTime = Date.now(); // Keep track of execution time
  try {
    console.log(`Generating program recommendations for pathway ${pathwayId}...`);
    
    // Check authentication status (already done in exploreProgramsAction, but good practice here too)
    const { isAuthenticated, userId } = await checkUserAuthentication();
    console.log(`Auth check result: isAuthenticated=${isAuthenticated}, userId=${userId}`);
    
    if (!isAuthenticated || !userId) {
      return {
        recommendations: [],
        error: 'Authentication required to generate program recommendations'
      };
    }

    // ---- Fetch Pathway Data Directly ----
    console.log(`Fetching pathway data for ${pathwayId}`);
    const { pathway, error: pathwayError } = await fetchPathwayData(pathwayId, userId);

    if (pathwayError || !pathway) {
      console.error(`Failed to fetch pathway data: ${pathwayError}`);
      return {
        recommendations: [],
        error: pathwayError || 'Could not retrieve pathway details.'
      };
    }
    console.log(`Successfully fetched pathway: ${pathway.title}`);
    // ---- End Fetch Pathway Data ----

    // ---- Call Program Research Agent Directly ----
    console.log(`Calling researchSpecificPrograms for pathway: ${pathway.title}`);
    let recommendations: RecommendationProgram[] = [];
    let agentError: string | undefined = undefined;
    
    try {
      recommendations = await researchSpecificPrograms(pathway, userProfile, pathwayFeedback);
      console.log(`Agent finished: ${recommendations.length} programs found`);
    } catch (error) {
      console.error('Error calling researchSpecificPrograms agent:', error);
      agentError = error instanceof Error ? error.message : 'Failed to research programs.';
      // If agent fails, return error, don't proceed to save
      return {
          recommendations: [],
          error: `Program research failed: ${agentError}`
      };
    }
    // ---- End Call Program Research Agent ----

    // Handle case where no programs were generated
    if (recommendations.length === 0) {
      console.log('No program recommendations generated for this pathway');
      return {
        recommendations: [],
        warning: 'No specific programs were found matching this pathway\'s criteria.'
      };
    }
    
    // ---- Save Recommendations ----
    console.log(`Saving ${recommendations.length} program recommendations for user ${userId} and pathway ${pathwayId}`);
    
    try {
      // Save to Supabase using the existing helper
      const saveResult = await saveProgramsForPathway(
        userId,
        pathwayId,
        vectorStoreId,
        recommendations // Pass the programs generated by the agent
      );
      
      // Handle DB save failure
      if (!saveResult.success) {
        console.error('Failed to save program recommendations to database:', saveResult.error);
        
        return {
          recommendations: recommendations, // Still return the generated programs
          dbSaveError: saveResult.error,
          partialSave: Boolean(saveResult.savedCount && saveResult.savedCount > 0),
          savedCount: saveResult.savedCount
          // No warning needed here, dbSaveError is the primary issue
        };
      }
      
      console.log(`Successfully saved ${saveResult.savedCount} program recommendations to the database`);

      // Mark pathway as explored after successful save
      try {
        const supabase = await createClient();
        const { error: exploredError } = await supabase.rpc(
          'update_pathway_explored_status',
          { p_pathway_id: pathwayId, p_is_explored: true }
        );
        if (exploredError) {
          console.warn(`Failed to update explored status for pathway ${pathwayId}:`, exploredError.message);
        } else {
          console.log(`Successfully marked pathway ${pathwayId} as explored`);
        }
      } catch (rpcError) {
        console.warn(`Error calling update_pathway_explored_status RPC for pathway ${pathwayId}:`, rpcError);
      }

      // Success case
      const executionTime = Date.now() - startTime;
      console.log(`Program generation and saving completed in ${executionTime}ms`);
      return {
        recommendations: recommendations, // Return saved programs
        savedCount: saveResult.savedCount
        // No specific warning needed on full success
      };
    } catch (dbError) {
      console.error('Unexpected error saving to database:', dbError);
      
      return {
        recommendations: recommendations, // Still return generated programs
        dbSaveError: dbError instanceof Error 
          ? dbError.message 
          : 'An unexpected error occurred while saving programs to the database'
      };
    }
    // ---- End Save Recommendations ----

  } catch (error) {
    // Catch unexpected errors in the overall action
    console.error('Unexpected error in generateProgramsForPathway action:', error);
    const executionTime = Date.now() - startTime;
    console.log(`Action failed after ${executionTime}ms`);
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected server error occurred while generating program recommendations'
    };
  }
}

/**
 * Delete a pathway and optionally its associated recommendations
 */
export async function deletePathway(
  pathwayId: string,
  deleteRecommendations: boolean = true
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        success: false,
        error: 'Authentication required to delete pathway'
      };
    }
    
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    
    // Call the stored procedure to delete the pathway
    const { data, error } = await supabase.rpc(
      'delete_pathway',
      {
        p_user_id: userId,
        p_pathway_id: pathwayId,
        p_delete_recommendations: deleteRecommendations
      }
    );
    
    if (error) {
      console.error('Error deleting pathway:', error);
      return {
        success: false,
        error: `Failed to delete pathway: ${error.message}`
      };
    }
    
    // Extract results from the stored procedure
    const result = data[0];
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Unknown error deleting pathway'
      };
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Unexpected error deleting pathway:', error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred while deleting pathway'
    };
  }
}

/**
 * Reset all pathways for a user by permanently deleting them
 * This gives both the user and planning agent a completely fresh start.
 */
export async function resetPathwaysAction(): Promise<{
  success: boolean;
  error?: string;
  deletedPathwaysCount?: number;
  deletedProgramsCount?: number;
}> {
  try {
    // Check authentication status
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    const supabase = await createClient();
    
    // Find all pathway IDs for the user - include both active and deleted ones for a complete reset
    const { data: pathwaysToReset, error: fetchError } = await supabase
      .from('education_pathways')
      .select('id') // Only select id
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error fetching pathways for reset:', fetchError);
      return {
        success: false,
        error: `Failed to fetch pathways: ${fetchError.message}`
      };
    }
    
    if (!pathwaysToReset || pathwaysToReset.length === 0) {
      // No pathways to delete
      console.log(`No pathways found for user ${userId} to reset.`);
      return {
        success: true,
        deletedPathwaysCount: 0,
        deletedProgramsCount: 0
      };
    }
    
    const pathwayIdsToReset = pathwaysToReset.map(p => p.id);
    console.log(`Deleting ${pathwayIdsToReset.length} pathways for user ${userId}.`);

    // First, delete all associated recommendations to maintain referential integrity
    const { data: deletedPrograms, error: programDeleteError } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId)
      .in('pathway_id', pathwayIdsToReset)
      .select('id');
      
    if (programDeleteError) {
      console.error('Error deleting associated recommendations during reset:', programDeleteError);
      return {
        success: false,
        error: `Failed to delete associated recommendations: ${programDeleteError.message}`
      };
    }
    
    const deletedProgramsCount = deletedPrograms?.length || 0;
    console.log(`Deleted ${deletedProgramsCount} recommendations for user ${userId}.`);

    // Now permanently delete all pathways
    const { data: deletedPathways, error: pathwayDeleteError } = await supabase
      .from('education_pathways')
      .delete()
      .eq('user_id', userId)
      .in('id', pathwayIdsToReset)
      .select('id');
      
    if (pathwayDeleteError) {
      console.error('Error deleting pathways during reset:', pathwayDeleteError);
      return {
        success: false,
        error: `Failed to delete pathways: ${pathwayDeleteError.message}`
      };
    }

    // Reset the conversation history by clearing the last_pathway_response_id
    try {
      await supabase
        .from('profiles')
        .update({ last_pathway_response_id: null })
        .eq('id', userId);
      
      console.log('Reset conversation history for planning agent.');
    } catch (profileError) {
      console.warn('Failed to reset conversation history, but pathway deletion succeeded:', profileError);
      // Non-critical error, continue with success
    }

    console.log(`Successfully reset ${deletedPathways?.length || 0} pathways and ${deletedProgramsCount} recommendations for user ${userId}.`);
    return {
      success: true,
      deletedPathwaysCount: deletedPathways?.length || 0,
      deletedProgramsCount: deletedProgramsCount
    };
  } catch (error) {
    console.error('Error resetting pathways:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while resetting pathways'
    };
  }
}

/**
 * Save program recommendations for a pathway to the database
 * This function handles saving to Supabase and syncing to the vector store.
 */
async function saveProgramsForPathway(
  userId: string,
  pathwayId: string,
  vectorStoreId: string,
  recommendations: RecommendationProgram[]
): Promise<{ // Define a clear return type
  success: boolean;
  savedCount: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Validate recommendations to ensure they have required fields
    const validatedRecommendations = recommendations.map(rec => {
      // Extract scholarships and save the rest of the properties
      const { scholarships, ...programData } = rec;
      
      // Ensure requirements and highlights are arrays of strings, not JSON objects
      const requirements = Array.isArray(rec.requirements) 
        ? rec.requirements 
        : [];
        
      const highlights = Array.isArray(rec.highlights) 
        ? rec.highlights 
        : [];
      
      return {
        ...programData,
        // Ensure matchScore is never null (required by DB)
        matchScore: typeof rec.matchScore === 'number' ? rec.matchScore : 70,
        // Ensure other required fields have defaults
        name: rec.name || 'Unnamed Program',
        institution: rec.institution || 'Unknown Institution',
        degreeType: rec.degreeType || 'Not Specified',
        fieldOfStudy: rec.fieldOfStudy || 'Not Specified',
        description: rec.description || 'No description available',
        // Replace requirements and highlights with validated arrays
        requirements: requirements,
        highlights: highlights
      };
    });
    
    console.log(`Saving ${validatedRecommendations.length} validated programs to database`);
    
    // Call the stored procedure to store the programs
    const { data, error } = await supabase.rpc(
      'store_programs_batch',
      {
        p_user_id: userId,
        p_pathway_id: pathwayId,
        p_vector_store_id: vectorStoreId,
        p_recommendations: validatedRecommendations
      }
    );
    
    if (error) {
      console.error('Error saving programs batch via RPC:', error);
      return {
        success: false,
        savedCount: 0,
        error: `Failed to save programs: ${error.message}`
      };
    }
    
    // Extract results from the stored procedure (assuming it returns an array with one object)
    const result = data?.[0]; // Use optional chaining
    
    if (!result || !result.success) {
      console.error('Stored procedure store_programs_batch did not return success:', result);
      return {
        success: false,
        savedCount: result?.saved_count || 0,
        error: result?.error || 'Unknown error saving programs batch'
      };
    }
    
    const savedCount = result.saved_count || 0;
    console.log(`RPC saved ${savedCount} programs.`);

    // Save scholarships to program_scholarships table if needed
    // This assumes the stored procedure returns the saved program IDs
    if (savedCount > 0 && result.saved_program_ids && Array.isArray(result.saved_program_ids)) {
      try {
        // Find programs with scholarships and map them to program IDs
        const scholarshipsToSave = [];
        
        for (let i = 0; i < Math.min(recommendations.length, result.saved_program_ids.length); i++) {
          const programId = result.saved_program_ids[i];
          const scholarships = recommendations[i].scholarships;
          
          if (programId && scholarships && Array.isArray(scholarships) && scholarships.length > 0) {
            for (const scholarship of scholarships) {
              scholarshipsToSave.push({
                program_id: programId,
                name: scholarship.name || 'Unnamed Scholarship',
                amount: scholarship.amount || '0',
                eligibility: scholarship.eligibility || 'No eligibility criteria specified'
              });
            }
          }
        }
        
        // If we have scholarships to save, call a scholarship-specific RPC or insert directly
        if (scholarshipsToSave.length > 0) {
          console.log(`Saving ${scholarshipsToSave.length} scholarships`);
          
          // Using a separate RPC to save scholarships
          const { data: scholarshipData, error: scholarshipError } = await supabase.rpc(
            'store_program_scholarships_batch',
            {
              p_scholarships: scholarshipsToSave
            }
          );
          
          if (scholarshipError) {
            console.warn('Error saving scholarships:', scholarshipError);
            // Don't fail the entire operation, just log the warning
          }
        }
      } catch (scholarshipError) {
        console.warn('Error processing scholarships:', scholarshipError);
        // Don't fail the entire operation for scholarship errors
      }
    }

    // Sync successfully saved recommendations to vector store
    if (savedCount > 0) {
      try {
        // Ensure recommendations have pathway_id for vector store context
        const recommendationsWithContext = validatedRecommendations.map(rec => ({
          ...rec,
          pathway_id: pathwayId
        }));
        
        console.log(`Syncing ${savedCount} programs to vector store ${vectorStoreId}`);
        const syncResult = await syncProgramsToVectorStore(
          userId,
          recommendationsWithContext, // Use the enriched recommendations
          vectorStoreId
        );
        
        if (!syncResult.success) {
          console.error('Error syncing programs to vector store:', syncResult.error);
          // Return success for DB save, but include sync error
          return {
            success: true,
            savedCount: savedCount,
            error: `Programs saved to database but failed to sync to vector store: ${syncResult.error}`
          };
        }
        
        console.log(`Successfully synced ${syncResult.fileIds.length} programs to vector store`);
      } catch (syncError) {
        console.error('Unexpected error syncing programs to vector store:', syncError);
        // Return success for DB save, but include sync error
        return {
          success: true,
          savedCount: savedCount,
          error: `Programs saved to database but failed to sync to vector store: ${syncError instanceof Error ? syncError.message : 'Unknown sync error'}`
        };
      }
    }
    
    // Save the responseId for future use
    if (data.responseId) {
      try {
        console.log(`Saving conversation response ID to user profile: ${data.responseId}`);
        await supabase
          .from('profiles')
          .update({ last_pathway_response_id: data.responseId })
          .eq('id', userId);
        console.log('Successfully saved conversation response ID');
      } catch (error) {
        console.warn('Failed to save conversation response ID:', error);
        // Non-critical error, continue
      }
    } else {
      console.warn('No responseId returned from API, conversation history not saved');
    }
    
    // If everything succeeded
    return {
      success: true,
      savedCount: savedCount
    };
  } catch (error) {
    console.error('Unexpected error in saveProgramsForPathway:', error);
    return {
      success: false,
      savedCount: 0,
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred while saving programs'
    };
  }
}

// Add this function to insert program scholarships
async function createStoreScholarshipsBatchFunction() {  
  // The function above should be added to a new migration file
  console.log('Remember to create the store_program_scholarships_batch SQL function in a new migration!');
}

/**
 * Fetch program recommendations for a specific pathway
 */
export async function fetchProgramsForPathway(pathwayId: string): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
}> {
  try {
    if (!pathwayId) {
      return {
        recommendations: [],
        error: 'Pathway ID is required to fetch programs'
      };
    }

    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        recommendations: [],
        error: 'Authentication required to fetch programs'
      };
    }
    
    const supabase = await createClient();
    
    // Call the stored procedure to get recommendations for this pathway
    const { data, error } = await supabase.rpc(
      'get_pathway_programs',
      { p_pathway_id: pathwayId, p_user_id: userId }
    );
    
    if (error) {
      console.error(`Error fetching programs for pathway ${pathwayId}:`, error);
      return {
        recommendations: [],
        error: `Failed to fetch programs: ${error.message}`
      };
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No programs found for pathway ${pathwayId}`);
      return { recommendations: [] };
    }
    
    // Map from database columns to RecommendationProgram objects
    // Update to use recommendation_id instead of id
    const recommendations: RecommendationProgram[] = data.map(item => ({
      id: item.recommendation_id, // Changed from item.id to item.recommendation_id
      name: item.name,
      institution: item.institution,
      degreeType: item.degree_type,
      fieldOfStudy: item.field_of_study,
      description: item.description,
      costPerYear: item.cost_per_year,
      duration: item.duration,
      location: item.location,
      startDate: item.start_date,
      applicationDeadline: item.application_deadline,
      requirements: item.requirements,
      highlights: item.highlights,
      pageLink: item.page_link,
      matchScore: item.match_score,
      matchRationale: item.match_rationale,
      isFavorite: item.is_favorite,
      feedbackNegative: item.feedback_negative,
      feedbackReason: item.feedback_reason,
      feedbackSubmittedAt: item.feedback_submitted_at,
      scholarships: item.scholarships || [],
      pathway_id: pathwayId
    }));
    
    console.log(`Successfully fetched ${recommendations.length} programs for pathway ${pathwayId}`);
    return { recommendations };
  } catch (error) {
    console.error(`Error in fetchProgramsForPathway(${pathwayId}):`, error);
    return {
      recommendations: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Delete pathway with feedback
 * Marks a pathway as deleted and stores the user's feedback
 */
export async function deletePathwayWithFeedbackAction(
  pathwayId: string,
  feedback: { reason: string; details?: string }
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check authentication status
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    const supabase = await createClient();
    
    // Fetch the existing pathway to ensure it belongs to the user and is not already deleted
    const { data: pathway, error: fetchError } = await supabase
      .from('education_pathways')
      .select('id') // Only select id, no need for full data
      .eq('id', pathwayId)
      .eq('user_id', userId)
      .eq('is_deleted', false) // Make sure we are not deleting an already deleted pathway
      .single();
    
    if (fetchError) {
      // Handle not found specifically
      if (fetchError.code === 'PGRST116') {
        console.warn(`Pathway ${pathwayId} not found for user ${userId} or already deleted.`);
        return {
          success: false, 
          error: 'Pathway not found or already marked as deleted.'
        };
      }
      console.error('Error fetching pathway:', fetchError);
      return {
        success: false,
        error: `Failed to fetch pathway: ${fetchError.message}`
      };
    }
    
    if (!pathway) {
      // Should be caught by fetchError PGRST116, but as a fallback
      return {
        success: false,
        error: 'Pathway not found or does not belong to the current user'
      };
    }
    
    // Update the pathway to mark it as deleted and store feedback
    const { error: updateError } = await supabase
      .from('education_pathways')
      .update({
        is_deleted: true,
        user_feedback: feedback,
        updated_at: new Date().toISOString() // Explicitly set updated_at
      })
      .eq('id', pathwayId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating pathway:', updateError);
      return {
        success: false,
        error: `Failed to update pathway: ${updateError.message}`
      };
    }
    
    console.log(`Pathway ${pathwayId} marked as deleted with feedback for user ${userId}.`);
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting pathway with feedback:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting pathway'
    };
  }
}

/**
 * Fetch deleted pathways with user feedback
 */
async function fetchDeletedPathwaysWithFeedback(): Promise<{
  pathways: EducationPathway[];
  error?: string;
}> {
  try {
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        pathways: [],
        error: 'User not authenticated'
      };
    }
    
    const supabase = await createClient();
    
    // Query for deleted pathways that have user_feedback
    const { data, error } = await supabase
      .from('education_pathways')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', true)
      .not('user_feedback', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10); // Limit to recent feedback
    
    if (error) {
      console.error('Error fetching deleted pathways with feedback:', error);
      return {
        pathways: [],
        error: `Failed to fetch pathway feedback: ${error.message}`
      };
    }
    
    // Cast data to EducationPathway type
    return {
      pathways: data as EducationPathway[]
    };
  } catch (error) {
    console.error('Error in fetchDeletedPathwaysWithFeedback:', error);
    return {
      pathways: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while fetching pathway feedback'
    };
  }
}

/**
 * Generate more pathways based on user feedback and existing pathways
 */
export async function generateMorePathwaysAction(
  existingPathways: EducationPathway[], // Assuming EducationPathway type is correct
  feedbackContext: Array<{ pathwaySummary: string; feedback: object }> = [] // Assuming object type for feedback
): Promise<{
  pathways: EducationPathway[];
  error?: string;
  isGuest: boolean; // Keep isGuest for consistency, although this action requires auth
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  try {
    // Check authentication status FIRST
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      // This action should only be called by authenticated users
      console.warn("generateMorePathwaysAction called by unauthenticated user.");
      return {
        pathways: [],
        error: 'User not authenticated',
        isGuest: true // Indicate it failed due to auth
      };
    }
    
    // Fetch the user profile to pass to the pathway generation API
    const supabase = await createClient();
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*') // Select needed fields, potentially vector_store_id
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return {
        pathways: [],
        error: `Failed to fetch user profile: ${profileError.message}`,
        isGuest: false
      };
    }

    if (!profileData) {
       console.error('User profile not found for ID:', userId);
       return {
          pathways: [],
          error: 'User profile not found.',
          isGuest: false
        };
    }
    
    // Extract vector store ID from profile
    const vectorStoreId = profileData.vector_store_id;
    if (!vectorStoreId) {
       console.warn('User profile is missing vector store ID:', userId);
       // Still proceed with the call, but log the warning
    }
    
    // Prepare user profile data
    const userProfile: UserProfile = {
      firstName: profileData.first_name || '',
      lastName: profileData.last_name || '',
      email: profileData.email || '',
      phone: profileData.phone || undefined,
      preferredName: profileData.preferred_name || undefined,
      linkedInProfile: profileData.linkedin_profile || undefined,
      goal: profileData.goal || undefined,
      desiredField: profileData.desired_field || undefined,
      education: profileData.education || [], 
      careerGoals: profileData.career_goals || { shortTerm: '', longTerm: '', desiredIndustry: [], desiredRoles: [] },
      skills: profileData.skills || [],
      preferences: profileData.preferences || { preferredLocations: [], studyMode: '', startDate: '', budgetRange: { min: 0, max: 0 } },
      documents: profileData.documents || { resume: null, transcripts: null, statementOfPurpose: null, otherDocuments: [] },
      vectorStoreId: vectorStoreId || undefined,
      profileFileId: profileData.profile_file_id || undefined,
    };
    
    // Get the most recent responseId from user profile or from a dedicated table
    let previousResponseId: string | undefined = undefined;
    try {
      const { data: responseData } = await supabase
        .from('profiles')
        .select('last_pathway_response_id')
        .eq('id', userId)
        .single();
        
      if (responseData?.last_pathway_response_id) {
        previousResponseId = responseData.last_pathway_response_id;
        console.log(`Using previous response ID: ${previousResponseId}`);
      }
    } catch (error) {
      console.warn('Error fetching previous response ID:', error);
      // Continue without previous response ID if there's an error
    }
    
    // Fetch deleted pathways with feedback from the database
    let combinedFeedbackContext = [...feedbackContext]; // Start with client-side feedback
    
    // Fetch additional feedback from deleted pathways in the database
    const { pathways: deletedPathways, error: fetchError } = await fetchDeletedPathwaysWithFeedback();
    
    if (fetchError) {
      console.warn('Error fetching deleted pathways feedback:', fetchError);
      // Continue with existing feedback context
    } else if (deletedPathways.length > 0) {
      // Create feedback context from deleted pathways
      const dbFeedbackContext = deletedPathways.map(p => ({
        pathwaySummary: `${p.title} (${p.qualification_type} in ${p.field_of_study})`,
        feedback: p.user_feedback
      }));
      
      // Combine with client-side feedback context
      combinedFeedbackContext = [...combinedFeedbackContext, ...dbFeedbackContext];
      
      console.log(`Added ${dbFeedbackContext.length} feedback items from database.`);
    }
    
    // Now call the existing pathway generation endpoint with the context
    const endpoint = `${API_URL}/api/recommendations/pathways/generate`;
    console.log(`Calling pathways API at: ${endpoint} with conversation history`);
    
    // Log the feedback context and previous response ID
    console.log(`Sending ${combinedFeedbackContext?.length || 0} feedback items to the API:`, 
      combinedFeedbackContext?.length > 0 ? JSON.stringify(combinedFeedbackContext.slice(0, 2)) : 'No feedback'
    );
    console.log(`Using previousResponseId: ${previousResponseId || 'none'}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userProfile,
        existingPathways, // Pass existing pathways for context
        feedbackContext: combinedFeedbackContext, // Pass combined feedback for context
        previousResponseId // Pass the previous response ID for conversation history
      }),
      signal: AbortSignal.timeout(180000), // Longer timeout for more complex generation
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      // Handle API error
      let errorMessage = `API error (${response.status}): ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Error parsing response, use default error message
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.pathways || !Array.isArray(data.pathways)) throw new Error('Invalid response format');

    const newPathways: any[] = data.pathways;
    
    // Save the responseId for future use
    if (data.responseId) {
      try {
        await supabase
          .from('profiles')
          .update({ last_pathway_response_id: data.responseId })
          .eq('id', userId);
      } catch (error) {
        console.warn('Failed to save conversation response ID:', error);
        // Non-critical error, continue
      }
    } else {
      console.warn('No responseId returned from API, conversation history not saved');
    }

    // Save the new pathways to the database
    if (newPathways.length > 0) {
      const saveResult = await savePathways(userId, newPathways);
      if (!saveResult.success) {
        return {
          pathways: newPathways, // Return generated pathways even if save failed
          isGuest: false,
          dbSaveError: saveResult.error,
          partialSave: saveResult.savedCount > 0,
          savedCount: saveResult.savedCount
        };
      }
      return {
        pathways: saveResult.pathways, // Return saved pathways with IDs
        isGuest: false,
        savedCount: saveResult.savedCount
      };
    } else {
      return { 
        pathways: [], 
        isGuest: false,
        error: 'No new pathways were generated.' 
      };
    }
  } catch (error) {
    console.error('Error generating more education pathways:', error);
    return {
      pathways: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating more education pathways',
      isGuest: false // User must be authenticated to reach this point
    };
  }
}

/**
 * Delete a program from recommendations (mark as deleted)
 * Assumes a recommendation_programs table exists.
 */
export async function deleteRecommendationProgramAction(
  programId: string,
  pathwayId: string // Keep pathwayId for context, although not directly used in this version
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check authentication status
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    if (!isAuthenticated || !userId) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }
    
    const supabase = await createClient();
    
    // First, check if the program exists, belongs to the user, and is not already deleted
    const { data: existingProgram, error: fetchError } = await supabase
      .from('recommendation_programs')
      .select('id') // Only need ID for check
      .eq('id', programId)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();
    
    if (fetchError) {
       if (fetchError.code === 'PGRST116') {
         console.warn(`Program ${programId} not found for user ${userId} or already deleted.`);
         return { 
            success: false, 
            error: 'Program not found or already marked as deleted.' 
         };
       }
       console.error('Error fetching program:', fetchError);
       return {
         success: false,
         error: `Failed to fetch program: ${fetchError.message}`
       };
    }
    
    if (!existingProgram) {
      return {
        success: false,
        error: 'Program not found or does not belong to the current user'
      };
    }
    
    // Update the program to mark it as deleted
    const { error: updateError } = await supabase
      .from('recommendation_programs')
      .update({
        is_deleted: true,
        // pathway_id: pathwayId, // pathway_id should already be set when program was created
        updated_at: new Date().toISOString()
      })
      .eq('id', programId)
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating program:', updateError);
      return {
        success: false,
        error: `Failed to update program: ${updateError.message}`
      };
    }
    
    console.log(`Program ${programId} marked as deleted for user ${userId}.`);
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting program:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting program'
    };
  }
} 