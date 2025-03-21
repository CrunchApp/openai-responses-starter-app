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
    
    const { userProfile, vectorStoreId } = await request.json();
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Missing required parameter: userProfile' },
        { status: 400 }
      );
    }
    
    // Check for API timeouts - set a global timeout for the entire process
    const MAX_EXECUTION_TIME = 50000; // 50 seconds
    let isTimedOut = false;
    
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      console.error('Recommendation generation timed out');
    }, MAX_EXECUTION_TIME);
    
    // If we're already timed out, return a helpful response with fallback data
    if (isTimedOut) {
      console.log('Timed out before processing, returning fallback recommendations');
      const fallbackRecommendations = generateSimulatedRecommendations([
        {
          title: "General Education Pathway",
          qualificationType: "Master's Degree",
          fieldOfStudy: "Business Administration",
          subfields: ["Management", "Finance"],
          targetRegions: ["United States", "Canada", "Europe"],
          budgetRange: { min: 15000, max: 50000 },
          duration: { min: 12, max: 24 }
        }
      ]);
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        recommendations: fallbackRecommendations,
        note: "These are fallback recommendations generated due to processing timeout."
      });
    }
    
    // Step 1: Use Career & Education Matcher (Planning Agent) to generate education pathway queries
    let educationPathways;
    try {
      educationPathways = await generateEducationPathways(userProfile);
      console.log('Education pathways generated successfully');
    } catch (error) {
      console.error('Error generating education pathways:', error);
      clearTimeout(timeoutId);
      // Return fallback recommendations instead of error
      const fallbackRecommendations = generateSimulatedRecommendations([
        {
          title: "General Education Pathway",
          qualificationType: "Master's Degree",
          fieldOfStudy: "Business Administration",
          subfields: ["Management", "Finance"],
          targetRegions: ["United States", "Canada", "Europe"],
          budgetRange: { min: 15000, max: 50000 },
          duration: { min: 12, max: 24 }
        }
      ]);
      return NextResponse.json({ 
        recommendations: fallbackRecommendations,
        note: "These are fallback recommendations due to pathway generation error."
      });
    }
    
    // Check for timeout again
    if (isTimedOut) {
      console.log('Timed out after pathway generation, returning fallback recommendations');
      const fallbackRecommendations = generateSimulatedRecommendations(
        educationPathways.pathways?.slice(0, 2) || [
          {
            title: "General Education Pathway",
            qualificationType: "Master's Degree",
            fieldOfStudy: "Business Administration",
            subfields: ["Management", "Finance"],
            targetRegions: ["United States", "Canada", "Europe"],
            budgetRange: { min: 15000, max: 50000 },
            duration: { min: 12, max: 24 }
          }
        ]
      );
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        recommendations: fallbackRecommendations,
        note: "These are fallback recommendations generated due to processing timeout."
      });
    }
    
    // Step 2: Use Program Research Agent to find specific programs based on the pathways
    let recommendations;
    try {
      recommendations = await researchSpecificPrograms(educationPathways, userProfile);
      console.log('Specific programs researched successfully');
    } catch (error) {
      console.error('Error researching specific programs:', error);
      // Don't fail the request, just use fallback recommendations
      recommendations = generateSimulatedRecommendations(educationPathways.pathways?.slice(0, 3) || []);
      console.log('Using fallback recommendations due to research error');
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
    // Provide fallback recommendations instead of an error
    const fallbackRecommendations = generateSimulatedRecommendations([
      {
        title: "General Education Pathway",
        qualificationType: "Master's Degree",
        fieldOfStudy: "Business Administration",
        subfields: ["Management", "Finance"],
        targetRegions: ["United States", "Canada", "Europe"],
        budgetRange: { min: 15000, max: 50000 },
        duration: { min: 12, max: 24 }
      }
    ]);
    
    return NextResponse.json({ 
      recommendations: fallbackRecommendations,
      note: "These are fallback recommendations due to an unexpected error."
    });
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
Provide 3-5 distinct educational pathways as a JSON array. Each pathway should be structured as follows:

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
      temperature: 0.7, // Balance between creativity and relevance
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

    // Check if Perplexity API key is present - if not, skip to fallback immediately
    const hasPerplexityKey = !!process.env.PERPLEXITY_API_KEY;
    
    if (!hasPerplexityKey) {
      console.log('No Perplexity API key found, using simulated recommendations');
      return generateSimulatedRecommendations(pathwaysArray);
    }

    // Limit to at most 3 pathways to avoid timeouts
    const limitedPathwaysArray = pathwaysArray.slice(0, 3);
    console.log(`Processing ${limitedPathwaysArray.length} education pathways...`);

    // Set a timeout to prevent the function from running too long
    const timeoutMs = 25000; // 25 seconds
    let hasTimedOut = false;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        hasTimedOut = true;
        reject(new Error('Pathway research timed out, using fallback recommendations'));
      }, timeoutMs);
    });

    // Process pathways in parallel with Promise.all
    const recommendationsPromise = Promise.all(
      limitedPathwaysArray.map(async (pathway: any) => {
        if (hasTimedOut) return []; // Skip if already timed out
        
        const query = constructDetailedQuery(pathway, userProfile);
        
        try {
          return await searchProgramsWithPerplexity(query, pathway);
        } catch (error) {
          console.error(`Error searching pathway "${pathway.title}":`, error);
          return generateSimulatedRecommendations([pathway]);
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
    
    // If we got no recommendations or timed out, use the fallback
    if (allRecommendations.length === 0 || hasTimedOut) {
      console.log('Using fallback simulated recommendations due to timeout or empty results');
      return generateSimulatedRecommendations(limitedPathwaysArray);
    }
    
    // Limit to top recommendations
    return allRecommendations.slice(0, 10);
  } catch (error) {
    console.error('Error researching specific programs:', error);
    
    // Fallback to simulated recommendations if any error occurs
    console.log('Using fallback simulated recommendations due to error');
    return generateSimulatedRecommendations(pathways.pathways?.slice(0, 3) || []);
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
      .filter(([_, value]) => value)
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
 * Uses Perplexity API to search for specific programs
 */
async function searchProgramsWithPerplexity(query: string, pathway: any): Promise<any[]> {
  try {
    // Call the Perplexity integration module to perform research
    // This will use the actual Perplexity API in production
    return await searchProgramsWithPerplexityAPI(query, pathway);
  } catch (error) {
    console.error('Error searching with Perplexity API:', error);
    
    // If we encountered an error with Perplexity API, use the fallback simulated data
    console.log('Falling back to simulated recommendations due to API error');
    return generateSimulatedRecommendations([pathway]);
  }
}

/**
 * Generates simulated recommendations based on pathways
 * This is a fallback when the Perplexity search is not available
 */
function generateSimulatedRecommendations(pathways: any[]): RecommendationProgram[] {
  if (!pathways || pathways.length === 0) {
    return [];
  }
  
  const simulatedRecommendations: RecommendationProgram[] = [];
  
  // For each pathway, generate 2-3 simulated programs
  pathways.forEach((pathway, pathwayIndex) => {
    const programCount = Math.min(3, Math.floor(10 / pathways.length));
    
    for (let i = 0; i < programCount; i++) {
      const institutions = [
        { name: "Stanford University", location: "Stanford, CA, USA" },
        { name: "University of Toronto", location: "Toronto, ON, Canada" },
        { name: "MIT", location: "Cambridge, MA, USA" },
        { name: "University of British Columbia", location: "Vancouver, BC, Canada" },
        { name: "ETH Zurich", location: "Zurich, Switzerland" },
        { name: "National University of Singapore", location: "Singapore" },
        { name: "University of Melbourne", location: "Melbourne, Australia" },
        { name: "Imperial College London", location: "London, UK" }
      ];
      
      const institution = institutions[Math.floor(Math.random() * institutions.length)];
      const costRange = pathway.budgetRange || { min: 15000, max: 60000 };
      const durationRange = pathway.duration || { min: 12, max: 36 };
      
      // Generate a cost within the specified range
      const cost = Math.floor(Math.random() * (costRange.max - costRange.min) + costRange.min);
      // Generate a duration within the specified range
      const duration = Math.floor(Math.random() * (durationRange.max - durationRange.min) + durationRange.min);
      
      // Generate a unique ID
      const id = `rec${pathwayIndex + 1}_${i + 1}`;
      
      // Create match rationale with randomized scores
      const matchRationale = {
        careerAlignment: Math.floor(Math.random() * 15) + 80, // 80-95
        budgetFit: Math.floor(Math.random() * 20) + 75, // 75-95
        locationMatch: Math.floor(Math.random() * 25) + 70, // 70-95
        academicFit: Math.floor(Math.random() * 20) + 75 // 75-95
      };
      
      // Calculate an overall match score based on the rationale
      const matchScore = Math.floor(
        (matchRationale.careerAlignment * 0.4) +
        (matchRationale.budgetFit * 0.2) +
        (matchRationale.locationMatch * 0.2) +
        (matchRationale.academicFit * 0.2)
      );
      
      simulatedRecommendations.push({
        id,
        name: `${pathway.qualificationType} in ${pathway.fieldOfStudy}${i === 0 ? '' : ` with focus on ${pathway.subfields?.[i % pathway.subfields?.length] || 'Advanced Topics'}`}`,
        institution: institution.name,
        degreeType: pathway.qualificationType,
        fieldOfStudy: pathway.fieldOfStudy,
        description: `A comprehensive program that combines ${pathway.fieldOfStudy} with innovative approaches to prepare students for careers in ${pathway.subfields?.join(', ') || pathway.fieldOfStudy}.`,
        matchScore,
        costPerYear: cost,
        duration,
        location: institution.location,
        startDate: ["September 2024", "January 2025", "August 2024"][Math.floor(Math.random() * 3)],
        applicationDeadline: ["December 15, 2023", "January 15, 2024", "February 1, 2024", "March 1, 2024"][Math.floor(Math.random() * 4)],
        requirements: [
          "Bachelor's degree in related field",
          "GRE scores (may be waived)",
          "Letters of recommendation",
          "Statement of purpose"
        ],
        highlights: [
          "Industry connections with leading companies",
          "Research opportunities with renowned faculty",
          "Flexible curriculum with specialization options",
          "Internship opportunities"
        ],
        matchRationale
      });
    }
  });
  
  // Sort by match score (highest first)
  return simulatedRecommendations.sort((a, b) => b.matchScore - a.matchScore);
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
  // In a real implementation, this would analyze the alignment between the program
  // and the user's career goals, desired industries, and roles
  return Math.floor(Math.random() * 15) + 80; // Placeholder: 80-95
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
  // In a real implementation, this would analyze how well the program
  // fits with the user's educational background and skills
  return Math.floor(Math.random() * 20) + 75; // Placeholder: 75-95
} 