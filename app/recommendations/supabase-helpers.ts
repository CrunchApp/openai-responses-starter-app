'use server';

import { createClient } from '@/lib/supabase/server';
import { RecommendationProgram } from './types';
import { 
  syncRecommendationsToVectorStore, 
  syncSingleRecommendationToVectorStore, 
  deleteRecommendationFromVectorStore,
  syncProgramsToVectorStore
} from './vector-store-helpers';

// Export the syncProgramsToVectorStore function for use in pathway-actions.ts
export { syncProgramsToVectorStore };

/**
 * Save a recommendation to Supabase
 */
export async function saveRecommendation(
  userId: string,
  recommendation: RecommendationProgram,
  vectorStoreId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!vectorStoreId) {
      throw new Error('Vector store ID is required');
    }

    const supabase = await createClient();
    
    // Prepare the recommendation data with fields in the expected format
    const recommendationData = {
      name: recommendation.name,
      institution: recommendation.institution,
      degreeType: recommendation.degreeType,
      fieldOfStudy: recommendation.fieldOfStudy,
      description: recommendation.description,
      costPerYear: recommendation.costPerYear,
      duration: recommendation.duration,
      location: recommendation.location,
      startDate: recommendation.startDate,
      applicationDeadline: recommendation.applicationDeadline,
      requirements: recommendation.requirements || [],
      highlights: recommendation.highlights || [],
      pageLink: recommendation.pageLink,
      pageLinks: recommendation.pageLinks || [],
      match_score: recommendation.matchScore, // Intentionally snake_case for the function
      is_favorite: recommendation.isFavorite || false, // Intentionally snake_case for the function
      match_rationale: recommendation.matchRationale, // Intentionally snake_case for the function
      scholarships: recommendation.scholarships || [],
    };
    
    console.log(`Saving recommendation for user ${userId} with vector store ID: ${vectorStoreId}`);
    
    // Call Supabase function to store the recommendation
    const { data, error } = await supabase.rpc(
      'store_recommendation',
      {
        p_user_id: userId,
        p_vector_store_id: vectorStoreId,
        p_recommendation: recommendationData
      }
    );
    
    if (error) {
      console.error('Error from store_recommendation RPC:', error);
      throw new Error(`Failed to save recommendation: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving recommendation to Supabase:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while saving the recommendation',
    };
  }
}

/**
 * Fetch all recommendations for a user from Supabase
 */
export async function fetchUserRecommendations(userId: string): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Call the Supabase function to get user recommendations
    const { data, error } = await supabase.rpc(
      'get_user_recommendations',
      { p_user_id: userId }
    );
    
    if (error) {
      throw new Error(`Failed to fetch user recommendations: ${error.message}`);
    }
    
    if (!data || !Array.isArray(data)) {
      console.warn(`No recommendation data returned for user ${userId}`);
      return { recommendations: [] };
    }
    
    // Transform the data to match our RecommendationProgram interface, adding defaults and JSONB feedback
    const recommendations: RecommendationProgram[] = data.map((item: any) => {
      const fbData = item.feedback_data || {};
      // Consolidate stored and single link into an array of candidates
      const linksArray: string[] = Array.isArray(item.page_links)
        ? item.page_links
        : item.page_link
        ? [item.page_link]
        : [];
      return {
        id: item.id || `missing_id_${Math.random()}`,
        name: item.name || 'N/A',
        institution: item.institution || 'N/A',
        degreeType: item.degree_type || 'N/A',
        fieldOfStudy: item.field_of_study || 'N/A',
        description: item.description || 'No description available.',
        matchScore: item.match_score ?? 0,
        costPerYear: item.cost_per_year ?? 0,
        duration: item.duration ?? 0,
        location: item.location || 'N/A',
        startDate: item.start_date || 'N/A',
        isFavorite: item.is_favorite ?? false,
        applicationDeadline: item.application_deadline || 'N/A',
        requirements: Array.isArray(item.requirements) ? item.requirements : [],
        highlights: Array.isArray(item.highlights) ? item.highlights : [],
        pageLinks: linksArray,
        pageLink: linksArray[0] || '',
        pathway_id: item.pathway_id || null,
        matchRationale: item.match_rationale && typeof item.match_rationale === 'object'
          ? {
              careerAlignment: item.match_rationale.careerAlignment ?? 0,
              budgetFit: item.match_rationale.budgetFit ?? 0,
              locationMatch: item.match_rationale.locationMatch ?? 0,
              academicFit: item.match_rationale.academicFit ?? 0,
            }
          : { careerAlignment: 0, budgetFit: 0, locationMatch: 0, academicFit: 0 },
        // Map feedback JSONB
        feedbackData: fbData,
        feedbackNegative: item.feedback_negative || !!fbData.reason,
        feedbackReason: fbData.reason ?? null,
        feedbackSubmittedAt: fbData.submittedAt ?? null,
        scholarships: Array.isArray(item.scholarships) ? item.scholarships : undefined,
      } as RecommendationProgram;
    });
    
    console.log(`Fetched and mapped ${recommendations.length} recommendations for user ${userId}`);
    return { recommendations };
  } catch (error) {
    console.error('Error fetching user recommendations:', error);
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while fetching recommendations',
    };
  }
}

/**
 * Toggle favorite status of a recommendation in Supabase
 */
export async function toggleRecommendationFavorite(
  userId: string,
  recommendationId: string
): Promise<{
  success: boolean;
  newStatus?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // --- Add user check ---
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error in toggleRecommendationFavorite:', authError?.message);
      return { success: false, error: 'User not authenticated' };
    }
    
    // Ensure the provided userId matches the authenticated user
    if (user.id !== userId) {
      console.warn(`User ID mismatch in toggleRecommendationFavorite: provided ${userId}, authenticated ${user.id}`);
      return { success: false, error: 'User ID mismatch' };
    }

    // Call the Supabase function to toggle the favorite status
    // Note: This RPC function expects recommendation_id, but we're passing recommendationId
    // The RPC handling should process this properly as it's just a parameter name
    const { data, error } = await supabase.rpc(
      'toggle_recommendation_favorite',
      {
        p_user_id: userId,
        p_recommendation_id: recommendationId
      }
    );
    
    if (error) {
      // Check for specific error types and provide user-friendly messages
      if (error.message.includes('invalid input syntax for type uuid')) {
        console.error('Invalid recommendation ID format:', recommendationId);
        return { 
          success: false, 
          error: 'Invalid recommendation format. Please try again or contact support if the issue persists.' 
        };
      }
      
      if (error.message.includes('Recommendation not found')) {
        return { 
          success: false, 
          error: 'This recommendation could not be found. It may have been deleted.' 
        };
      }
      
      throw new Error(`Failed to toggle recommendation favorite: ${error.message}`);
    }
    
    // Successfully toggled favorite status in Supabase
    const newStatus = data as boolean;
    console.log(`Toggled favorite status to ${newStatus} for recommendation ${recommendationId}`);
    
    // Retrieve vector store ID for this user
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('vector_store_id')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error retrieving vector store ID:', profileError);
      // Return success for the favorite toggle but note sync issue
      return {
        success: true,
        newStatus,
        error: 'Favorite status updated but failed to sync with AI system'
      };
    }
    
    const vectorStoreId = profileData.vector_store_id;
    
    if (!vectorStoreId) {
      // No vector store to sync to, just return the result
      return {
        success: true,
        newStatus
      };
    }
    
    // First get the basic recommendation data, including pathway_id
    // Update to use recommendation_id in column name but use the passed recommendationId value
    let recommendationData: any; // Changed from const to let to allow reassignment
    const { data: initialRecommendationData, error: recError } = await supabase
      .from('recommendations')
      .select('id, match_score, is_favorite, match_rationale, program_id, pathway_id')
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .single();
    if (recError || !initialRecommendationData) {
      console.error('Error retrieving recommendation by id:', recError);
      return { success: true, newStatus, error: 'Failed to sync with AI system: missing recommendation' };
    }
    recommendationData = initialRecommendationData;
    
    if (!recommendationData || !recommendationData.program_id) {
      console.error('Missing recommendation data or program_id:', recommendationId);
      return {
        success: true,
        newStatus,
        error: 'Favorite status updated but failed to sync with AI system due to missing data'
      };
    }
    
    // Then get the program data separately for clarity
    const { data: programData, error: programError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', recommendationData.program_id)
      .single();
    
    if (programError || !programData) {
      console.error('Error retrieving program data:', programError || 'No program found');
      return {
        success: true,
        newStatus,
        error: 'Favorite status updated but failed to sync with AI system due to missing program data'
      };
    }
    
    console.log('Successfully retrieved program data:', programData.name);
    
    // Create a recommendation object from the retrieved data
    const recommendation: RecommendationProgram = {
      id: recommendationData.id,
      name: programData.name || 'Unknown Program',
      institution: programData.institution || 'Unknown Institution',
      degreeType: programData.degree_type || 'Unknown',
      fieldOfStudy: programData.field_of_study || 'Unknown',
      description: programData.description || '',
      costPerYear: programData.cost_per_year || 0,
      duration: programData.duration || 0,
      location: programData.location || 'Unknown',
      startDate: programData.start_date || '',
      applicationDeadline: programData.application_deadline || '',
      requirements: programData.requirements || [],
      highlights: programData.highlights || [],
      pageLink: programData.page_link,
      matchScore: recommendationData.match_score || 0,
      matchRationale: recommendationData.match_rationale || {},
      isFavorite: recommendationData.is_favorite || false,
      pathway_id: recommendationData.pathway_id,
      // Get scholarships if available (would require a separate query if needed)
      scholarships: []
    };
    
    // Sync the updated recommendation to the Vector Store
    try {
      console.log('Syncing recommendation to Vector Store:', recommendation.id);
      const syncResult = await syncSingleRecommendationToVectorStore(
        userId,
        recommendation,
        vectorStoreId
      );
      
      if (!syncResult.success) {
        console.error('Error syncing recommendation to Vector Store:', syncResult.error);
        // Return success for the favorite toggle but note sync issue
        return {
          success: true,
          newStatus,
          error: 'Favorite status updated but failed to sync with AI system'
        };
      }
      
      console.log('Successfully synced updated recommendation to Vector Store with file ID:', syncResult.fileId);
    } catch (syncError) {
      console.error('Error syncing recommendation to Vector Store:', syncError);
      // Return success for the favorite toggle but note sync issue
      return {
        success: true,
        newStatus,
        error: 'Favorite status updated but failed to sync with AI system'
      };
    }
    
    return {
      success: true,
      newStatus
    };
  } catch (error) {
    console.error('Error toggling recommendation favorite:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while updating the favorite status',
    };
  }
}

/**
 * Save a batch of recommendation programs to Supabase
 * @deprecated Use the saveProgramsForPathway function from pathway-actions.ts instead
 */
export async function saveRecommendationsBatch(
  userId: string,
  recommendations: RecommendationProgram[],
  vectorStoreId: string
): Promise<{ success: boolean; error?: string; savedCount?: number }> {
  console.warn('DEPRECATED: saveRecommendationsBatch is deprecated. Use saveProgramsForPathway from pathway-actions.ts instead.');
  try {
    if (!vectorStoreId) {
      throw new Error('Vector store ID is required for saving recommendations');
    }
    
    console.log(`Saving ${recommendations.length} recommendations to Supabase for user ${userId} with vector store ID: ${vectorStoreId}`);
    
    const supabase = await createClient();
    
    let hasError = false;
    let firstError = '';
    let savedCount = 0;
    const savedRecommendations: RecommendationProgram[] = [];
    
    // Process each recommendation
    for (const rec of recommendations) {
      // Prepare the recommendation data for Supabase
      // Important: Use snake_case for fields as expected by the store_recommendation function
      const recommendationData = {
        name: rec.name,
        institution: rec.institution,
        degreeType: rec.degreeType,
        fieldOfStudy: rec.fieldOfStudy,
        description: rec.description,
        costPerYear: rec.costPerYear,
        duration: rec.duration,
        location: rec.location,
        startDate: rec.startDate,
        applicationDeadline: rec.applicationDeadline,
        requirements: rec.requirements || [],
        highlights: rec.highlights || [],
        pageLink: rec.pageLink,
        pageLinks: rec.pageLinks || [],
        match_score: rec.matchScore, // Intentionally snake_case for the function
        is_favorite: rec.isFavorite || false, // Intentionally snake_case for the function
        match_rationale: rec.matchRationale, // Intentionally snake_case for the function
        scholarships: rec.scholarships || [],
      };
      
      console.log(`Saving recommendation ${rec.id} for program "${rec.name}" with vector store ID: ${vectorStoreId}`);
      
      // Call Supabase function to store recommendation
      const { data: recommendationId, error } = await supabase.rpc(
        'store_recommendation',
        {
          p_user_id: userId,
          p_vector_store_id: vectorStoreId,
          p_recommendation: recommendationData
        }
      );
      
      if (error) {
        hasError = true;
        firstError = error.message;
        console.error(`Error saving recommendation ${rec.id} to Supabase:`, error);
        // Continue trying to save other recommendations
      } else {
        console.log(`Successfully saved recommendation ${rec.id} with ID: ${recommendationId}`);
        savedCount++;
        
        // Store the saved recommendation with its actual database ID for vector store syncing
        const savedRec = {
          ...rec,
          id: recommendationId // Use the ID returned from Supabase
        };
        savedRecommendations.push(savedRec);
      }
    }
    
    // Log summary
    if (hasError) {
      console.error(`Completed with errors: Saved ${savedCount}/${recommendations.length} recommendations`);
    } else {
      console.log(`Successfully saved all ${savedCount} recommendations`);
    }
    
    // After successfully saving to Supabase, sync recommendations to Vector Store
    if (savedRecommendations.length > 0) {
      try {
        console.log(`Syncing ${savedRecommendations.length} recommendations to Vector Store...`);
        // Sync the saved recommendations to the Vector Store using pathway-aware function
        const syncResult = await syncProgramsToVectorStore(
          userId,
          savedRecommendations,
          vectorStoreId
        );
        
        if (!syncResult.success) {
          console.error('Error syncing recommendations to Vector Store:', syncResult.error);
          // Return success but with warning about sync
          return { 
            success: true,
            savedCount,
            error: `Recommendations saved to database but failed to sync to AI system: ${syncResult.error}`
          };
        }
        
        console.log(`Successfully synced ${savedRecommendations.length} recommendations to Vector Store with file IDs:`, syncResult.fileIds);
      } catch (syncError) {
        console.error('Error syncing recommendations to Vector Store:', syncError);
        // Return success but with warning about sync
        return { 
          success: true,
          savedCount,
          error: 'Recommendations saved to database but failed to sync to AI system for chat interactions'
        };
      }
    } else {
      console.log('No recommendations were saved successfully, skipping Vector Store sync');
    }
    
    return { 
      success: savedCount > 0,
      savedCount,
      error: hasError ? `Failed to save some recommendations: ${firstError}` : undefined
    };
  } catch (error) {
    console.error('Error in saveRecommendationsBatch:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while saving recommendations',
      savedCount: 0
    };
  }
}

/**
 * Check if a user is authenticated via Supabase
 */
export async function checkUserAuthentication(): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get the current user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return {
        isAuthenticated: false,
        userId: null
      };
    }
    
    return {
      isAuthenticated: true,
      userId: user.id
    };
  } catch (error) {
    console.error('Error checking user authentication:', error);
    return {
      isAuthenticated: false,
      userId: null
    };
  }
}

/**
 * Delete all recommendations for a user from Supabase
 * and clean up associated files in the vector store
 */
export async function deleteUserRecommendations(
  userId: string,
  vectorStoreId: string | null
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  try {
    if (!userId) {
      throw new Error('User ID is required to delete recommendations');
    }
    
    console.log(`Deleting all recommendations for user ${userId}`);
    const supabase = await createClient();
    
    // First, get all recommendation IDs for the user to find associated files
    const { data: recommendationData, error: fetchError } = await supabase
      .from('recommendations')
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) {
      console.error('Error fetching recommendations:', fetchError);
      throw new Error(`Failed to fetch recommendations: ${fetchError.message}`);
    }
    
    const recommendationIds = recommendationData?.map(rec => rec.id) || [];
    console.log(`Found ${recommendationIds.length} recommendations to delete`);
    
    // Track any errors during file deletion
    let fileDeleteError = null;
    
    // Delete associated files from both Supabase and Vector Store
    if (recommendationIds.length > 0) {
      try {
        // Get the recommendation files from Supabase
        const { data: filesData, error: filesError } = await supabase
          .from('recommendation_files')
          .select('*')
          .in('recommendation_id', recommendationIds);
        
        if (filesError) {
          console.error('Error fetching recommendation files:', filesError);
          fileDeleteError = `Failed to fetch recommendation files: ${filesError.message}`;
        } else {
          const fileIds = filesData?.map(file => file.file_id) || [];
          
          // First delete the entries from the recommendation_files table
          if (fileIds.length > 0) {
            const { error: deleteFileRecordsError } = await supabase
              .from('recommendation_files')
              .delete()
              .in('recommendation_id', recommendationIds);
            
            if (deleteFileRecordsError) {
              console.error('Error deleting recommendation file records:', deleteFileRecordsError);
              fileDeleteError = `Failed to delete recommendation file records: ${deleteFileRecordsError.message}`;
            }
            
            // Then, if there's a vector store ID, delete the files from OpenAI
            if (vectorStoreId && fileIds.length > 0) {
              try {
                // Import the API to delete files from vector store
                const { cleanupVectorStoreFiles } = await import('../api/vector_stores/services/cleanup');
                const cleanupResult = await cleanupVectorStoreFiles(vectorStoreId, fileIds);
                
                if (!cleanupResult.success) {
                  console.error('Error cleaning up vector store files:', cleanupResult.error);
                  fileDeleteError = `Failed to delete some files from vector store: ${cleanupResult.error}`;
                }
              } catch (cleanupError) {
                console.error('Error importing or calling cleanupVectorStoreFiles:', cleanupError);
                fileDeleteError = 'Failed to clean up vector store files due to service error';
              }
            }
          }
        }
      } catch (filesProcessError) {
        console.error('Error processing recommendation files:', filesProcessError);
        fileDeleteError = 'Failed to process recommendation files';
      }
    }
    
    // Finally, delete the recommendations from the database
    const { error: deleteError } = await supabase
      .from('recommendations')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Error deleting recommendations:', deleteError);
      throw new Error(`Failed to delete recommendations: ${deleteError.message}`);
    }
    
    const deletedCount = recommendationIds.length;
    console.log(`Successfully deleted ${deletedCount} recommendations for user ${userId}`);
    
    // Return success with count and any file deletion errors
    return { 
      success: true, 
      deletedCount,
      ...(fileDeleteError ? { error: fileDeleteError } : {})
    };
  } catch (error) {
    console.error('Error in deleteUserRecommendations:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while deleting recommendations',
      deletedCount: 0
    };
  }
}

/**
 * Submit negative feedback for a recommendation, storing both reason and optional details in JSONB
 */
export async function submitRecommendationFeedback(
  userId: string,
  recommendationId: string,
  reason: string,
  details?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !recommendationId || !reason) {
      throw new Error('User ID, recommendation ID, and feedback reason are required');
    }
    
    console.log(`Submitting negative feedback for recommendation ${recommendationId} from user ${userId} with reason: ${reason}, details: ${details}`);
    
    const supabase = await createClient();

    const { data: recommendation, error: fetchError } = await supabase
      .from('recommendations')
      .select('id, match_score, is_favorite, match_rationale, program_id, vector_store_id, pathway_id')
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .single();
    if (fetchError || !recommendation) {
      console.error('Error fetching recommendation:', fetchError || 'Not found by id');
      throw new Error('Recommendation not found or does not belong to the user');
    }
    
    const now = new Date().toISOString();
    const feedbackRecord = {
      feedback_data: {
        reason,
        ...(details ? { details } : {}),
        submittedAt: now,
      },
      feedback_negative: true,
      feedback_submitted_at: now,
      updated_at: now
    };
    const { error: updateError } = await supabase
      .from('recommendations')
      .update(feedbackRecord)
      .eq('id', recommendation.id)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Error updating recommendation with feedback:', updateError);
      throw new Error(`Failed to update recommendation with feedback: ${updateError.message}`);
    }
    
    console.log(`Successfully updated recommendation ${recommendation.id} with negative feedback`);
    
    // If vector store exists, sync the updated recommendation
    if (recommendation.vector_store_id) {
      try {
        // Get the full program data to create a complete recommendation object
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', recommendation.program_id)
          .single();
        
        if (programError || !programData) {
          console.error('Error retrieving program data:', programError || 'No program found');
          return {
            success: true,
            error: 'Feedback saved but failed to sync with AI system due to missing program data'
          };
        }
        
        // Create a complete recommendation object with feedback data
        const updatedRecommendation: RecommendationProgram = {
          id: recommendation.id, // Use the id we found, not the passed recommendationId
          name: programData.name || 'Unknown Program',
          institution: programData.institution || 'Unknown Institution',
          degreeType: programData.degree_type || 'Unknown',
          fieldOfStudy: programData.field_of_study || 'Unknown',
          description: programData.description || '',
          costPerYear: programData.cost_per_year || 0,
          duration: programData.duration || 0,
          location: programData.location || 'Unknown',
          startDate: programData.start_date || '',
          applicationDeadline: programData.application_deadline || '',
          requirements: programData.requirements || [],
          highlights: programData.highlights || [],
          pageLink: programData.page_link,
          matchScore: recommendation.match_score || 0,
          matchRationale: recommendation.match_rationale || {},
          isFavorite: recommendation.is_favorite || false,
          pathway_id: recommendation.pathway_id,
          // Include feedback data
          feedbackNegative: true,
          feedbackReason: reason,
          feedbackSubmittedAt: now,
          feedbackData: feedbackRecord.feedback_data,
          // Get scholarships if available (would require a separate query if needed)
          scholarships: []
        };
        
        // Sync to Vector Store
        const { success: syncSuccess, error: syncError } = await syncSingleRecommendationToVectorStore(
          userId,
          updatedRecommendation,
          recommendation.vector_store_id
        );
        
        if (!syncSuccess) {
          console.error('Error syncing updated recommendation to Vector Store:', syncError);
          return {
            success: true,
            error: 'Feedback saved but failed to sync with AI system'
          };
        }
        
        console.log('Successfully synced updated recommendation with feedback to Vector Store');
      } catch (syncError) {
        console.error('Error preparing or syncing recommendation update:', syncError);
        return {
          success: true,
          error: 'Feedback saved but failed to sync with AI system'
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting recommendation feedback:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while submitting feedback',
    };
  }
}

// New function to archive (soft-delete) a recommendation by setting is_deleted = true
export async function archiveRecommendationProgram(
  userId: string,
  recommendationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !recommendationId) {
      throw new Error('User ID and recommendation ID are required');
    }

    console.log(`Archiving recommendation ${recommendationId} for user ${userId}`);

    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error archiving recommendation:', updateError);
      throw new Error(`Failed to archive recommendation: ${updateError.message}`);
    }

    console.log(`Successfully archived recommendation ${recommendationId}`);
    return { success: true };
  } catch (error) {
    console.error('Error in archiveRecommendationProgram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error while archiving recommendation',
    };
  }
}

/**
 * Restore a recommendation by clearing feedback and un-deleting
 */
export async function restoreRecommendationFeedback(
  userId: string,
  recommendationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !recommendationId) {
      throw new Error('User ID and recommendation ID are required');
    }

    console.log(`Restoring recommendation ${recommendationId} for user ${userId}`);

    const supabase = await createClient();

    const restoreNow = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({
        feedback_data: {},
        feedback_negative: false,
        feedback_submitted_at: null,
        is_deleted: false,
        updated_at: restoreNow,
      })
      .eq('id', recommendationId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error restoring recommendation:', updateError);
      throw new Error(`Failed to restore recommendation: ${updateError.message}`);
    }

    console.log(`Successfully restored recommendation ${recommendationId}`);
    // Sync restored recommendation to Vector Store
    try {
      // Fetch updated recommendation row for vector store info
      const { data: recRow, error: recFetchError } = await supabase
        .from('recommendations')
        .select('id, match_score, is_favorite, match_rationale, program_id, vector_store_id, pathway_id')
        .eq('id', recommendationId)
        .eq('user_id', userId)
        .single();
      if (!recFetchError && recRow?.vector_store_id) {
        const { data: programData, error: progErr } = await supabase
          .from('programs')
          .select('*')
          .eq('id', recRow.program_id)
          .single();
        if (programData && !progErr) {
          const restoredRecommendation: RecommendationProgram = {
            id: recRow.id,
            name: programData.name || '',
            institution: programData.institution || '',
            degreeType: programData.degree_type || '',
            fieldOfStudy: programData.field_of_study || '',
            description: programData.description || '',
            costPerYear: programData.cost_per_year || 0,
            duration: programData.duration || 0,
            location: programData.location || '',
            startDate: programData.start_date || '',
            applicationDeadline: programData.application_deadline || '',
            requirements: programData.requirements || [],
            highlights: programData.highlights || [],
            pageLink: programData.page_link,
            matchScore: recRow.match_score || 0,
            matchRationale: recRow.match_rationale || {},
            isFavorite: recRow.is_favorite || false,
            pathway_id: recRow.pathway_id,
            feedbackNegative: false,
            feedbackReason: null,
            feedbackSubmittedAt: null,
            scholarships: []
          };
          const { success: syncSuccess, error: syncError } = await syncSingleRecommendationToVectorStore(
            userId,
            restoredRecommendation,
            recRow.vector_store_id
          );
          if (!syncSuccess) {
            console.error('Error syncing restored recommendation to Vector Store:', syncError);
          }
        }
      }
    } catch (syncErr) {
      console.error('Error syncing restored recommendation:', syncErr);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in restoreRecommendationFeedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error while restoring recommendation',
    };
  }
} 