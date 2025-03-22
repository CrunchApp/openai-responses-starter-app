import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchProgramsWithPerplexityAPI } from '../perplexity-integration';
import { RecommendationProgram, UserProfile } from '@/app/recommendations/types';

// Check for required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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

    if (!PERPLEXITY_API_KEY) {
      console.error('Missing PERPLEXITY_API_KEY environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Perplexity API key' },
        { status: 500 }
      );
    }
    
    const { userProfile } = await request.json();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Missing required parameter: userProfile' },
        { status: 400 }
      );
    }
    
    // Check for API timeouts - set a global timeout for the entire process
    const MAX_EXECUTION_TIME = 150000; // 150 seconds - increased to allow for API processing
    let isTimedOut = false;
    
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      console.error('Recommendation generation timed out after 150 seconds');
    }, MAX_EXECUTION_TIME);
    
    // If we're already timed out, return an error response
    if (isTimedOut) {
      console.log('Timed out before processing, returning error response');
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "The recommendation process timed out. Please try again."
      }, { status: 504 });
    }
    
    // Step 1: Use Career & Education Matcher (Planning Agent) to generate education pathway queries
    let educationPathways;
    try {
      educationPathways = await generateEducationPathways(userProfile);
      console.log('Education pathways generated successfully');
    } catch (error) {
      console.error('Error generating education pathways:', error);
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "Failed to generate education pathways based on your profile. Please try again."
      }, { status: 500 });
    }
    
    // Check for timeout again
    if (isTimedOut) {
      console.log('Timed out after pathway generation, returning error response');
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "The recommendation process timed out after generating pathways. Please try again."
      }, { status: 504 });
    }
    
    // Step 2: Use Program Research Agent to find specific programs based on the pathways
    let recommendations;
    try {
      recommendations = await researchSpecificPrograms(educationPathways, userProfile);
      console.log('Specific programs researched successfully');
    } catch (error) {
      console.error('Error researching specific programs:', error);
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: "Failed to research specific programs matching your profile. Please try again."
      }, { status: 500 });
    }
    
    // Step 3: Calculate match scores and prepare the final recommendations 
    const enhancedRecommendations = enhanceRecommendationsWithMatchScores(recommendations, userProfile);
    
    // Clean up and return final recommendations
    clearTimeout(timeoutId);
    
    const executionTime = Date.now() - startTime;
    console.log(`Recommendations generated in ${executionTime}ms`);
    
    return NextResponse.json({ recommendations: enhancedRecommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ 
      error: "An unexpected error occurred while generating recommendations. Please try again."
    }, { status: 500 });
  }
}

/**
 * Career & Education Matcher (Planning Agent)
 * Analyzes the user profile and generates tailored education pathway queries
 */
