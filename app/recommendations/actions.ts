'use server';

import { RecommendationProgram, UserProfile } from './types';
import { 
  checkUserAuthentication,
  saveRecommendationsBatch,
  fetchUserRecommendations as fetchFromSupabase,
  toggleRecommendationFavorite as toggleFavoriteInSupabase,
  deleteUserRecommendations
} from './supabase-helpers';

// API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Main server action to generate recommendations
 * Handles both guest and authenticated users
 */
export async function generateRecommendations(
  vectorStoreId: string, 
  cachedUserProfile?: UserProfile,
  isGuest?: boolean
): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
  isGuest: boolean;
  // Will be true if the user has reached the generation limit
  generationLimitReached?: boolean;
  // Database save error information
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  try {
    console.log(`Generating recommendations with isGuest=${isGuest}, vectorStoreId=${vectorStoreId}`);
    
    // For explicitly identified guests, use guest path
    if (isGuest) {
      return generateGuestRecommendations(vectorStoreId, cachedUserProfile);
    }
    
    // Otherwise, check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    console.log(`Auth check result: isAuthenticated=${isAuthenticated}, userId=${userId}`);
    
    // If not authenticated, use guest path
    if (!isAuthenticated || !userId) {
      console.log('User not authenticated, using guest path');
      return generateGuestRecommendations(vectorStoreId, cachedUserProfile);
    }
    
    // Otherwise, use authenticated path
    console.log('User authenticated, using authenticated path');
    return generateAuthenticatedRecommendations(vectorStoreId, userId, cachedUserProfile);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating recommendations',
      isGuest: isGuest ?? true
    };
  }
}

/**
 * Generate recommendations for guest users
 * Limited to 1 generation, stored only in client-side storage
 */
async function generateGuestRecommendations(
  vectorStoreId: string, 
  cachedUserProfile?: UserProfile
): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
  isGuest: boolean;
}> {
  try {
    // Call the recommendations generation API
    const result = await fetchRecommendationsFromAPI(vectorStoreId, cachedUserProfile);
    
    return {
      ...result,
      isGuest: true
    };
  } catch (error) {
    console.error('Error generating guest recommendations:', error);
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating recommendations',
      isGuest: true
    };
  }
}

/**
 * Generate recommendations for authenticated users
 * Results are saved to Supabase, unlimited generations
 */
async function generateAuthenticatedRecommendations(
  vectorStoreId: string,
  userId: string,
  cachedUserProfile?: UserProfile
): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
  isGuest: boolean;
  dbSaveError?: string;
  partialSave?: boolean;
  savedCount?: number;
}> {
  try {
    console.log(`Generating authenticated recommendations for user ${userId}`);
    
    // Call the recommendations generation API
    const result = await fetchRecommendationsFromAPI(vectorStoreId, cachedUserProfile);
    
    if (result.recommendations.length > 0) {
      console.log(`Received ${result.recommendations.length} recommendations, attempting to save to database`);
      
      try {
        // Save to Supabase - moved to separate try-catch to capture DB errors without losing recommendations
        const saveResult = await saveRecommendationsBatch(userId, result.recommendations, vectorStoreId);
        
        if (!saveResult.success) {
          console.error('Failed to save all recommendations to database:', saveResult.error);
          
          // Still return recommendations but include the database error
          return {
            ...result,
            isGuest: false,
            dbSaveError: saveResult.error,
            partialSave: Boolean(saveResult.savedCount && saveResult.savedCount > 0),
            savedCount: saveResult.savedCount
          };
        }
        
        console.log(`Successfully saved ${saveResult.savedCount} recommendations to database`);
        return {
          ...result,
          isGuest: false,
          savedCount: saveResult.savedCount
        };
      } catch (dbError) {
        console.error('Unexpected error saving to database:', dbError);
        
        // Still return recommendations but include the database error
        return {
          ...result,
          isGuest: false,
          dbSaveError: dbError instanceof Error 
            ? dbError.message 
            : 'An unexpected error occurred while saving to database'
        };
      }
    }
    
    return {
      ...result,
      isGuest: false
    };
  } catch (error) {
    console.error('Error generating authenticated recommendations:', error);
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating recommendations',
      isGuest: false
    };
  }
}

/**
 * Fetch recommendations from the API
 * Used by both guest and authenticated paths
 */
async function fetchRecommendationsFromAPI(
  vectorStoreId: string,
  cachedUserProfile?: UserProfile
): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
}> {
  try {
    // Input validation
    if (!vectorStoreId) {
      throw new Error('Vector store ID is required to generate recommendations');
    }
    
    if (!cachedUserProfile) {
      throw new Error('User profile is required to generate recommendations');
    }

    // Construct the API endpoint URL
    const endpoint = `${API_URL}/api/recommendations/generate`;
    console.log(`Calling recommendations API at: ${endpoint}`);

    // Call our backend API to generate recommendations
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userProfile: cachedUserProfile
      }),
      // Use a longer timeout as this operation can take time
      signal: AbortSignal.timeout(240000), // 240 second timeout
      cache: 'no-store',
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
    
    if (!data.recommendations || !Array.isArray(data.recommendations)) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from recommendations API');
    }
    
    return {
      recommendations: data.recommendations,
    };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    
    // Return a user-friendly error message
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating recommendations',
    };
  }
}

/**
 * Fetch user's recommendations from Supabase
 * Re-exported from supabase-helpers for easier access
 */
export async function fetchUserRecommendations(userId: string): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
}> {
  return fetchFromSupabase(userId);
}

/**
 * Toggle favorite status of a recommendation in Supabase
 * Re-exported from supabase-helpers for easier access
 */
export async function toggleRecommendationFavorite(
  userId: string,
  recommendationId: string
): Promise<{
  success: boolean;
  newStatus?: boolean;
  error?: string;
}> {
  return toggleFavoriteInSupabase(userId, recommendationId);
}

/**
 * Reset all recommendations for the authenticated user
 * Deletes from Supabase and cleans up vector store files
 */
export async function resetRecommendations(): Promise<{
  success: boolean;
  error?: string;
  deletedCount?: number;
}> {
  try {
    console.log('Resetting recommendations for authenticated user');
    
    // Check authentication
    const { isAuthenticated, userId } = await checkUserAuthentication();
    console.log(`Auth check result: isAuthenticated=${isAuthenticated}, userId=${userId}`);
    
    // If not authenticated, return error
    if (!isAuthenticated || !userId) {
      console.log('User not authenticated, cannot reset recommendations');
      return { 
        success: false, 
        error: 'You must be logged in to reset recommendations' 
      };
    }
    
    // Fetch vector store ID from user profile
    const supabase = await import('@/lib/supabase/server').then(mod => mod.createClient());
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('vector_store_id')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error retrieving profile data:', profileError);
      return { 
        success: false, 
        error: 'Failed to retrieve user profile data' 
      };
    }
    
    const vectorStoreId = profileData?.vector_store_id;
    console.log(`Retrieved vector store ID for user: ${vectorStoreId || 'none'}`);
    
    // Delete all recommendations and associated files
    const result = await deleteUserRecommendations(userId, vectorStoreId);
    
    // Return the result
    return {
      success: result.success,
      error: result.error,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    console.error('Error resetting recommendations:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while resetting recommendations'
    };
  }
} 