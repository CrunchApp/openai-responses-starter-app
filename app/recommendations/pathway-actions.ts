'use server';

import { EducationPathway, RecommendationProgram, UserProfile } from './types';
import { 
  checkUserAuthentication
  // syncProgramsToVectorStore is handled within saveProgramsForPathway now
  // saveProgramsForPathway is defined below, not imported
} from './supabase-helpers';
import { researchSpecificPrograms, ResearchProgramsResult } from '@/lib/ai/programResearchAgent'; // Import updated function and type
import { createClient } from '@/lib/supabase/server';
import { syncProgramsToVectorStore } from './vector-store-helpers'; // Import sync function
import { getMoreEvaluatedPrograms } from '@/lib/ai/planningAgent'; // Import the new function from planningAgent

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
      .select('*') // Select all needed fields, including last_pathway_response_id
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
    
    // If response contains a responseId and user is authenticated, save it to the user profile
    if (pathwaysResult.responseId && isAuthenticated && userId) {
      try {
        const supabase = await createClient();
        console.log(`Saving conversation response ID to user profile: ${pathwaysResult.responseId}`);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_pathway_response_id: pathwaysResult.responseId })
          .eq('id', userId);
        
        if (updateError) {
          console.warn(`Failed to save conversation response ID: ${updateError.message}`);
        } else {
          console.log('Successfully saved conversation response ID');
        }
      } catch (updateError) {
        console.warn('Error saving response ID:', updateError);
        // Non-critical error, continue with the rest of the function
      }
    } else if (pathwaysResult.responseId) {
      console.log(`ResponseId received but not saved (guest mode): ${pathwaysResult.responseId}`);
    } else {
      console.log('No responseId received from API');
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
  responseId?: string;
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
    
    // Return both pathways and responseId
    return {
      pathways: data.pathways,
      responseId: data.responseId
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
      qualificationType: pathway.qualification_type,
      fieldOfStudy: pathway.field_of_study,
      subfields: pathway.subfields || [],
      targetRegions: pathway.target_regions || [],
      budgetRange: pathway.budget_range_usd || { min: 0, max: 0 },
      duration: {
        min: pathway.duration_months ?? 0,
        max: pathway.duration_months ?? 0
      },
      alignment: pathway.alignment_rationale,
      alternatives: pathway.alternatives || [],
      queryString: pathway.query_string
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
 * Returns recommendations and the conversation response ID.
 */
export async function generateProgramsForPathway(
  vectorStoreId: string,
  pathwayId: string,
  userProfile: UserProfile,
  pathwayFeedback?: any
): Promise<{
  recommendations: RecommendationProgram[];
  responseId?: string; // Added responseId to return type
  error?: string;
  warning?: string;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
  rejectedPrograms?: Array<{name: string, reason: string}>;
}> {
  let recommendations: RecommendationProgram[] = [];
  let responseId: string | undefined = undefined; // Variable to hold responseId
  const startTime = Date.now(); 
  
  try {
    // ---- Initialize Supabase Client ----
    const supabase = await createClient();
    
    // Get the userId from the user profile
    const userId = userProfile.userId;
    if (!userId) {
      return {
        recommendations: [],
        error: "User ID not found in profile"
      };
    }
    
    console.log(`Generating program recommendations for pathway ${pathwayId}...`);
    
    // Check authentication status
    const { isAuthenticated, userId: authUserId } = await checkUserAuthentication();
    console.log(`Auth check result: isAuthenticated=${isAuthenticated}, userId=${authUserId}`);
    
    if (!isAuthenticated || !authUserId) {
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

    // ---- Fetch previousResponseId from pathway (if available) ----
    // Use the last_pathway_response_id from pathway data
    // Note: This is for the *pathway generation* context, 
    // We will later use the *program evaluation* responseId if available.
    const previousPathwayResponseId = pathway.last_pathway_response_id || undefined;
    if (previousPathwayResponseId) {
      console.log(`Using previous pathway response ID for initial research context: ${previousPathwayResponseId}`);
    }
    // We also need the last_recommended_programs_response_id if it exists
    const previousProgramResponseId = pathway.last_recommended_programs_response_id || undefined;
     if (previousProgramResponseId) {
       console.log(`Using previous program recommendation response ID for context: ${previousProgramResponseId}`);
     }
    // ---- End Fetch previousResponseId ----

    // ---- Call Program Research Agent Directly ----
    console.log(`Calling researchSpecificPrograms for pathway: ${pathway.title}`);
    let agentError: string | undefined = undefined;
    let agentResult: ResearchProgramsResult | undefined; // Use the updated type
    
    try {
      // Pass the program-specific response ID if available, otherwise the pathway one.
      agentResult = await researchSpecificPrograms(
        pathway, 
        userProfile, 
        pathwayFeedback,
        previousProgramResponseId || previousPathwayResponseId // Prefer program-specific context
      );
      recommendations = agentResult.recommendations; // Extract recommendations
      responseId = agentResult.responseId; // Capture the responseId from the agent result
      console.log(`Agent finished: ${recommendations.length} programs found. ResponseId: ${responseId || 'none'}`);
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
        responseId: responseId, // Return responseId even if no programs
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
          responseId: responseId, // Return responseId even on save failure
          dbSaveError: saveResult.error,
          partialSave: Boolean(saveResult.savedCount && saveResult.savedCount > 0),
          savedCount: saveResult.savedCount,
          rejectedPrograms: saveResult.rejectedPrograms
        };
      }
      
      console.log(`Successfully saved ${saveResult.savedCount} program recommendations to the database`);

      // --- Save the program responseId to the pathway ---
      if (responseId) {
        console.log(`Attempting to save program response ID ${responseId} to pathway ${pathwayId}`);
        try {
          const { error: rpcError } = await supabase.rpc(
            'update_pathway_program_response_id',
            { p_pathway_id: pathwayId, p_response_id: responseId }
          );
          if (rpcError) {
            console.warn(`Failed to save program response ID for pathway ${pathwayId}:`, rpcError.message);
            // Non-critical: Add warning to the return, but don't fail the overall operation
             return {
               recommendations: recommendations,
               responseId: responseId, // Still return the ID
               savedCount: saveResult.savedCount,
               rejectedPrograms: saveResult.rejectedPrograms,
               warning: `Programs saved, but failed to store conversation ID: ${rpcError.message}`
             };
          } else {
            console.log(`Successfully saved program response ID ${responseId} for pathway ${pathwayId}`);
          }
        } catch (rpcCatchError) {
          console.warn(`Error calling update_pathway_program_response_id RPC for pathway ${pathwayId}:`, rpcCatchError);
           return {
             recommendations: recommendations,
             responseId: responseId, // Still return the ID
             savedCount: saveResult.savedCount,
             rejectedPrograms: saveResult.rejectedPrograms,
             warning: `Programs saved, but failed to store conversation ID due to RPC error: ${rpcCatchError instanceof Error ? rpcCatchError.message : String(rpcCatchError)}`
           };
        }
      } else {
        console.log(`No program response ID received from agent for pathway ${pathwayId}, skipping update.`);
      }
      // --- End Save program responseId ---

      // Mark pathway as explored after successful save
      try {
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
        responseId: responseId, // Return the responseId
        savedCount: saveResult.savedCount,
        rejectedPrograms: saveResult.rejectedPrograms
      };
    } catch (dbError) {
      console.error('Unexpected error saving to database:', dbError);
      
      return {
        recommendations: recommendations, // Still return generated programs
        responseId: responseId, // Return responseId even on DB error
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

    // Get vector store ID from user's recommendations
    let vectorStoreId = null;
    try {
      const { data: vectorStoreData, error: vectorStoreError } = await supabase
        .from('recommendations')
        .select('vector_store_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (!vectorStoreError && vectorStoreData && vectorStoreData.length > 0) {
        vectorStoreId = vectorStoreData[0].vector_store_id;
        console.log(`Found vector store ID for user ${userId}: ${vectorStoreId}`);
      } else {
        console.log(`No vector store ID found for user ${userId}, skipping vector store cleanup`);
      }
    } catch (vectorStoreError) {
      console.error('Error fetching vector store ID:', vectorStoreError);
      // Continue with deletion even if we can't get the vector store ID
    }

    // First, get all recommendation IDs to clean up vector store files
    const { data: recommendationsToDelete, error: recFetchError } = await supabase
      .from('recommendations')
      .select('id')
      .eq('user_id', userId)
      .in('pathway_id', pathwayIdsToReset);
    
    let deletedProgramsCount = 0;
    
    if (recFetchError) {
      console.error('Error fetching recommendations to delete:', recFetchError);
      // Continue with deletion even if we can't get all recommendation IDs
    } else if (recommendationsToDelete && recommendationsToDelete.length > 0) {
      const recommendationIds = recommendationsToDelete.map(r => r.id);
      deletedProgramsCount = recommendationIds.length;
      console.log(`Found ${deletedProgramsCount} recommendations to delete for pathways.`);
      
      // First get all file IDs before deleting any records
      const fileIds: string[] = [];
      
      try {
        console.log('Getting file IDs from recommendation_files...');
        const { data: fileData, error: fileError } = await supabase
          .from('recommendation_files')
          .select('file_id')
          .in('recommendation_id', recommendationIds);
        
        if (fileError) {
          console.error('Error fetching file IDs:', fileError);
          // Continue with deletion even if we can't get file IDs
        } else {
          if (fileData && fileData.length > 0) {
            fileIds.push(...fileData.map(f => f.file_id));
            console.log(`Found ${fileIds.length} file IDs to delete from OpenAI`);
          } else {
            console.log('No files found to delete from OpenAI');
          }
        }
      } catch (fileError) {
        console.error('Error getting file IDs:', fileError);
        // Continue with deletion even if we can't get file IDs
      }
      
      // Delete vector store files if we have a vector store ID
      if (vectorStoreId && fileIds.length > 0) {
        try {
          // Use a direct API call instead of importing the function, which may not work in this context
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          // Get auth headers for the API call
          const headers = await getAuthHeaders();
          
          try {
            // First, call the delete_file endpoint for each file ID
            let successCount = 0;
            for (const fileId of fileIds) {
              try {
                console.log(`Deleting file ${fileId} from OpenAI`);
                const deleteUrl = `${baseUrl}/api/vector_stores/delete_file?file_id=${fileId}`;
                
                const response = await fetch(deleteUrl, {
                  method: 'DELETE',
                  headers: headers,
                  credentials: 'include'
                });
                
                if (response.ok) {
                  console.log(`Successfully deleted file ${fileId} from OpenAI`);
                  successCount++;
                } else {
                  console.error(`Failed to delete file ${fileId} from OpenAI: ${await response.text()}`);
                }
              } catch (fileError) {
                console.error(`Error deleting file ${fileId} from OpenAI:`, fileError);
              }
            }
            
            console.log(`Successfully deleted ${successCount}/${fileIds.length} files from OpenAI vector store`);
          } catch (cleanupError) {
            console.error('Error cleaning up vector store files:', cleanupError);
            // Continue with deletion even if we have errors here
          }
        } catch (filesError) {
          console.error('Error handling vector store file cleanup:', filesError);
          // Continue with deletion even if we have errors here
        }
      }
      
      // Now delete the recommendation_files records
      try {
        console.log('Deleting recommendation_files records...');
        const { error: fileDeleteError } = await supabase
          .from('recommendation_files')
          .delete()
          .in('recommendation_id', recommendationIds);
        
        if (fileDeleteError) {
          console.error('Error deleting recommendation_files:', fileDeleteError);
          // Continue with deletion even if we have errors here
        } else {
          console.log(`Successfully deleted recommendation_files records for ${recommendationIds.length} recommendations`);
        }
      } catch (fileDeleteError) {
        console.error('Error during recommendation_files deletion:', fileDeleteError);
        // Continue with deletion even if we have errors here
      }
      
      // Now delete the recommendations
      const { error: recDeleteError } = await supabase
        .from('recommendations')
        .delete()
        .in('id', recommendationIds);
      
      if (recDeleteError) {
        console.error('Error deleting recommendations:', recDeleteError);
        return {
          success: false,
          error: `Failed to delete recommendations: ${recDeleteError.message}`
        };
      }
      
      console.log(`Successfully deleted ${deletedProgramsCount} recommendations.`);
    }

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
  rejectedPrograms?: Array<{name: string, reason: string}>;
}> {
  try {
    const supabase = await createClient();
    
    // Track programs that fail validation or saving
    const rejectedPrograms: Array<{name: string, reason: string}> = [];
    const validatedRecommendations: RecommendationProgram[] = [];
    
    // First phase validation - validate each program individually
    for (const rec of recommendations) {
      // Check for required fields
      if (!rec.name || rec.name.trim() === '') {
        rejectedPrograms.push({
          name: rec.name || 'Unnamed Program',
          reason: 'Program name is required'
        });
        continue;
      }
      
      if (!rec.institution || rec.institution.trim() === '') {
        rejectedPrograms.push({
          name: rec.name,
          reason: 'Institution name is required'
        });
        continue;
      }
      
      // Extract scholarships and save the rest of the properties
      const { scholarships, ...programData } = rec;
      
      // Ensure requirements and highlights are arrays of strings, not JSON objects
      const requirements = Array.isArray(rec.requirements) 
        ? rec.requirements 
        : [];
        
      const highlights = Array.isArray(rec.highlights) 
        ? rec.highlights 
        : [];
      
      // Check for numeric fields
      const costPerYear = typeof rec.costPerYear === 'number' 
        ? rec.costPerYear 
        : (rec.costPerYear ? parseFloat(String(rec.costPerYear).replace(/[^\d.-]/g, '')) : null);
      
      const duration = typeof rec.duration === 'number' 
        ? rec.duration 
        : (rec.duration ? parseInt(String(rec.duration).replace(/[^\d.-]/g, ''), 10) : null);
      
      // Only validate costPerYear if it's provided
      if (costPerYear !== null && isNaN(costPerYear)) {
        rejectedPrograms.push({
          name: rec.name,
          reason: 'Cost per year must be a valid number'
        });
        continue;
      }
      
      // Only validate duration if it's provided
      if (duration !== null && isNaN(duration)) {
        rejectedPrograms.push({
          name: rec.name,
          reason: 'Duration must be a valid number'
        });
        continue;
      }
      
      // Create a validated recommendation
      const validatedRec = {
        ...programData,
        // Ensure matchScore is never null (required by DB)
        matchScore: typeof rec.matchScore === 'number' ? rec.matchScore : 70,
        // Ensure other required fields have defaults
        name: rec.name,
        institution: rec.institution,
        degreeType: rec.degreeType || 'Not Specified',
        fieldOfStudy: rec.fieldOfStudy || 'Not Specified',
        description: rec.description || 'No description available',
        costPerYear: costPerYear !== null ? costPerYear : null,
        duration: duration !== null ? duration : null,
        // Replace requirements and highlights with validated arrays
        requirements: requirements,
        highlights: highlights,
        // Include scholarships if available
        scholarships: scholarships
      };
      
      validatedRecommendations.push(validatedRec);
    }
    
    console.log(`Validated ${validatedRecommendations.length} programs out of ${recommendations.length}`);
    
    if (validatedRecommendations.length === 0) {
      return {
        success: false,
        savedCount: 0,
        error: 'No valid programs to save',
        rejectedPrograms
      };
    }
    
    // Create a formatter that matches *exactly* what the SQL function expects
    const prepareForDatabase = (program: any) => {
      // Make sure match_rationale is proper JSONB
      const matchRationale = typeof program.matchRationale === 'object' && program.matchRationale !== null
        ? program.matchRationale
        : { careerAlignment: 70, budgetFit: 70, locationMatch: 70, academicFit: 70 };
      
      // Ensure requirements is a properly-formatted array of strings
      const requirements = Array.isArray(program.requirements) 
        ? program.requirements.filter((r: any) => typeof r === 'string')
        : [];
      
      // Ensure highlights is a properly-formatted array of strings  
      const highlights = Array.isArray(program.highlights)
        ? program.highlights.filter((h: any) => typeof h === 'string')
        : [];
      
      return {
        // Basic fields - keep as is
        name: program.name,
        institution: program.institution,
        description: program.description,
        location: program.location,
        
        // Fields SQL expects in camelCase with type conversions
        degreeType: program.degreeType,
        fieldOfStudy: program.fieldOfStudy,
        costPerYear: typeof program.costPerYear === 'number' ? program.costPerYear : null,
        duration: typeof program.duration === 'number' ? program.duration : null,
        startDate: program.startDate || '',
        applicationDeadline: program.applicationDeadline || '',
        pageLink: program.pageLink || '',
        
        // Fields SQL expects in snake_case (from examining SQL function)
        match_score: typeof program.matchScore === 'number' ? program.matchScore : 70,
        match_rationale: matchRationale, // Make sure this is a valid JSONB object
        is_favorite: program.isFavorite === true,
        
        // Arrays and objects - using validated versions
        requirements: requirements,
        highlights: highlights,
        scholarships: program.scholarships || []
      };
    };
    
    // Prepare recommendations with exact SQL-expected format
    const dbReadyRecommendations = validatedRecommendations.map(prepareForDatabase);
    
    // Call the stored procedure to store the programs
    const { data, error } = await supabase.rpc(
      'store_programs_batch',
      {
        p_user_id: userId,
        p_pathway_id: pathwayId,
        p_vector_store_id: vectorStoreId,
        p_recommendations: dbReadyRecommendations // Use SQL-compatible version
      }
    );
    
    if (error) {
      console.error('Error saving programs batch via RPC:', error);
      
      // Add all valid programs as rejected if the entire batch failed
      const newlyRejected = validatedRecommendations.map(rec => ({
        name: rec.name,
        reason: `Failed to save: ${error.message}`
      }));
      
      rejectedPrograms.push(...newlyRejected);
      
      return {
        success: false,
        savedCount: 0,
        error: `Failed to save programs: ${error.message}`,
        rejectedPrograms
      };
    }
    
    // Extract results from the stored procedure (assuming it returns an array with one object)
    const result = data?.[0]; // Use optional chaining
    
    if (result?.rejected_programs && result.rejected_programs.length > 0) {
      console.log(`${result.rejected_programs.length} programs were rejected during database save:`, 
        result.rejected_programs.map((p: {name: string; reason: string}) => `${p.name}: ${p.reason}`).join('; '));
      
      // Add any rejected programs from the database to our list
      rejectedPrograms.push(...result.rejected_programs);
    }
    
    if (!result || !result.success) {
      console.error('Stored procedure store_programs_batch did not return success:', result);
      
      // Add all valid programs as rejected with the error from the result
      const newlyRejected = validatedRecommendations.map(rec => ({
        name: rec.name,
        reason: result?.error || 'Unknown error saving programs batch'
      }));
      
      // Only add programs not already in rejectedPrograms
      const existingNames = new Set(rejectedPrograms.map(p => p.name));
      const uniqueNewlyRejected = newlyRejected.filter(p => !existingNames.has(p.name));
      
      rejectedPrograms.push(...uniqueNewlyRejected);
      
      return {
        success: false,
        savedCount: result?.saved_count || 0,
        error: result?.error || 'Unknown error saving programs batch',
        rejectedPrograms
      };
    }
    
    const savedCount = result.saved_count || 0;
    console.log(`RPC saved ${savedCount} programs.`);

    // Get the saved program and recommendation IDs from the RPC result
    const savedProgramIds = result.saved_program_ids || [];
    const savedRecommendationIds = result.saved_recommendation_ids || [];

    console.log(`RPC returned ${savedProgramIds.length} program IDs and ${savedRecommendationIds.length} recommendation IDs.`);
    
    // Check if we have the expected number of IDs
    if (savedRecommendationIds.length !== savedCount || savedProgramIds.length !== savedCount) {
      console.warn(`Mismatch between saved count (${savedCount}) and returned IDs (rec: ${savedRecommendationIds.length}, prog: ${savedProgramIds.length})`);
    }

    // Create recommendations with proper IDs for vector store syncing
    const savedRecommendationsWithIds: RecommendationProgram[] = [];
    
    // Map the first savedCount items from validatedRecommendations to their database IDs
    for (let i = 0; i < Math.min(savedCount, validatedRecommendations.length, savedRecommendationIds.length); i++) {
      savedRecommendationsWithIds.push({
        ...validatedRecommendations[i],
        id: savedRecommendationIds[i],          // Use the actual recommendation ID from the DB
        program_id: savedProgramIds[i],         // Use the actual program ID from the DB
        pathway_id: pathwayId                   // Ensure pathway_id is included
      });
    }
    
    // Identify programs that were in the input but not in the saved list
    if (validatedRecommendations.length > savedRecommendationsWithIds.length) {
      // Track which programs were actually saved by creating a set of names
      const savedNames = new Set(savedRecommendationsWithIds.map(r => r.name));
      
      // For each validated program that's not in the saved list
      validatedRecommendations.forEach((rec, index) => {
        if (!savedNames.has(rec.name) && !rejectedPrograms.some(rej => rej.name === rec.name)) {
          // See if we can get a more specific reason from the database results
          let reason = 'Not included in the successfully saved list from database.';
          
          // If we have fewer recommendation IDs than expected, that might indicate an issue
          if (index < validatedRecommendations.length && 
              (savedRecommendationIds.length <= index || savedProgramIds.length <= index)) {
            reason = 'Database did not return an ID for this program. This may be due to a duplicate name/institution or other constraint violation.';
          }
          
          rejectedPrograms.push({
            name: rec.name,
            reason: reason
          });
        }
      });
    }

    // Sync the recommendations that have confirmed database IDs
    if (savedRecommendationsWithIds.length > 0) {
      try {
        console.log(`Syncing ${savedRecommendationsWithIds.length} programs with confirmed IDs to vector store ${vectorStoreId}`);
        const syncResult = await syncProgramsToVectorStore(
          userId,
          savedRecommendationsWithIds, // Pass only recommendations with valid DB IDs
          vectorStoreId
        );
        
        if (!syncResult.success) {
          console.error('Error syncing programs to vector store:', syncResult.error);
          return {
            success: true, // DB save was successful
            savedCount: savedCount,
            error: `Programs saved to database but failed to sync to vector store: ${syncResult.error}`,
            rejectedPrograms
          };
        }
        
        // Check if the number of files synced matches the number of recommendations
        if (syncResult.fileIds.length < savedRecommendationsWithIds.length) {
          console.warn(`Only synced ${syncResult.fileIds.length} files to vector store out of ${savedRecommendationsWithIds.length} recommendations`);
          return {
            success: true,
            savedCount: savedCount,
            error: `Only ${syncResult.fileIds.length} out of ${savedRecommendationsWithIds.length} programs were synced to vector store`,
            rejectedPrograms
          };
        }
        
        console.log(`Successfully synced ${syncResult.fileIds.length} programs to vector store`);
      } catch (syncError) {
        console.error('Error syncing programs to vector store:', syncError);
        return {
          success: true, // DB save was successful
          savedCount: savedCount,
          error: `Programs saved to database but failed to sync to vector store due to an error: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
          rejectedPrograms
        };
      }
    } else if (savedCount > 0) {
      console.warn(`No programs could be synced to vector store even though ${savedCount} were reported as saved`);
      return {
        success: true, // DB save was successful
        savedCount: savedCount,
        error: 'Programs saved to database but could not be synced to vector store due to missing IDs',
        rejectedPrograms
      };
    }
    
    return {
      success: true,
      savedCount: savedCount,
      rejectedPrograms: rejectedPrograms.length > 0 ? rejectedPrograms : undefined
    };
  } catch (error) {
    console.error('Error in saveProgramsForPathway:', error);
    return {
      success: false,
      savedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error saving programs',
      rejectedPrograms: recommendations.map(rec => ({
        name: rec.name || 'Unknown program',
        reason: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
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
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    if (!isAuthenticated || !userId) {
      return {
        recommendations: [],
        error: 'Authentication required to fetch programs'
      };
    }
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    // Use the get_pathway_programs function to fetch programs with scholarships
    const { data, error } = await supabase.rpc(
      'get_pathway_programs',
      { p_pathway_id: pathwayId, p_user_id: userId }
    );
    if (error) {
      return { recommendations: [], error: error.message };
    }
    // Map the result to RecommendationProgram[]
    const recommendations = (data || []).map((row: any) => ({
      id: row.recommendation_id,
      name: row.name,
      institution: row.institution,
      degreeType: row.degree_type,
      fieldOfStudy: row.field_of_study,
      description: row.description,
      costPerYear: row.cost_per_year ?? null,
      duration: row.duration ?? null,
      location: row.location,
      startDate: row.start_date,
      applicationDeadline: row.application_deadline,
      requirements: Array.isArray(row.requirements) ? row.requirements : [],
      highlights: Array.isArray(row.highlights) ? row.highlights : [],
      pageLink: row.page_link,
      matchScore: typeof row.match_score === 'number' ? row.match_score : 0,
      matchRationale: row.match_rationale && typeof row.match_rationale === 'object' ? row.match_rationale : undefined,
      isFavorite: row.is_favorite ?? false,
      // Soft-delete flag: null/undefined treated as false
      is_deleted: row.is_deleted ?? false,
      // Structured feedback from JSONB column
      feedbackData: row.feedback_data ?? {},
      feedbackNegative: row.feedback_negative ?? false,
      feedbackReason: row.feedback_data?.reason ?? null,
      feedbackSubmittedAt: row.feedback_data?.submittedAt ?? null,
      scholarships: Array.isArray(row.scholarships) ? row.scholarships : [],
      pathway_id: pathwayId,
      program_id: row.program_id,
    }));
    return { recommendations };
  } catch (error) {
    return {
      recommendations: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete pathway with feedback
 * Marks a pathway as deleted and stores the user's feedback
 */
export async function deletePathwayWithFeedbackAction(
  pathwayId: string,
  feedback?: { reason: string; details?: string }
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
  existingPathways: EducationPathway[],
  feedbackContext?: Array<{ pathwaySummary: string; feedback: object }>
): Promise<{
  pathways: EducationPathway[];
  error?: string;
  isGuest: boolean;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  const startTime = Date.now(); // Execution time tracking
  
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
      currentLocation: profileData.current_location || '',
      nationality: profileData.nationality || '',
      targetStudyLevel: profileData.target_study_level || '',
      languageProficiency: profileData.language_proficiency || [],
      linkedInProfile: profileData.linkedin_profile || undefined,
      goal: profileData.goal || undefined,
      desiredField: profileData.desired_field || undefined,
      education: profileData.education || [],
      careerGoals: profileData.career_goals ? {
        shortTerm: profileData.career_goals.shortTerm !== undefined ? profileData.career_goals.shortTerm : '',
        longTerm: profileData.career_goals.longTerm !== undefined ? profileData.career_goals.longTerm : '',
        achievements: profileData.career_goals.achievements !== undefined ? profileData.career_goals.achievements : '',
        desiredIndustry: Array.isArray(profileData.career_goals.desiredIndustry) ? profileData.career_goals.desiredIndustry : [],
        desiredRoles: Array.isArray(profileData.career_goals.desiredRoles) ? profileData.career_goals.desiredRoles : []
      } : { shortTerm: '', longTerm: '', achievements: '', desiredIndustry: [], desiredRoles: [] },
      skills: profileData.skills || [],
      preferences: profileData.preferences ? {
        preferredLocations: Array.isArray(profileData.preferences.preferredLocations) ? profileData.preferences.preferredLocations : [],
        studyMode: profileData.preferences.studyMode !== undefined ? profileData.preferences.studyMode : '',
        startDate: profileData.preferences.startDate !== undefined ? profileData.preferences.startDate : '',
        budgetRange: profileData.preferences.budgetRange || { min: 0, max: 0 },
        // Add new preference fields from DB profile data
        preferredDuration: profileData.preferences.preferredDuration || undefined,
        preferredStudyLanguage: profileData.preferences.preferredStudyLanguage || '',
        livingExpensesBudget: profileData.preferences.livingExpensesBudget || undefined,
        residencyInterest: profileData.preferences.residencyInterest !== undefined ? profileData.preferences.residencyInterest : false
      } : { 
        // Ensure default structure matches the type if preferences is null/undefined in DB
        preferredLocations: [], 
        studyMode: '', 
        startDate: '', 
        budgetRange: { min: 0, max: 0 },
        preferredDuration: undefined, 
        preferredStudyLanguage: '', 
        livingExpensesBudget: undefined, 
        residencyInterest: false 
      },
      documents: profileData.documents || { resume: null, transcripts: null, statementOfPurpose: null, otherDocuments: [] },
      vectorStoreId: vectorStoreId || undefined,
      profileFileId: profileData.profile_file_id || undefined,
    };
    
    // Get the most recent responseId from user profile or from a dedicated table
    let previousResponseId: string | undefined = undefined;
    let fetchResponseIdError: string | undefined = undefined;
    try {
      const { data: responseData, error: responseIdError } = await supabase
        .from('profiles')
        .select('last_pathway_response_id')
        .eq('id', userId)
        .single();
      
      if (responseIdError && responseIdError.code !== 'PGRST116') { // Ignore "not found"
        // Don't throw, just log and continue without ID
        console.warn('Error fetching previous response ID:', responseIdError.message);
        fetchResponseIdError = responseIdError.message;
      }
      if (responseData?.last_pathway_response_id) {
        previousResponseId = responseData.last_pathway_response_id;
        console.log(`Using previous response ID: ${previousResponseId}`);
      }
    } catch (error) {
      console.warn('Error fetching previous response ID:', error);
      fetchResponseIdError = error instanceof Error ? error.message : String(error);
      // Continue without previous response ID if there's an error
    }
    
    // Fetch deleted pathways with feedback from the database
    let combinedFeedbackContext = feedbackContext ? [...feedbackContext] : []; // Start with client-side feedback if provided
    
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
      let updateError: string | undefined = undefined;
      try {
        const { error: updateIdError } = await supabase
          .from('profiles')
          .update({ last_pathway_response_id: data.responseId })
          .eq('id', userId);
        if (updateIdError) {
          updateError = updateIdError.message;
        }
      } catch (error) {
        console.warn('Failed to save conversation response ID:', error);
        updateError = error instanceof Error ? error.message : String(error);
        // Non-critical error, continue
      }
      if (updateError) {
        console.warn('Non-critical error saving conversation response ID:', updateError);
        // Attach to dbSaveError if it exists, or create it
        if (data.error) {
          data.error += `; Failed to save conversation response ID: ${updateError}`;
        } else {
          data.error = `Failed to save conversation response ID: ${updateError}`;
        }
      }
    } else {
      console.warn('No responseId returned from API, conversation history not saved');
    }

    console.log(`More pathways generation completed in ${(Date.now() - startTime) / 1000} seconds`);
    
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
 */
export async function deleteRecommendationProgramAction(
  programId: string,
  pathwayId: string // Keep pathwayId for context, although not directly used in this version
): Promise<{
  success: boolean;
  error?: string;
  pathwayUpdated?: boolean;
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
    
    // First, try to get the recommendation record
    const { data: recommendation, error: fetchError } = await supabase
      .from('recommendations')
      .select('id, vector_store_id, pathway_id')
      .eq('id', programId)
      .eq('user_id', userId);
    
    // Handle case where no recommendation is found
    if (fetchError) {
      console.error('Error fetching recommendation:', fetchError);
      
      // If error code is PGRST116, it means no rows were found, which is fine for deletion
      if (fetchError.code === 'PGRST116') {
        console.log(`No recommendation found with ID ${programId} for user ${userId}, already deleted or doesn't exist`);
        
        // If pathwayId was provided, we can still check if that pathway needs updating
        if (pathwayId) {
          return await checkAndUpdatePathwayStatus(supabase, userId, pathwayId);
        }
        
        return {
          success: false,
          error: 'Recommendation already deleted or not found'
        };
      }
      
      return {
        success: false,
        error: fetchError.message || 'Failed to find the recommendation'
      };
    }
    
    // Handle empty results (no recommendation found)
    if (!recommendation || recommendation.length === 0) {
      console.log(`No recommendation found with ID ${programId} for user ${userId}, already deleted or doesn't exist`);
      
      // If pathwayId was provided, we can still check if that pathway needs updating
      if (pathwayId) {
        return await checkAndUpdatePathwayStatus(supabase, userId, pathwayId);
      }
      
      return {
        success: false,
        error: 'Recommendation already deleted or not found'
      };
    }
    
    // Get the first recommendation (should be only one, but we're being cautious)
    const rec = recommendation[0];
    
    // Get the pathway_id from the recommendation if not explicitly provided
    const recommendationPathwayId = rec.pathway_id || pathwayId;
    const vectorStoreId = rec.vector_store_id;
    
    // Delete from vector store first if vector_store_id is available
    if (vectorStoreId) {
      try {
        // Import the deleteRecommendationFromVectorStore function
        const { deleteRecommendationFromVectorStore } = await import('./vector-store-helpers');
        
        // Try to cleanup from vector store first
        const vectorStoreResult = await deleteRecommendationFromVectorStore(
          userId,
          rec.id, // Use rec.id instead of programId - this is the recommendation ID
          vectorStoreId
        );
        
        if (!vectorStoreResult.success) {
          console.error('Error deleting from vector store:', vectorStoreResult.error);
          // Continue with database deletion even if vector store deletion fails
        }
      } catch (vectorStoreError) {
        console.error('Error with vector store deletion:', vectorStoreError);
        // Continue with database deletion even if vector store deletion fails
      }
    }
    
    // Delete from the recommendations table
    const { error: deleteError } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', programId)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error deleting recommendation from database:', deleteError);
      return {
        success: false,
        error: deleteError.message || 'Failed to delete the recommendation from the database'
      };
    }
    
    console.log(`Successfully deleted recommendation program ${programId} for user ${userId}`);
    
    // Check if this was the last program for the pathway
    if (recommendationPathwayId) {
      return await checkAndUpdatePathwayStatus(supabase, userId, recommendationPathwayId);
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error in deleteRecommendationProgramAction:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting the recommendation'
    };
  }
}

/**
 * Helper function to check if a pathway has any programs left and update its status if needed
 */
async function checkAndUpdatePathwayStatus(
  supabase: any,
  userId: string,
  pathwayId: string
): Promise<{
  success: boolean;
  error?: string;
  pathwayUpdated?: boolean;
}> {
  let pathwayUpdated = false;
  
  const { count, error: countError } = await supabase
    .from('recommendations')
    .select('id', { count: 'exact', head: true })
    .eq('pathway_id', pathwayId)
    .eq('user_id', userId);
  
  if (countError) {
    console.error('Error counting remaining recommendations:', countError);
    return { success: true, error: 'Failed to check remaining programs' };
  } 
  
  if (count === 0) {
    // This was the last program for the pathway, reset the is_explored status
    const { error: updateError } = await supabase
      .from('education_pathways')
      .update({ 
        is_explored: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', pathwayId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error resetting pathway explored status:', updateError);
      return { 
        success: true, 
        error: 'Program deleted but failed to reset pathway status' 
      };
    } else {
      console.log(`Reset is_explored status for pathway ${pathwayId} as it now has 0 programs`);
      pathwayUpdated = true;
    }
  }
  
  return {
    success: true,
    pathwayUpdated
  };
}

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    
    // Create headers with content-type
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    // Add session token if available
    if (data?.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }
    
    return headers;
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return { "Content-Type": "application/json" };
  }
}

/**
 * Fetches more program recommendations for a pathway using conversation context.
 */
export async function getMoreProgramsForPathwayAction(
  pathwayId: string,
  userProfile: UserProfile,
  programFeedback?: any // Optional feedback on existing programs
): Promise<{
  newRecommendations: RecommendationProgram[]; // Return only the newly fetched ones
  newResponseId?: string; // The ID of the latest turn
  error?: string;
  warning?: string;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
  rejectedPrograms?: Array<{name: string, reason: string}>;
}> {
  const startTime = Date.now();
  let newRecommendations: RecommendationProgram[] = [];
  let newResponseId: string | undefined = undefined;

  try {
    // ---- Initialize Supabase Client & Auth Check ----
    const supabase = await createClient();
    const { isAuthenticated, userId } = await checkUserAuthentication();

    if (!isAuthenticated || !userId || userId !== userProfile.userId) {
      return { newRecommendations: [], error: 'Authentication failed or user mismatch' };
    }
    
    // Ensure vectorStoreId is available
    const vectorStoreId = userProfile.vectorStoreId;
     if (!vectorStoreId) {
       return { newRecommendations: [], error: 'User profile is missing vector store ID' };
     }

    console.log(`Getting more programs for pathway ${pathwayId}...`);

    // ---- Fetch Pathway Data including the last program response ID ----
    const { pathway, error: pathwayError } = await fetchPathwayData(pathwayId, userId);

    if (pathwayError || !pathway) {
      console.error(`Failed to fetch pathway data: ${pathwayError}`);
      return { newRecommendations: [], error: pathwayError || 'Could not retrieve pathway details.' };
    }

    const previousProgramResponseId = pathway.last_recommended_programs_response_id;

    if (!previousProgramResponseId) {
      console.warn(`No previous program response ID found for pathway ${pathwayId}. Cannot get more programs using context.`);
      return { 
        newRecommendations: [], 
        error: 'Cannot get more programs without previous conversation context. Try exploring the pathway again.' 
      };
    }
    console.log(`Using previous program response ID: ${previousProgramResponseId} for pathway ${pathwayId}`);

    // ---- Construct User Request for More Programs ----
    // Simple request for now, can be expanded with feedback processing
    let userRequest = "Please provide 5 more distinct programs from your research results.";
    if (programFeedback) {
      // Basic feedback incorporation (can be made more sophisticated)
      userRequest += ` Consider this feedback on previous programs: ${JSON.stringify(programFeedback)}. Prioritize programs that address these points.`;
    }
    console.log("User request for more programs:", userRequest);

    // ---- Call the new Planning Agent function ----
    try {
      const moreProgramsResult = await getMoreEvaluatedPrograms(
        previousProgramResponseId,
        pathway, // Pass full pathway object
        userProfile,
        userRequest
      );
      
      newRecommendations = moreProgramsResult.programs;
      newResponseId = moreProgramsResult.responseId; // Capture the *new* responseId
      console.log(`Agent returned ${newRecommendations.length} more programs. New responseId: ${newResponseId || 'none'}`);

    } catch (agentError) {
       console.error('Error calling getMoreEvaluatedPrograms agent:', agentError);
       return { 
         newRecommendations: [], 
         error: `Failed to get more programs: ${agentError instanceof Error ? agentError.message : 'Agent error'}` 
       };
    }

    // Handle case where no *new* programs were found
    if (newRecommendations.length === 0) {
      console.log('No additional distinct programs found for this pathway.');
      // Still update the response ID if one was generated
      if (newResponseId) {
         await updatePathwayProgramResponseId(supabase, pathwayId, newResponseId);
      }
      return {
        newRecommendations: [],
        newResponseId: newResponseId, // Return the latest ID even if no programs
        warning: 'No additional distinct programs were found matching the criteria.'
      };
    }

    // ---- Save Newly Fetched Recommendations ----
    console.log(`Saving ${newRecommendations.length} new program recommendations.`);
    try {
      const saveResult = await saveProgramsForPathway(
        userId,
        pathwayId,
        vectorStoreId,
        newRecommendations // Save only the new programs
      );

      if (!saveResult.success) {
        console.error('Failed to save new program recommendations:', saveResult.error);
        // Return new programs but indicate DB error
        return {
          newRecommendations: newRecommendations,
          newResponseId: newResponseId, // Return new ID even on save failure
          dbSaveError: saveResult.error,
          partialSave: Boolean(saveResult.savedCount && saveResult.savedCount > 0),
          savedCount: saveResult.savedCount,
          rejectedPrograms: saveResult.rejectedPrograms
        };
      }
      
      console.log(`Successfully saved ${saveResult.savedCount} new program recommendations.`);

      // --- Update the program responseId for the pathway with the NEW ID ---
      if (newResponseId) {
         await updatePathwayProgramResponseId(supabase, pathwayId, newResponseId);
      } else {
         console.warn(`No new response ID received from agent for pathway ${pathwayId} during 'get more', pathway context not updated.`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`'Get More Programs' action completed in ${executionTime}ms`);
      return {
        newRecommendations: newRecommendations, // Return only the newly fetched programs
        newResponseId: newResponseId,
        savedCount: saveResult.savedCount,
        rejectedPrograms: saveResult.rejectedPrograms
      };

    } catch (dbError) {
      console.error('Unexpected error saving new programs:', dbError);
      return {
        newRecommendations: newRecommendations,
        newResponseId: newResponseId,
        dbSaveError: dbError instanceof Error 
          ? dbError.message 
          : 'An unexpected error occurred while saving new programs'
      };
    }

  } catch (error) {
    console.error('Unexpected error in getMoreProgramsForPathwayAction:', error);
    const executionTime = Date.now() - startTime;
    console.log(`Action failed after ${executionTime}ms`);
    return {
      newRecommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected server error occurred while getting more programs'
    };
  }
}

// Helper function to call the RPC (to avoid duplicating RPC call logic)
async function updatePathwayProgramResponseId(supabase: any, pathwayId: string, responseId: string): Promise<void> {
   console.log(`Attempting to save program response ID ${responseId} to pathway ${pathwayId}`);
   try {
     const { error: rpcError } = await supabase.rpc(
       'update_pathway_program_response_id',
       { p_pathway_id: pathwayId, p_response_id: responseId }
     );
     if (rpcError) {
       console.warn(`Failed to save program response ID for pathway ${pathwayId}:`, rpcError.message);
       // Log warning but don't throw - non-critical failure
     } else {
       console.log(`Successfully saved program response ID ${responseId} for pathway ${pathwayId}`);
     }
   } catch (rpcCatchError) {
     console.warn(`Error calling update_pathway_program_response_id RPC for pathway ${pathwayId}:`, rpcCatchError);
     // Log warning but don't throw
   }
}