async function generateEducationPathways(userProfile: UserProfile): Promise<any> {
  try {
    const prompt = `
You are an expert career and education pathway planner with deep knowledge of global educational systems, career trajectories, and non-traditional pathways. Your task is to analyze a user's profile and generate creative, tailored education pathway suggestions.

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

SPECIFIC DETAILS TO CONSIDER:
1. Educational Background:
   - Current education level: ${userProfile.education.map((edu) => `${edu.degreeLevel} in ${edu.fieldOfStudy} from ${edu.institution} (${edu.graduationYear})`).join(', ')}
   - Academic performance: ${userProfile.education.some((edu) => edu.gpa) ? userProfile.education.map((edu) => edu.gpa ? `${edu.gpa} GPA` : '').filter(Boolean).join(', ') : 'Not specified'}

2. Career Goals:
   - Short-term goals: ${userProfile.careerGoals.shortTerm}
   - Long-term goals: ${userProfile.careerGoals.longTerm}
   - Target industries: ${userProfile.careerGoals.desiredIndustry.join(', ')}
   - Desired roles: ${userProfile.careerGoals.desiredRoles.join(', ')}

3. Skills & Competencies:
   - ${userProfile.skills.join(', ')}

4. Program Preferences:
   - Preferred locations: ${userProfile.preferences.preferredLocations.join(', ')}
   - Study mode: ${userProfile.preferences.studyMode}
   - Target start: ${userProfile.preferences.startDate}
   - Budget constraints: $${userProfile.preferences.budgetRange.min.toLocaleString()} - $${userProfile.preferences.budgetRange.max.toLocaleString()} per year

INSTRUCTIONS:
1. Analyze the user's background, education history, career goals, skills, preferences and constraints.
2. Consider their budget constraints, location preferences, and time limitations carefully.
3. Think outside the box - don't just suggest the most obvious educational paths.
4. If budget is low, consider alternative routes (e.g., certificates first, then degrees; online options; countries with free/cheaper education).
5. If the user already has degrees, consider if they need additional qualifications or could benefit from specialized certificates instead.
6. Consider both immediate next steps and longer-term educational journeys.

For each pathway, provide:
- A concise title describing the pathway
- The type of qualification/degree suggested
- Field(s) of study
- Geographic region(s) to target
- Budget considerations
- Timeline/duration
- Why this pathway aligns with their profile and goals
- Alternative options within this pathway

OUTPUT FORMAT:
Provide 3 distinct educational pathways as a JSON array. Each pathway should be structured as follows:

{
  "pathways": [
    {
      "title": "Pathway title",
      "qualificationType": "Degree/Certificate/Diploma/etc.",
      "fieldOfStudy": "Main field",
      "subfields": ["Specialization 1", "Specialization 2"],
      "targetRegions": ["Region 1", "Region 2"],
      "budgetRange": {
        "min": minimum annual cost in USD,
        "max": maximum annual cost in USD
      },
      "duration": {
        "min": minimum duration in months,
        "max": maximum duration in months
      },
      "alignment": "Explanation of why this pathway aligns with user's profile and goals",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "queryString": "A search query that would help find specific programs matching this pathway"
    }
  ]
}

Think carefully about each suggestion and ensure they truly fit the user's unique circumstances and goals. Be creative but practical.
`;
  
    // Use a powerful model with strong reasoning capabilities
    const completion = await openai.chat.completions.create({
      model: "o1", // Using latest GPT-4o for best reasoning 
      messages: [
        { role: "system", content: "You are an expert career and education pathway planner with decades of experience." },
        { role: "user", content: prompt }
      ],

      response_format: { type: "json_object" }
    });
    
    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message.content) {
      throw new Error('Failed to generate education pathways');
    }
    
    try {
      // Parse the JSON response
      const pathways = JSON.parse(completion.choices[0].message.content);
      return pathways;
    } catch (error) {
      console.error('Error parsing education pathways JSON:', error);
      throw new Error('Failed to parse education pathways response');
    }
  } catch (error) {
    console.error('Error generating education pathways:', error);
    throw error;
  }
}

/**
 * Program Research Agent
 * Takes education pathway queries and finds specific matching programs
 */
async function researchSpecificPrograms(pathways: any, userProfile: UserProfile): Promise<RecommendationProgram[]> {
  try {
    // Extract the pathways array
    const pathwaysArray = pathways.pathways || [];
    if (pathwaysArray.length === 0) {
      throw new Error('No education pathways provided');
    }

    // Limit to at most 3 pathways to avoid timeouts
    const limitedPathwaysArray = pathwaysArray.slice(0, 3);
    console.log(`Processing ${limitedPathwaysArray.length} education pathways...`);

    // Set a timeout to prevent the function from running too long
    const timeoutMs = 120000; // 120 seconds - increased to allow for API processing
    let hasTimedOut = false;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        hasTimedOut = true;
        reject(new Error('Pathway research timed out after 120 seconds'));
      }, timeoutMs);
    });

    // Process pathways in parallel with Promise.all
    const recommendationsPromise = Promise.all(
      limitedPathwaysArray.map(async (pathway: any, index: number) => {
        if (hasTimedOut) return []; // Skip if already timed out
        
        console.log(`Researching pathway ${index + 1}/${limitedPathwaysArray.length}: ${pathway.title}`);
        const query = constructDetailedQuery(pathway, userProfile);
        
        try {
          // Use searchProgramsWithPerplexityAPI which will handle the API call and parsing
          const results = await searchProgramsWithPerplexityAPI(query, pathway);
          console.log(`Found ${results.length} programs for pathway "${pathway.title}"`);
          return results;
        } catch (error) {
          console.error(`Error searching pathway "${pathway.title}":`, error);
          // Don't fall back to simulated data - let the error propagate
          throw error;
        }
      })
    );
    
    // Race the research promise against the timeout
    const results = await Promise.race([
      recommendationsPromise,
      timeoutPromise
    ]);
    
    // Flatten the results array and remove any empty arrays
    const allRecommendations = (Array.isArray(results) ? results.flat() : [])
      .filter(item => item);
    
    // If we got no recommendations, this is a real issue since APIs are working
    if (allRecommendations.length === 0) {
      console.error('No recommendations found after searching all pathways');
      throw new Error('Failed to find any matching programs for your pathways');
    }
    
    // Log success information
    console.log(`Successfully found ${allRecommendations.length} recommendations using API integration`);
    
    // Sort by match score before returning
    return allRecommendations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Limit to top 10 recommendations
  } catch (error: any) {
    console.error('Error researching specific programs:', {
      message: error.message, 
      stack: error.stack
    });
    
    // Re-throw the error instead of falling back to simulated recommendations
    throw error;
  }
}

