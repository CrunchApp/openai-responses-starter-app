import { NextRequest, NextResponse } from 'next/server';
import { generateEducationPathways as planningAgentGeneratePathways } from '@/lib/ai/planningAgent';
import { GeneratePathwaysPayload, EducationPathway } from '@/app/recommendations/types';
import { checkUserAuthentication } from '@/app/recommendations/supabase-helpers';

// Check for required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Utility function to ensure profile data is correctly structured
function sanitizeUserProfile(userProfile: any) {
  if (!userProfile) return userProfile;
  
  const sanitized = {...userProfile};
  
  // --- Ensure careerGoals is properly structured and preserve all provided fields ---
  if (!sanitized.careerGoals) {
    sanitized.careerGoals = {
      shortTerm: '',
      longTerm: '',
      achievements: '',
      desiredIndustry: [],
      desiredRoles: []
    };
  } else {
    // Preserve existing values even if empty strings while providing sensible defaults for missing ones
    sanitized.careerGoals = {
      shortTerm: sanitized.careerGoals.shortTerm !== undefined ? sanitized.careerGoals.shortTerm : '',
      longTerm: sanitized.careerGoals.longTerm !== undefined ? sanitized.careerGoals.longTerm : '',
      achievements: sanitized.careerGoals.achievements !== undefined ? sanitized.careerGoals.achievements : '',
      desiredIndustry: Array.isArray(sanitized.careerGoals.desiredIndustry) ? sanitized.careerGoals.desiredIndustry : [],
      desiredRoles: Array.isArray(sanitized.careerGoals.desiredRoles) ? sanitized.careerGoals.desiredRoles : []
    };
  }
  
  // --- Ensure preferences is properly structured while preserving additional optional fields ---
  if (!sanitized.preferences) {
    sanitized.preferences = {
      preferredLocations: [],
      studyMode: 'Full-time',
      startDate: '',
      budgetRange: { min: 0, max: 100000 },
      preferredDuration: undefined,
      preferredStudyLanguage: '',
      livingExpensesBudget: undefined,
      residencyInterest: undefined
    };
  } else {
    // Use spread first, then adjust properties to avoid duplicate keys in the literal
    const prefs = sanitized.preferences;
    const newPrefs: any = { ...prefs };

    // Normalise and validate individual fields
    newPrefs.preferredLocations = Array.isArray(prefs.preferredLocations) ? prefs.preferredLocations : [];
    newPrefs.studyMode = prefs.studyMode !== undefined ? prefs.studyMode : '';
    newPrefs.startDate = prefs.startDate !== undefined ? prefs.startDate : '';
    newPrefs.budgetRange = prefs.budgetRange || { min: 0, max: 100000 };
    newPrefs.preferredDuration = prefs.preferredDuration !== undefined ? prefs.preferredDuration : undefined;
    newPrefs.preferredStudyLanguage = prefs.preferredStudyLanguage !== undefined ? prefs.preferredStudyLanguage : '';
    newPrefs.livingExpensesBudget = prefs.livingExpensesBudget !== undefined ? prefs.livingExpensesBudget : undefined;
    newPrefs.residencyInterest = typeof prefs.residencyInterest === 'boolean' ? prefs.residencyInterest : prefs.residencyInterest !== undefined ? prefs.residencyInterest : undefined;

    sanitized.preferences = newPrefs;
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
    
    // --- Guard: ensure profile has required key fields before generation
    const missingFields: string[] = [];
    // Check vector store ID
    if (!userProfile.vectorStoreId) {
      missingFields.push('memory store');
    }
    // Check education array
    if (!Array.isArray(userProfile.education) || userProfile.education.length === 0) {
      missingFields.push('education history');
    }
    // Check target study level
    if (!userProfile.targetStudyLevel || userProfile.targetStudyLevel === '__NONE__') {
      missingFields.push('target study level');
    }
    // Check career goals completeness
    if (!userProfile.careerGoals || (
      !userProfile.careerGoals.shortTerm &&
      !userProfile.careerGoals.longTerm &&
      Array.isArray(userProfile.careerGoals.desiredIndustry) && userProfile.careerGoals.desiredIndustry.length === 0 &&
      Array.isArray(userProfile.careerGoals.desiredRoles) && userProfile.careerGoals.desiredRoles.length === 0
    )) {
      missingFields.push('career goals');
    }
    // Check preferences
    if (!userProfile.preferences || !Array.isArray(userProfile.preferences.preferredLocations) || userProfile.preferences.preferredLocations.length === 0) {
      missingFields.push('preferences');
    }
    // If any required fields are missing, respond with an error
    if (missingFields.length > 0) {
      console.warn('Profile generation guard triggered, missing:', missingFields);
      return NextResponse.json(
        {
          error: `Incomplete profile: missing ${missingFields.join(', ')}. Please complete your profile before generating pathways.`
        },
        { status: 400 }
      );
    }
    
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
    let planningAgentResult;
    try {
      planningAgentResult = await planningAgentGeneratePathways(
        userProfile,
        previousResponseId,
        existingPathways,
        feedbackContext
      );
      console.log('Education pathways generated successfully by planning agent');
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
    
    // Check if we have valid pathways from the agent
    if (!planningAgentResult?.pathways || !Array.isArray(planningAgentResult.pathways) || planningAgentResult.pathways.length === 0) {
      return NextResponse.json({ 
        error: "Failed to generate valid education pathways. Please try again."
      }, { status: 500 });
    }
    
    // --- Map pathways to frontend EducationPathway structure ---
    const mappedPathways: EducationPathway[] = planningAgentResult.pathways.map((agentPathway: any) => ({
      // Assuming EducationPathway type has these fields (adjust if needed)
      id: '', // No ID from agent, will be assigned by DB/frontend
      user_id: '', // No user ID from agent
      title: agentPathway.title || 'Untitled Pathway',
      qualification_type: agentPathway.qualificationType || 'Unknown Qualification',
      field_of_study: agentPathway.fieldOfStudy || 'Unknown Field',
      subfields: Array.isArray(agentPathway.subfields) ? agentPathway.subfields : [],
      target_regions: Array.isArray(agentPathway.targetRegions) ? agentPathway.targetRegions : [],
      budget_range_usd: {
        min: agentPathway.budgetRange?.min ?? 0,
        max: agentPathway.budgetRange?.max ?? 0,
      },
      // Map duration to a single number (max duration) to match expected type
      duration_months: agentPathway.duration?.max ?? 0,
      alignment_rationale: agentPathway.alignment || 'No rationale provided',
      alternatives: Array.isArray(agentPathway.alternatives) ? agentPathway.alternatives : [],
      query_string: agentPathway.queryString || '',
      is_deleted: false, // Default value
      is_explored: false, // Default value
      created_at: new Date().toISOString(), // Add created_at
      updated_at: new Date().toISOString(), // Add updated_at
      last_explored_at: undefined, // Use undefined instead of null
      user_feedback: null // Default value
    }));
    // --- End Mapping ---
    
    return NextResponse.json({ 
      pathways: mappedPathways, // Return the mapped pathways
      responseId: planningAgentResult.responseId
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