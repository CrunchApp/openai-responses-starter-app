import { NextRequest, NextResponse } from 'next/server';
import { generateEducationPathways } from '@/lib/ai/planningAgent';
import { GeneratePathwaysPayload, EducationPathway } from '@/app/recommendations/types';
import { checkUserAuthentication } from '@/app/recommendations/supabase-helpers';

// Check for required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
      userProfile, 
      previousResponseId, 
      existingPathways, 
      feedbackContext 
    } = requestData;
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Missing required parameter: userProfile' },
        { status: 400 }
      );
    }
    
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