/**
 * Constructs a detailed search query for a specific education pathway
 */
function constructDetailedQuery(pathway: any, userProfile: UserProfile): string {
  // Get education history as formatted string
  const educationHistory = userProfile.education.map((edu) => 
    `${edu.degreeLevel} in ${edu.fieldOfStudy} from ${edu.institution}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`
  ).join(', ');

  // Format other profile details
  const skillsList = userProfile.skills.join(', ');
  const preferredLocations = userProfile.preferences.preferredLocations.join(', ');
  const budgetRange = `$${userProfile.preferences.budgetRange.min.toLocaleString()}-$${userProfile.preferences.budgetRange.max.toLocaleString()}`;
  
  // Create a structured query based on the pathway and user profile
  const query = `
Find specific ${pathway.qualificationType} programs in ${pathway.fieldOfStudy} 
${pathway.subfields ? `with specializations like ${pathway.subfields.join(', ')}` : ''}
in ${pathway.targetRegions.join(', ')}. 
Budget range: ${budgetRange} per year. 
Duration: ${pathway.duration.min}-${pathway.duration.max} months.

USER PROFILE DETAILS:
- Name: ${userProfile.firstName} ${userProfile.lastName}
- Education: ${educationHistory}
- Career goals: ${userProfile.careerGoals.shortTerm} (short term), ${userProfile.careerGoals.longTerm} (long term)
- Target industries: ${userProfile.careerGoals.desiredIndustry.join(', ')}
- Target roles: ${userProfile.careerGoals.desiredRoles.join(', ')}
- Skills: ${skillsList}
- Preferred locations: ${preferredLocations}
- Study mode preference: ${userProfile.preferences.studyMode}
- Target start date: ${userProfile.preferences.startDate}
- Documents submitted: ${userProfile.documents ? 
    Object.entries(userProfile.documents)
      .filter(([_value, value]) => value)
      .map(([key]) => key)
      .join(', ') || 'None' 
    : 'None'
  }

Also include any relevant scholarships, financial aid, or other funding opportunities that could help with affordability.

${pathway.queryString || ''}

Format each program as a structured entry with: 
- Name of program
- Institution
- Degree type
- Field of study
- Description
- Annual cost
- Program duration
- Location
- Starting dates
- Application deadlines
- Key requirements
- Program highlights
`;

  return query;
}

/**
 * Enhances recommendations with personalized match scores
 */
