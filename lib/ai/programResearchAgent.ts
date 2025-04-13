import { RecommendationProgram, UserProfile } from '@/app/recommendations/types';
import { searchProgramsWithPerplexityAPI } from '@/app/api/recommendations/perplexity-integration';

/**
 * Program Research Agent
 * Takes a single education pathway and user profile and finds specific matching programs
 */
export async function researchSpecificPrograms(
  pathway: any, 
  userProfile: UserProfile, 
  pathwayFeedback?: any
): Promise<RecommendationProgram[]> {
  try {
    if (!pathway) {
      throw new Error('No education pathway provided for research');
    }

    console.log(`Researching programs for pathway: ${pathway.title}`);
    
    // Set a timeout to prevent the function from running too long
    const timeoutMs = 240000; // 240 seconds
    let hasTimedOut = false;
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        hasTimedOut = true;
        reject(new Error('Program research timed out after 240 seconds'));
      }, timeoutMs);
    });

    // Normalize pathway object to ensure consistent field naming
    const normalizedPathway = {
      ...pathway,
      // Ensure these fields exist with standard names
      qualificationType: pathway.qualification_type || pathway.qualificationType || 'Degree',
      fieldOfStudy: pathway.field_of_study || pathway.fieldOfStudy || 'General Studies',
      targetRegions: pathway.target_regions || pathway.targetRegions || ['Global'],
      subfields: pathway.subfields || [],
      duration: pathway.duration_months || pathway.duration || { min: 12, max: 24 },
      budgetRange: pathway.budget_range_usd || pathway.budgetRange || { min: 10000, max: 50000 }
    };

    // Construct the detailed query, incorporating any user feedback if provided
    const query = constructDetailedQuery(normalizedPathway, userProfile, pathwayFeedback);
    
    // Create the research promise
    const researchPromise = searchProgramsWithPerplexityAPI(query, normalizedPathway);
    
    // Race the research promise against the timeout
    const results = await Promise.race([
      researchPromise,
      timeoutPromise
    ]);
    
    if (results.length === 0) {
      console.warn(`No programs found for pathway "${pathway.title}"`);
    } else {
      console.log(`Found ${results.length} programs for pathway "${pathway.title}"`);
    }
    
    // Sort by match score before returning
    return results
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 15); // Limit to top 15 recommendations
  } catch (error: any) {
    console.error('Error researching specific programs:', {
      message: error.message, 
      stack: error.stack
    });
    
    // Re-throw the error so the calling code can handle it appropriately
    throw error;
  }
}

/**
 * Constructs a detailed search query for a specific education pathway
 * Incorporates optional user feedback to refine the search
 */
export function constructDetailedQuery(
  pathway: any, 
  userProfile: UserProfile, 
  pathwayFeedback?: any
): string {
  // Get education history as formatted string
  const educationHistory = userProfile.education.map((edu) => 
    `${edu.degreeLevel} in ${edu.fieldOfStudy} from ${edu.institution}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`
  ).join(', ');

  // Format other profile details
  const skillsList = userProfile.skills.join(', ');
  const preferredLocations = userProfile.preferences.preferredLocations.join(', ');
  const budgetRange = `$${userProfile.preferences.budgetRange.min.toLocaleString()}-$${userProfile.preferences.budgetRange.max.toLocaleString()}`;
  
  // Process any user feedback if provided
  let feedbackNotes = '';
  if (pathwayFeedback) {
    feedbackNotes = `
USER FEEDBACK ON THIS PATHWAY:
${pathwayFeedback.comments || 'No specific comments provided'}
${pathwayFeedback.preferences ? `Specific preferences: ${pathwayFeedback.preferences}` : ''}
${pathwayFeedback.concerns ? `Areas of concern: ${pathwayFeedback.concerns}` : ''}
Please take this feedback into account when finding specific programs.
`;
  }
  
  // Access normalized field names
  const qualificationType = pathway.qualificationType;
  const fieldOfStudy = pathway.fieldOfStudy;
  const subfields = Array.isArray(pathway.subfields) ? pathway.subfields.join(', ') : pathway.subfields;
  const targetRegions = Array.isArray(pathway.targetRegions) ? pathway.targetRegions.join(', ') : pathway.targetRegions;
  const duration = pathway.duration;
  
  // Create a structured query based on the pathway and user profile
  const query = `
${pathway.queryString || ''}
Find 5 specific ${qualificationType} programs in ${fieldOfStudy} 
${subfields ? `with specializations like ${subfields}` : ''}
in ${targetRegions}. 
Budget range: ${budgetRange} per year. 
Duration: ${duration.min}-${duration.max} months.
Make sure you include an accurate URL to the program webpage plus any relevant scholarships, financial aid, or other funding opportunities that could help with affordability.

USER PREFERENCES:
- Preferred locations: ${preferredLocations}
- Study mode preference: ${userProfile.preferences.studyMode}
- Target start date: ${userProfile.preferences.startDate}

${feedbackNotes}

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
- Program webpage URL
- Scholarships and funding opportunities
`;

  return query;
} 