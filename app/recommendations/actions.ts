'use server';

import { RecommendationProgram } from './types';

// API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Server action to generate recommendations based on the user's profile
 */
export async function generateRecommendations(vectorStoreId: string, cachedUserProfile?: any): Promise<{
  recommendations: RecommendationProgram[];
  error?: string;
}> {
  try {
    // Input validation
    if (!vectorStoreId) {
      throw new Error('Vector store ID is required to generate recommendations');
    }

    // Use cached profile if provided (from client-side localStorage)
    let userProfile = cachedUserProfile;
    
    // If no cached profile is provided, fetch from vector store
    if (!userProfile) {
      // Get user profile from vector store
      const profileResponse = await fetch(`${API_URL}/api/vector_stores/files?vectorStoreId=${vectorStoreId}`, {
        method: 'GET',
        cache: 'no-store',
      });
      
      if (!profileResponse.ok) {
        throw new Error(`Failed to retrieve files from vector store: ${profileResponse.status}`);
      }
      
      const filesData = await profileResponse.json();
      
      // Find the user_profile.json file
      for (const file of filesData.files) {
        if (file.name === 'user_profile.json') {
          // Fetch the file content
          const fileResponse = await fetch(`${API_URL}/api/vector_stores/file/${file.id}`, {
            method: 'GET',
            cache: 'no-store',
          });
          
          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            if (fileData.content) {
              // Parse the JSON content
              try {
                userProfile = JSON.parse(fileData.content);
                break;
              } catch (error) {
                console.error('Error parsing user profile JSON:', error);
              }
            }
          }
        }
      }
      
      if (!userProfile) {
        throw new Error('Could not retrieve user profile data');
      }
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
        userProfile,
        vectorStoreId 
      }),
      // Use a longer timeout as this operation can take time
      signal: AbortSignal.timeout(60000), // 60 second timeout
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
    
    if (!data.recommendations || !Array.isArray(data.recommendations)) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from recommendations API');
    }
    
    return {
      recommendations: data.recommendations,
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Return a user-friendly error message
    return {
      recommendations: [],
      error: error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while generating recommendations',
    };
  }
} 