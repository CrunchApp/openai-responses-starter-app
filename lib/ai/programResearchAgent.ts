import { RecommendationProgram, UserProfile } from '@/app/recommendations/types';
import { searchProgramsWithPerplexityAPI } from '@/app/api/recommendations/perplexity-integration';

/**
 * Program Research Agent
 * Takes a single education pathway and user profile and finds specific matching programs
 * Updated to accept previousResponseId for context
 */
export async function researchSpecificPrograms(
  pathway: any, 
  userProfile: UserProfile, 
  pathwayFeedback?: any,
  previousResponseId?: string
): Promise<RecommendationProgram[]> {
  try {
    if (!pathway) {
      throw new Error('No education pathway provided for research');
    }

    console.log(`Researching programs for pathway: ${pathway.title}`);
    
    // The overall research operation can exceed 4 min when Perplexity itself takes a long time.
    // Allow ops to control the limit via env var so we stay in sync with the Perplexity request timeout.
    const timeoutMs = process.env.PROGRAM_RESEARCH_TIMEOUT_MS
      ? Number(process.env.PROGRAM_RESEARCH_TIMEOUT_MS)
      : 480000; // 8 minutes
    let hasTimedOut = false;
    
    // Create a timeout promise with detailed logging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        hasTimedOut = true;
        console.error(`[ResearchAgent] Global research operation exceeded ${timeoutMs} ms and will be aborted.`);
        reject(new Error(`Program research timed out after ${timeoutMs / 1000} seconds`));
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
      budgetRange: pathway.budget_range_usd || pathway.budgetRange || { min: 10000, max: 50000 },
      // Ensure queryString is preserved regardless of casing in DB
      queryString: pathway.queryString || pathway.query_string || ''
    };

    // Construct the detailed query, incorporating any user feedback if provided
    const query = constructDetailedQuery(normalizedPathway, userProfile, pathwayFeedback);
    
    // Create the research promise
    const researchPromise = searchProgramsWithPerplexityAPI(
      query, 
      normalizedPathway,
      userProfile,
      previousResponseId
    );
    
    // Race the research promise against the timeout
    const startTime = Date.now();
    const results = await Promise.race([
      researchPromise,
      timeoutPromise
    ]);
    
    console.log(`[ResearchAgent] Completed in ${Date.now() - startTime} ms`);
    
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
  
  // ----------  Construct the research prompt  ----------
  // Use the pathway-supplied boolean search string when available so that
  // the LLM starts its reasoning with an information‑dense query.
  // If it is missing (edge‑case), build a minimal fallback.

  const fallbackSearchQuery = `(${qualificationType} ${fieldOfStudy}) ${(Array.isArray(targetRegions) ? targetRegions.join(" OR ") : targetRegions)}`.trim();

  const searchQuery = (pathway.queryString && pathway.queryString.length > 10)
    ? pathway.queryString.trim()
    : fallbackSearchQuery;

  // Safely access duration values
  const durationMin = typeof duration === 'object' && duration?.min !== undefined ? duration.min : 6;
  const durationMax = typeof duration === 'object' && duration?.max !== undefined ? duration.max : 36;

  const query = `SEARCH_QUERY: ${searchQuery}

Use the above boolean search query verbatim when performing web searches.

Now, based on the search results, provide a comprehensive list of educational programs that match **ALL** of the following structured filters:
  • TYPE: ${qualificationType}
  • FIELD: ${fieldOfStudy}${subfields ? ` (specialisations: ${subfields})` : ''}
  • LOCATION: ${targetRegions}
  • ANNUAL TUITION: ${budgetRange} USD (or lower)
  • DURATION: ${durationMin}-${durationMax} months

USER PREFERENCES:
  – Study mode: ${userProfile.preferences.studyMode}
  – Preferred start date: ${userProfile.preferences.startDate || 'flexible'}

${feedbackNotes}

OUTPUT GUIDELINES:
1. Return **at least 10** distinct programs (10-15 preferred) in a numbered list.
2. For **each** program include **all** of the following fields:
     - Program name and degree/certificate type
     - Institution name
     - Field of study / specialisations
     - Detailed program description
     - Annual tuition cost (USD)
     - Program duration in months
     - Location (city, country or online)
     - Typical start dates & application deadlines
     - Key admission requirements (bullet list)
     - Program highlights / unique features (bullet list)
     - Direct **URL** to the program webpage (NOT the general university site)
     - Available scholarships / financial aid options
3. Ensure URLs are valid and up‑to‑date.
4. Prioritise programs that match the stated budget and preferred locations.
5. **Do NOT** truncate or omit details – provide complete entries.

Begin your response exactly with the token "PROGRAM LIST:" then the numbered programs.`;

  return query;
} 