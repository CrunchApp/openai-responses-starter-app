'use server';

import { createClient } from '@/lib/supabase/server';
import { RecommendationProgram } from './types';
import { syncRecommendationsToVectorStore, syncSingleRecommendationToVectorStore } from './vector-store-helpers';

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
    
    // Transform the data to match our RecommendationProgram interface, adding defaults
    const recommendations: RecommendationProgram[] = data.map((item: any) => ({
      id: item.id || `missing_id_${Math.random()}`, // Provide fallback ID if needed
      name: item.name || 'N/A',
      institution: item.institution || 'N/A',
      degreeType: item.degree_type || 'N/A',
      fieldOfStudy: item.field_of_study || 'N/A',
      description: item.description || 'No description available.',
      matchScore: item.match_score ?? 0, // Default to 0 if null
      costPerYear: item.cost_per_year ?? 0, // Default to 0 if null
      duration: item.duration ?? 0, // Default to 0 if null
      location: item.location || 'N/A',
      startDate: item.start_date || 'N/A',
      isFavorite: item.is_favorite ?? false, // Default to false if null
      applicationDeadline: item.application_deadline || 'N/A',
      requirements: Array.isArray(item.requirements) ? item.requirements : [], // Default to empty array
      highlights: Array.isArray(item.highlights) ? item.highlights : [], // Default to empty array
      matchRationale: item.match_rationale && typeof item.match_rationale === 'object'
        ? { // Provide default structure for matchRationale
            careerAlignment: item.match_rationale.careerAlignment ?? 0,
            budgetFit: item.match_rationale.budgetFit ?? 0,
            locationMatch: item.match_rationale.locationMatch ?? 0,
            academicFit: item.match_rationale.academicFit ?? 0,
          }
        : { // Default object if null or not an object
            careerAlignment: 0,
            budgetFit: 0,
            locationMatch: 0,
            academicFit: 0,
          },
      scholarships: Array.isArray(item.scholarships) ? item.scholarships : undefined, // Keep as undefined if not present or not array
    }));
    
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
    
    // First get the basic recommendation data
    const { data: recommendationData, error: recError } = await supabase
      .from('recommendations')
      .select('id, match_score, is_favorite, match_rationale, program_id')
      .eq('id', recommendationId)
      .eq('user_id', userId)
      .single();
    
    if (recError) {
      console.error('Error retrieving recommendation details:', recError);
      return {
        success: true,
        newStatus,
        error: 'Favorite status updated but failed to sync with AI system'
      };
    }
    
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
      matchScore: recommendationData.match_score || 0,
      matchRationale: recommendationData.match_rationale || {},
      isFavorite: recommendationData.is_favorite || false,
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
 * Save multiple recommendations to Supabase
 */
export async function saveRecommendationsBatch(
  userId: string,
  recommendations: RecommendationProgram[],
  vectorStoreId: string
): Promise<{ success: boolean; error?: string; savedCount?: number }> {
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
        // Sync the saved recommendations to the Vector Store
        const syncResult = await syncRecommendationsToVectorStore(
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