function enhanceRecommendationsWithMatchScores(recommendations: any[], userProfile: UserProfile): RecommendationProgram[] {
  return recommendations.map(recommendation => {
    // If the recommendation already has match rationales, use them
    if (recommendation.matchRationale) {
      return recommendation;
    }
    
    // Calculate match rationales based on user profile and recommendation
    const matchRationale = {
      careerAlignment: calculateCareerAlignment(recommendation, userProfile),
      budgetFit: calculateBudgetFit(recommendation, userProfile),
      locationMatch: calculateLocationMatch(recommendation, userProfile),
      academicFit: calculateAcademicFit(recommendation, userProfile)
    };
    
    // Calculate overall match score (weighted average)
    const matchScore = Math.floor(
      (matchRationale.careerAlignment * 0.4) +
      (matchRationale.budgetFit * 0.2) +
      (matchRationale.locationMatch * 0.2) +
      (matchRationale.academicFit * 0.2)
    );
    
    return {
      ...recommendation,
      matchScore,
      matchRationale
    };
  });
}

// Helper functions for calculating match scores

function calculateCareerAlignment(recommendation: any, userProfile: UserProfile): number {
  // Calculate alignment score based on matching fields and career goals
  const programField = recommendation.fieldOfStudy?.toLowerCase() || '';
  const desiredIndustries = userProfile.careerGoals.desiredIndustry.map(i => i.toLowerCase());
  const desiredRoles = userProfile.careerGoals.desiredRoles.map(r => r.toLowerCase());
  
  let score = 75; // Base score
  
  // Check if program field matches any desired industry
  if (desiredIndustries.some(industry => programField.includes(industry))) {
    score += 10;
  }
  
  // Check if program aligns with desired roles
  if (desiredRoles.some(role => programField.includes(role))) {
    score += 10;
  }
  
  return Math.min(95, score); // Cap at 95
}

function calculateBudgetFit(recommendation: any, userProfile: UserProfile): number {
  // Compare program cost with user's budget range
  const userBudgetMax = userProfile.preferences?.budgetRange?.max || 100000;
  
  if (recommendation.costPerYear <= userBudgetMax) {
    // Calculate how well it fits within budget (higher percentage if well under budget)
    return Math.min(100, Math.floor(100 - ((recommendation.costPerYear / userBudgetMax) * 100) + 75));
  } else {
    // Over budget, calculate how much over (lower percentage the more it exceeds)
    return Math.max(50, Math.floor(90 - (((recommendation.costPerYear - userBudgetMax) / userBudgetMax) * 100)));
  }
}

function calculateLocationMatch(recommendation: any, userProfile: UserProfile): number {
  // Check if program location matches any of user's preferred locations
  const preferredLocations = userProfile.preferences?.preferredLocations || [];
  
  if (preferredLocations.length === 0) {
    return 80; // Neutral score if no preferences
  }
  
  // Check for partial matches (e.g., "USA" would match "New York, USA")
  for (const preferred of preferredLocations) {
    if (recommendation.location.includes(preferred)) {
      return 95; // Strong match
    }
    
    // Check for country/region matches
    const preferredCountry = extractCountry(preferred);
    const locationCountry = extractCountry(recommendation.location);
    
    if (preferredCountry && locationCountry && preferredCountry === locationCountry) {
      return 85; // Country match
    }
  }
  
  return 70; // No match
}

function extractCountry(location: string): string | null {
  // Simple function to extract country from location string
  // E.g., "New York, USA" -> "USA"
  const parts = location.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return null;
}

function calculateAcademicFit(recommendation: any, userProfile: UserProfile): number {
  const programLevel = recommendation.degreeLevel?.toLowerCase() || '';
  const userEducation = userProfile.education;
  
  let score = 75; // Base score
  
  // Check if the program level is appropriate given user's education
  const highestDegree = userEducation
    .sort((a, b) => Number(b.graduationYear) - Number(a.graduationYear))[0]?.degreeLevel.toLowerCase();
    
  // Appropriate progression (e.g., Bachelor's to Master's)
  if (
    (highestDegree?.includes('bachelor') && programLevel.includes('master')) ||
    (highestDegree?.includes('master') && programLevel.includes('phd')) ||
    (!highestDegree && programLevel.includes('bachelor'))
  ) {
    score += 15;
  }
  
  // Check if program field matches user's background
  const userFields = userEducation.map(edu => edu.fieldOfStudy.toLowerCase());
  if (userFields.some(field => recommendation.fieldOfStudy?.toLowerCase().includes(field))) {
    score += 5;
  }
  
  return Math.min(95, score); // Cap at 95
} 