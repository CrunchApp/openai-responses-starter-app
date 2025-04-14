import { NextRequest, NextResponse } from 'next/server';
import { generateEducationPathways } from '@/lib/ai/planningAgent';
import { GeneratePathwaysPayload, EducationPathway } from '@/app/recommendations/types';
import { checkUserAuthentication } from '@/app/recommendations/supabase-helpers';

// Check for required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Utility function to ensure profile data is correctly structured
function sanitizeUserProfile(userProfile: any) {
  if (!userProfile) return userProfile;
  
  const sanitized = {...userProfile};
  
  // Ensure careerGoals is properly structured
  if (!sanitized.careerGoals) {
    sanitized.careerGoals = { shortTerm: '', longTerm: '', desiredIndustry: [], desiredRoles: [] };
  } else {
    // Preserve existing values even if empty strings
    sanitized.careerGoals = {
      shortTerm: sanitized.careerGoals.shortTerm !== undefined ? sanitized.careerGoals.shortTerm : '',
      longTerm: sanitized.careerGoals.longTerm !== undefined ? sanitized.careerGoals.longTerm : '',
      desiredIndustry: Array.isArray(sanitized.careerGoals.desiredIndustry) ? sanitized.careerGoals.desiredIndustry : [],
      desiredRoles: Array.isArray(sanitized.careerGoals.desiredRoles) ? sanitized.careerGoals.desiredRoles : []
    };
  }
  
  // Ensure preferences is properly structured
  if (!sanitized.preferences) {
    sanitized.preferences = { preferredLocations: [], studyMode: 'Full-time', startDate: '', budgetRange: { min: 0, max: 100000 } };
  } else {
    // Preserve existing values 
    sanitized.preferences = {
      preferredLocations: Array.isArray(sanitized.preferences.preferredLocations) ? sanitized.preferences.preferredLocations : [],
      studyMode: sanitized.preferences.studyMode !== undefined ? sanitized.preferences.studyMode : '',
      startDate: sanitized.preferences.startDate !== undefined ? sanitized.preferences.startDate : '',
      budgetRange: sanitized.preferences.budgetRange || { min: 0, max: 100000 }
    };
  }
  
  return sanitized;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate environment variables
    if (!OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing OpenAI API key' },
        { status: 500 }
      );
    }
    
    // Parse request body
    const requestData: GeneratePathwaysPayload = await request.json();
    const { 
      userProfile: rawUserProfile, 
      previousResponseId, 
      existingPathways, 
      feedbackContext 
    } = requestData;
    
    if (!rawUserProfile) {
      return NextResponse.json(
        { error: 'Missing required parameter: userProfile' },
        { status: 400 }
      );
    }
    
    // Sanitize and ensure profile data is correctly structured
    const userProfile = sanitizeUserProfile(rawUserProfile);
    
    // Debug logging for user profile data
    console.log('User profile received for recommendations:');
    console.log('Raw Career Goals:', JSON.stringify(rawUserProfile.careerGoals));
    console.log('Sanitized Career Goals:', JSON.stringify(userProfile.careerGoals));
    console.log('Raw Preferences:', JSON.stringify(rawUserProfile.preferences));
    console.log('Sanitized Preferences:', JSON.stringify(userProfile.preferences));
    
    // Check authentication to track pathway generation counts for users
    const { isAuthenticated, userId } = await checkUserAuthentication();
    
    // Check if we need to limit generations (for guests)
    if (!isAuthenticated) {
      // For guests, track generation count in the response
      // The client will handle restricting further generations
    }
    
    // Check for API timeouts - set a global timeout
    const MAX_EXECUTION_TIME = 120000; // 120 seconds
    let isTimedOut = false;
    
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      console.error('Pathway generation timed out after 120 seconds');
    }, MAX_EXECUTION_TIME);
    
    // If we're already timed out, return an error response
    if (isTimedOut) {
      console.log('Timed out before processing, returning error response');
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "The pathway generation process timed out. Please try again."
      }, { status: 504 });
    }
    
    // Generate education pathways
    let pathwaysResult;
    try {
      pathwaysResult = await generateEducationPathways(
        userProfile,
        previousResponseId,
        existingPathways,
        feedbackContext
      );
      console.log('Education pathways generated successfully');
    } catch (error) {
      console.error('Error generating education pathways:', error);
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "Failed to generate education pathways based on your profile. Please try again."
      }, { status: 500 });
    }
    
    // Clean up and return final pathways
    clearTimeout(timeoutId);
    
    const executionTime = Date.now() - startTime;
    console.log(`Pathways generated in ${executionTime}ms`);
    
    // Check if we have valid pathways
    if (!pathwaysResult?.pathways || !Array.isArray(pathwaysResult.pathways) || pathwaysResult.pathways.length === 0) {
      return NextResponse.json({ 
        error: "Failed to generate valid education pathways. Please try again."
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      pathways: pathwaysResult.pathways,
      // Return the response ID so it can be used for future conversation turns
      responseId: pathwaysResult.responseId
    });
    
  } catch (error) {
    console.error('Fatal error generating pathways:', error);
    
    // Provide a helpful error message
    let errorMessage = "An unexpected error occurred while generating pathways.";
    if (error instanceof Error) {
      // Include a simplified error message if available
      errorMessage = error.message.includes("timeout") 
        ? "The pathway generation process timed out. Please try again."
        : "An error occurred during pathway generation. Please try again.";
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      pathways: [] // Return empty array instead of undefined
    }, { status: 500 });
  }
} 