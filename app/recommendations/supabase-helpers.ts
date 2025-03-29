'use server';

import { createClient } from '@/lib/supabase/server';
import { RecommendationProgram } from './types';

/**
 * Save a recommendation to Supabase
 */
export async function saveRecommendation(
  userId: string,
  recommendation: RecommendationProgram,
  vectorStoreId: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
      // Optionally return an error, or proceed if this check isn't strictly necessary
      // return { success: false, error: 'User ID mismatch' };
    }
    // --- End user check ---

    // Call the Supabase function to toggle the favorite status
    const { data, error } = await supabase.rpc(
      'toggle_recommendation_favorite',
      {
        p_user_id: userId, // Use the verified or originally passed userId
        p_recommendation_id: recommendationId
      }
    );
    
    if (error) {
      throw new Error(`Failed to toggle recommendation favorite: ${error.message}`);
    }
    
    return {
      success: true,
      newStatus: data as boolean
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
    console.log(`Saving ${recommendations.length} recommendations to Supabase for user ${userId}`);
    
    const supabase = await createClient();
    
    let hasError = false;
    let firstError = '';
    let savedCount = 0;
    
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
      
      console.log(`Saving recommendation ${rec.id} for program "${rec.name}"`);
      
      // Call Supabase function to store recommendation
      const { data, error } = await supabase.rpc(
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
        console.log(`Successfully saved recommendation ${rec.id} with result:`, data);
        savedCount++;
      }
    }
    
    // Log summary
    if (hasError) {
      console.error(`Completed with errors: Saved ${savedCount}/${recommendations.length} recommendations`);
      return {
        success: savedCount > 0, // Partial success if at least one was saved
        error: `Failed to save some recommendations: ${firstError}`,
        savedCount
      };
    }
    
    console.log(`Successfully saved all ${savedCount} recommendations`);
    return { 
      success: true,
      savedCount
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