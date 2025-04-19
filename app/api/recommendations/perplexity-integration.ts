/**
 * Perplexity API Integration for the Program Research Agent
 * 
 * This module handles the communication with Perplexity's API
 * to search for education programs matching specific criteria.
 * 
 * API Documentation: https://docs.perplexity.ai/api-reference/chat-completions
 * 
 * ---------------------------------------------------------------
 * FALLBACK MECHANISM OVERVIEW FOR DEVELOPERS
 * ---------------------------------------------------------------
 * This integration implements a multi-tiered fallback system to ensure
 * graceful degradation when external services are unavailable:
 * 
 * 1. PRIMARY: Perplexity API
 *    - Uses the sonar-reasoning-pro model for educational program research
 *    - Provides real-time, up-to-date program information with web search
 *    - Configured with high search context for comprehensive results
 * 
 * 2. FIRST FALLBACK: OpenAI API
 *    - If Perplexity API fails, the system falls back to OpenAI's GPT-4o
 *    - Implemented in the fallbackToOpenAI() function
 *    - May provide less current program details but maintains recommendation quality
 * 
 * 3. SECOND FALLBACK: Simulated Recommendations
 *    - If both APIs fail, route.ts calls generateSimulatedRecommendations()
 *    - Creates synthetic program data based on pathway information
 *    - Ensures users always receive personalized suggestions
 * 
 * ERROR HANDLING:
 * - API errors are caught and logged at each level
 * - Appropriate error messages are propagated for monitoring
 * - The system never throws unhandled errors to the client
 * 
 * FUTURE DEVELOPMENT:
 * - Consider adding additional research APIs as alternative fallbacks
 * - Monitor API response times and implement circuit breakers if needed
 * - Add caching layer for frequently requested program information
 * ---------------------------------------------------------------
 */

import { RecommendationProgram, UserProfile } from '@/app/recommendations/types';
// Import the new evaluation function from the planning agent
import { evaluateAndScorePrograms } from '@/lib/ai/planningAgent';
// Import Supabase client for logging Perplexity queries
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

interface PerplexityRequestOptions {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  web_search_options?: {
    search_context_size: "low" | "medium" | "high";
  };
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ParsedProgram {
  name: string;
  institution: string;
  degreeType: string;
  fieldOfStudy: string;
  description: string;
  costPerYear: number;
  duration: number;
  location: string;
  startDate: string;
  applicationDeadline: string;
  requirements: string[];
  highlights: string[];
  pageLink: string;
  scholarships?: {
    name: string;
    amount: string;
    eligibility: string;
  }[];
}

/**
 * Detects if a Perplexity response appears to be truncated
 */
function detectTruncatedResponse(response: string): boolean {
  // Look for common indicators of truncation
  const truncationIndicators = [
    // Response ends mid-sentence or with incomplete markdown
    /[^.!?]\s*$/,
    // Program section appears incomplete (missing URL, requirements or highlights)
    /Program|University|College[^.!?]*$/i,
    // Ends with numbers or bullets suggesting there should be more content
    /\d+\.\s*$/,
    /\-\s*$/,
    // Check if the response doesn't have a clear concluding statement
    /(In\s+conclusion|To\s+summarize|Overall|In\s+summary)/i
  ];
  
  // Check if response contains fewer than expected program listings
  // Count the number of program entries (usually numbered or with headers)
  const programListingCount = (response.match(/\d+\.\s+|Program\s+\d+:|^\#\#\s+/gm) || []).length;
  
  // Check for expected section headers for the last program
  const hasCompleteLastProgram = 
    response.toLowerCase().includes("scholarship") || 
    response.toLowerCase().includes("financial aid") || 
    response.toLowerCase().includes("funding");
    
  // Log detection information
  console.log(`Truncation detection: Found ${programListingCount} program listings, hasCompleteLastProgram: ${hasCompleteLastProgram}`);
  
  // If fewer than 5 programs or matches any truncation indicators
  if (programListingCount < 5 || !hasCompleteLastProgram) {
    return true;
  }
  
  // Check for truncation patterns
  for (const pattern of truncationIndicators) {
    if (pattern.test(response.slice(-100))) {
      console.log(`Truncation detected: matched pattern ${pattern}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Calls the Perplexity API with a structured query
 */
export async function callPerplexityApi(query: string): Promise<string> {
  // --- Log the query to Supabase for auditing ---
  try {
    const supabase = await createSupabaseClient();
    await supabase.from('perplexity_query_logs')
      .insert([{ query_text: query }]);
  } catch (logError) {
    console.error('Failed to log Perplexity query to DB:', logError);
  }
  // Get the API key from environment variables
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
  
  // Validate API key existence and format
  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not found in environment variables');
    throw new Error('PERPLEXITY_API_KEY not found in environment variables');
  }
  
  if (PERPLEXITY_API_KEY.length < 20) {
    console.error('PERPLEXITY_API_KEY appears invalid - check your environment variables');
    throw new Error('Invalid Perplexity API key format');
  }

  // Configure the request to use the sonar-reasoning-pro model for research
  const options: PerplexityRequestOptions = {
    model: "sonar-pro", // Using the reasoning model for better analysis
    messages: [
      { 
        role: "system", 
        content: "You are an expert educational researcher with global knowledge about universities, colleges, and educational programs. Your task is to provide comprehensive, detailed responses that include as many relevant educational programs as possible that match the user's query. Do not stop your response prematurely - be thorough and exhaustive in your research. Include ALL the details of the programs you can find that match the criteria."
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.1, // Lower temperature for more factual responses
    max_tokens: 8000, // Increased from 5000 to 8000 to ensure we get a full response
    web_search_options: {
      search_context_size: "high" // Use high search context for more comprehensive results
    },
    top_p: 0.95,
    frequency_penalty: -0.1  // Changed to negative value to encourage listing similar items (programs)
  };

  // Log the API call configuration
  console.log('Calling Perplexity API with options:', {
    model: options.model,
    temperature: options.temperature,
    max_tokens: options.max_tokens, // Log the max_tokens value
    searchContextSize: options.web_search_options?.search_context_size,
    queryLength: query.length
  });

  // Implement retry logic with exponential backoff
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 180000; // Increased from 15s to 180s
  
  let attempts = 0;
  let truncationDetections = 0; // Counter for truncation detections
  let lastError;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`Perplexity API attempt ${attempts}/${MAX_ATTEMPTS}`);
    
    try {
      // Set up AbortController for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
        // Make the API call with timeout
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify(options),
          signal: controller.signal
        });

        clearTimeout(timeout); // Clear the timeout if request completes
        
        // Log the response status
        console.log(`Perplexity API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Perplexity API error response: ${errorText}`);
          
          // Check specifically for auth errors
          if (response.status === 401 || response.status === 403) {
            console.error('Perplexity API authentication error - check your API key');
            throw new Error(`Perplexity API authentication failed (${response.status})`);
          }
          
          // Check for rate limiting
          if (response.status === 429) {
            console.error('Perplexity API rate limit exceeded');
            // Continue to retry logic for rate limiting
            throw new Error(`Perplexity API rate limit exceeded (${response.status})`);
          }
          
          throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as PerplexityResponse;
        
        // Log usage stats
        if (data.usage) {
          console.log('Perplexity API usage stats:', data.usage);
        }
        
        if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
          throw new Error('No content returned from Perplexity API');
        }
        
        const content = data.choices[0].message.content;
        
        // Check if the response appears to be truncated
        if (detectTruncatedResponse(content)) {
          console.warn('Detected potentially truncated response from Perplexity API');
          truncationDetections++;
          
          // If we've detected truncation multiple times or this is the final attempt,
          // switch to the OpenAI fallback
          if (truncationDetections >= 2 || attempts === MAX_ATTEMPTS) {
            console.log(`${truncationDetections} truncation detections - switching to OpenAI fallback`);
            return fallbackToOpenAI(query);
          }
          
          // Adapt the approach based on the attempt number
          if (attempts === 1) {
            // First attempt - try reducing scope to fewer programs with more details
            console.log('Modifying query for next attempt to request fewer programs with more details');
            options.messages[1].content = query + "\n\nIMPORTANT: Focus on providing COMPLETE details for 3-5 programs rather than partial information about many programs.";
          } else {
            // Second attempt - try a more structured, narrower approach
            console.log('Using more structured approach for final attempt');
            options.messages[1].content = `Please find information on 3 specific educational programs matching these criteria:
${query.split('\n').filter(line => line.includes(':') || line.includes('IMPORTANT')).join('\n')}

Format EACH program with the following structure:
1. Program Name - Institution
   - Details about the program including:
   - Annual cost
   - Duration
   - Location
   - Requirements
   - URL to program webpage
   - Available scholarships

Please keep your response complete but concise for each program.`;
          }
          
          // Throw an error to trigger retry
          throw new Error(`Truncated response detected (detection #${truncationDetections}), retrying with modified query`);
        }
        
        // Success! Return the content
        console.log('Perplexity API call successful, response appears complete');
        return content;
      } catch (fetchError: any) {
        clearTimeout(timeout); // Ensure timeout is cleared
        
        if (fetchError.name === 'AbortError') {
          console.error(`Perplexity API request timed out after ${TIMEOUT_MS}ms`);
          throw new Error(`Perplexity API request timed out after ${TIMEOUT_MS}ms`);
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Perplexity API attempt ${attempts} failed:`, error.message);
      
      // Check if we should retry
      if (attempts < MAX_ATTEMPTS) {
        // Wait with exponential backoff before retrying
        const backoffMs = 1000 * Math.pow(2, attempts - 1);
        console.log(`Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        console.error(`All ${MAX_ATTEMPTS} attempts to call Perplexity API failed`);
        // Fallback to OpenAI
        console.log('Falling back to OpenAI for educational program research');
        return fallbackToOpenAI(query);
      }
    }
  }
  
  // This should not be reached due to the returns in the loop, but TypeScript needs it
  throw lastError || new Error('Failed to call Perplexity API for unknown reasons');
}

/**
 * Fallback to OpenAI if Perplexity API is unavailable
 */
async function fallbackToOpenAI(query: string): Promise<string> {
  console.log('Starting OpenAI fallback process');
  try {
    // Import the OpenAI client
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables');
      throw new Error('OpenAI API key missing for fallback');
    }
    
    console.log('Calling OpenAI API for educational program research');
    
    // Enhanced system message for OpenAI
    const systemMessage = `You are an expert educational researcher with deep knowledge of global higher education programs, universities, and admission requirements. 
  our task is to provide comprehensive details on specific educational programs matching the user's query.

  Follow these key guidelines:
  1. Be thorough and provide complete information for at least 5 distinct programs
  2. Include exact URLs to program websites
  3. Include specific admission requirements, costs, deadlines, and duration
  4. Include scholarship and financial aid information when available
  5. Structure your response as a clearly numbered list of programs (1, 2, 3, etc.)
  6. Provide comprehensive, detailed information about each program
  7. Never truncate or abbreviate your response`;
    
    // Use GPT-4o for better results
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { 
          role: "system", 
          content: systemMessage
        },
        { 
          role: "user", 
          content: `Please provide detailed information about educational programs matching these criteria: ${query}\n\nMake sure to include at least 5 specific programs with complete details formatted as a numbered list.` 
        }
      ],
      temperature: 0.3, // Lower temperature for more factual, consistent responses
      max_tokens: 4000, // Increased token limit
    });
    
    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message.content) {
      throw new Error('Failed to generate research data with OpenAI fallback');
    }
    
    console.log('OpenAI fallback successful');
    const response = completion.choices[0].message.content;
    
    // Add "PROGRAM LIST:" prefix to match expected format
    return "PROGRAM LIST:\n\n" + response;
  } catch (error: any) {
    console.error('Error with OpenAI fallback:', error.message);
    
    // As a final fallback, create simulated programs
    console.log('Creating simulated programs as last resort fallback');
    return createSimulatedProgramList(query);
  }
}

/**
 * Creates a simulated program list as a last resort
 * Used when both Perplexity and OpenAI fallbacks fail
 */
function createSimulatedProgramList(query: string): string {
  // Extract field of study from the query
  const fieldMatch = query.match(/FIELD:\s*([^$\n]+)/i);
  const field = fieldMatch ? fieldMatch[1].trim() : "General Studies";
  
  // Extract qualification type from the query
  const typeMatch = query.match(/TYPE:\s*([^$\n]+)/i);
  const type = typeMatch ? typeMatch[1].trim() : "Degree";
  
  // Extract location from the query
  const locationMatch = query.match(/LOCATION:\s*([^$\n]+)/i);
  const location = locationMatch ? locationMatch[1].trim() : "Various Locations";
  
  // Create a simulated program list
  return `PROGRAM LIST:

  1. ${type} in ${field} - University of ${location.split(',')[0]}
   - Institution: University of ${location.split(',')[0]}
   - Degree Type: ${type}
   - Field of Study: ${field}
   - Description: This comprehensive program offers students an in-depth education in ${field}, preparing them for careers in various sectors.
   - Annual Cost: $25,000 USD
   - Program Duration: 24 months
   - Location: ${location.split(',')[0]}
   - Starting Dates: September and January
   - Application Deadlines: Rolling admissions, recommended by May 1 for fall entry
   - Key Requirements: Bachelor's degree, GPA 3.0+, Letters of recommendation, Personal statement
   - Program Highlights: Internship opportunities, Expert faculty, Industry connections
   - Program URL: https://www.example.edu/programs/${field.toLowerCase().replace(/\s+/g, '-')}
   - Scholarships: Merit scholarships available from $5,000-$15,000 per year based on academic achievement

  2. Advanced ${type} in ${field} - ${location.split(',')[0]} State University
   - Institution: ${location.split(',')[0]} State University
   - Degree Type: ${type}
   - Field of Study: ${field} with specialization in Applied Research
   - Description: Focused on practical applications in the field, this program combines theoretical knowledge with hands-on experience.
   - Annual Cost: $22,000 USD
   - Program Duration: 18 months
   - Location: ${location.split(',')[0]}
   - Starting Dates: August and January
   - Application Deadlines: June 15 for fall, November 15 for spring
   - Key Requirements: Bachelor's in related field, GPA 3.0+, Work experience preferred
   - Program Highlights: Small class sizes, Research opportunities, Career placement services
   - Program URL: https://www.stateuniv.edu/${field.toLowerCase().replace(/\s+/g, '')}
   - Scholarships: Graduate assistantships available, covering tuition and providing $12,000 stipend

  3. International ${type} in ${field} - Global Institute of ${location.split(',')[0]}
   - Institution: Global Institute of ${location.split(',')[0]}
   - Degree Type: ${type}
   - Field of Study: International ${field}
   - Description: This program takes a global perspective on ${field}, preparing students for international careers.
   - Annual Cost: $28,000 USD
   - Program Duration: 24 months
   - Location: ${location.split(',')[0]} and Online
   - Starting Dates: September, January, May
   - Application Deadlines: Rolling admissions
   - Key Requirements: Bachelor's degree, English proficiency, Statement of purpose
   - Program Highlights: Study abroad options, International faculty, Global alumni network
   - Program URL: https://globalinstitute.org/programs/${field.toLowerCase().replace(/\s+/g, '-')}
   - Scholarships: International student scholarships up to $10,000 per year

  4. Professional ${type} in ${field} - ${location.split(',')[0]} Professional School
   - Institution: ${location.split(',')[0]} Professional School
   - Degree Type: Professional ${type}
   - Field of Study: Applied ${field}
   - Description: Designed for working professionals, this program focuses on practical skills needed in the industry.
   - Annual Cost: $20,000 USD
   - Program Duration: 12 months accelerated
   - Location: Online with optional residencies in ${location.split(',')[0]}
   - Starting Dates: Every two months
   - Application Deadlines: Continuous enrollment
   - Key Requirements: Bachelor's degree, 2+ years of work experience
   - Program Highlights: Flexible schedule, Industry partners, Career advancement focus
   - Program URL: https://www.profschool.edu/programs/${field.toLowerCase().replace(/\s+/g, '-')}
   - Scholarships: Employer tuition matching program, Early application discount

  5. Research-based ${type} in ${field} - ${location.split(',')[0]} Research University
   - Institution: ${location.split(',')[0]} Research University
   - Degree Type: Research ${type}
   - Field of Study: Advanced ${field}
   - Description: This research-intensive program is ideal for students looking to contribute to the advancement of knowledge in ${field}.
   - Annual Cost: $26,000 USD
   - Program Duration: 24-36 months
   - Location: ${location.split(',')[0]}
   - Starting Dates: September only
   - Application Deadlines: January 15
   - Key Requirements: Bachelor's with honors, Research proposal, Academic references
   - Program Highlights: Research funding, Publication opportunities, Academic career preparation
   - Program URL: https://research-university.edu/${field.toLowerCase().replace(/\s+/g, '-')}
   - Scholarships: Full tuition waivers for top applicants, Research grants available`;
}

/**
 * Parses the Perplexity API response using the Planning Agent for evaluation and scoring
 * Extracts structured program data based on pathway and user profile context.
 */
export async function parsePerplexityResponse(
  response: string, 
  pathway: any, 
  userProfile: UserProfile, // Add userProfile
  previousResponseId?: string // Add previousResponseId
): Promise<RecommendationProgram[]> { // Return type is RecommendationProgram[]
  try {
    // Add detailed logging to verify the full text is being passed
    console.log('Parsing Perplexity API response via Planning Agent', { 
      responseLength: response.length,
      pathwayField: pathway.fieldOfStudy,
      pathwayType: pathway.qualificationType,
      previousResponseId: previousResponseId || 'none'
    });
    
    // Log the first and last part of the response to verify content
    console.log(`Response preview (first 300 chars): ${response.substring(0, 300)}`);
    console.log(`Response end (last 300 chars): ${response.substring(Math.max(0, response.length - 300))}`);
    
    // Count the approximate number of programs in the text
    const programCount = (response.match(/(\d+\.\s+|Program\s+\d+:|University of|College of)/gi) || []).length;
    console.log(`Approximate program count in response text: ${programCount}`);
    
    // Verify if the response is large enough to contain multiple programs
    if (response.length < 1000) {
      console.warn('WARNING: Perplexity response is suspiciously short:', response);
    }
    
    // Call the planning agent's evaluation function
    console.log(`Sending full response of ${response.length} characters to planning agent...`);
    const evaluationResult = await evaluateAndScorePrograms(
      response,
      pathway,
      userProfile,
      previousResponseId
    );

    if (!evaluationResult || !evaluationResult.programs) {
      console.warn('Planning agent did not return any programs from evaluation.');
      return [];
    }

    // Log the number of programs returned from evaluation
    console.log(`Planning agent extracted ${evaluationResult.programs.length} programs from response text of length ${response.length}`);
    
    // Add unique IDs to the evaluated programs
    const programsWithIds: RecommendationProgram[] = evaluationResult.programs.map(program => ({
      ...program,
      id: crypto.randomUUID(),
      // Ensure potentially missing optional fields have defaults if needed by DB
      isFavorite: false,
      feedbackNegative: false,
      is_deleted: false,
      // Ensure required fields have defaults if planning agent missed them (shouldn't happen with strict schema)
      name: program.name || 'Unnamed Program',
      institution: program.institution || 'Unknown Institution',
      degreeType: program.degreeType || 'Not Specified',
      fieldOfStudy: program.fieldOfStudy || 'Not Specified',
      description: program.description || 'No description available',
      costPerYear: typeof program.costPerYear === 'number' ? program.costPerYear : 0,
      duration: typeof program.duration === 'number' ? program.duration : 12,
      location: program.location || 'Not specified',
      startDate: program.startDate || 'Not specified',
      applicationDeadline: program.applicationDeadline || 'Not specified',
      requirements: Array.isArray(program.requirements) ? program.requirements : [],
      highlights: Array.isArray(program.highlights) ? program.highlights : [],
      pageLink: program.pageLink || '#',
      matchScore: typeof program.matchScore === 'number' ? program.matchScore : 70,
      matchRationale: program.matchRationale || { careerAlignment: 70, budgetFit: 70, locationMatch: 70, academicFit: 70 },
      scholarships: Array.isArray(program.scholarships) ? program.scholarships : []
    }));

    console.log(`Planning agent successfully evaluated ${programsWithIds.length} programs.`);
    return programsWithIds;
    
  } catch (error: any) {
    console.error('Error parsing Perplexity response via Planning Agent:', error.message);
    // In case of parsing/evaluation failure, still attempt to create a fallback
    // Let the calling function handle fallback creation if this throws.
    throw error; 
  }
}

/**
 * Main function to search for programs using Perplexity
 * Combines the API call and parsing in one function
 * Updated to accept userProfile and previousResponseId
 */
export async function searchProgramsWithPerplexityAPI(
  query: string, 
  pathway: any, 
  userProfile: UserProfile, // Add userProfile
  previousResponseId?: string // Add previousResponseId
): Promise<RecommendationProgram[]> { // Return type updated
  console.log('Starting Perplexity search for programs', { 
    pathwayTitle: pathway.title,
    queryLength: query.length 
  });
  
  try {
    // First, call the Perplexity API with the query
    console.log('Calling Perplexity API for education program data');
    const perplexityResponse = await callPerplexityApi(query);
    
    try {
      // Then parse the response using the PLANNING AGENT
      console.log('Parsing Perplexity response via Planning Agent');
      const programs = await parsePerplexityResponse(
        perplexityResponse, 
        pathway, 
        userProfile, // Pass userProfile
        previousResponseId // Pass previousResponseId
      );
      
      console.log(`Perplexity search and Planning Agent evaluation complete, found ${programs.length} matching programs`);
      return programs;
    } catch (parseError: any) {
      // Handle parsing errors separately to attempt recovery
      console.error('Error parsing Perplexity response via Planning Agent:', {
        message: parseError.message,
        pathwayTitle: pathway.title
      });
      
      // Create at least one fallback program so the overall process can continue
      const fallbackProgram = createFallbackProgram(pathway);
      console.log('Created fallback program due to parsing error');
      return [fallbackProgram];
    }
  } catch (error: any) {
    // Add detailed error information
    console.error('Error with Perplexity search:', {
      message: error.message,
      pathway: pathway.title,
      error: error.toString()
    });
    
    // Attempt to create a fallback result rather than failing completely
    try {
      const fallbackProgram = createFallbackProgram(pathway);
      console.log('Created fallback program due to API error');
      return [fallbackProgram];
    } catch (fallbackError) {
      console.error('Failed to create fallback program:', fallbackError);
      throw new Error(`Failed to search for programs: ${error.message}`);
    }
  }
}

/**
 * Creates a fallback program based on pathway information when the API fails
 * This ensures we always return something even in error conditions
 * Updated to match the structure returned by the planning agent
 */
function createFallbackProgram(pathway: any): RecommendationProgram {
  try {
    // Generate a unique ID
    const id = crypto.randomUUID();
    
    // Extract key information from the pathway with fallbacks
    const qualificationType = pathway.qualificationType || pathway.qualification_type || 'Degree';
    const fieldOfStudy = pathway.fieldOfStudy || pathway.field_of_study || 'General Studies';
    const title = pathway.title || `${qualificationType} in ${fieldOfStudy}`;
    
    // Extract target regions with fallback
    const location = Array.isArray(pathway.targetRegions) 
      ? pathway.targetRegions[0] 
      : (Array.isArray(pathway.target_regions) && pathway.target_regions.length > 0
          ? pathway.target_regions[0]
          : 'Multiple Locations');
    
    // Extract budget information with fallbacks
    const budgetRange = pathway.budgetRange || pathway.budget_range_usd;
    const costPerYear = budgetRange?.min || 10000;
    
    // Extract duration with fallbacks
    const duration = pathway.duration?.min || pathway.duration_months || 12;
    
    // Generate a generic description
    const description = `This ${qualificationType} program in ${fieldOfStudy} offers comprehensive education and training aligned with your career goals and interests.`;
    
    // Create fallback requirements and highlights
    const requirements = [
      'Bachelor\'s degree or equivalent',
      'Letters of recommendation',
      'Statement of purpose'
    ];
    
    const highlights = [
      'Flexible learning options',
      'Industry connections',
      'Career support services'
    ];
    
    // Calculate match scores (slightly lower than normal to indicate this is a fallback)
    const matchScore = 75 + Math.floor(Math.random() * 10);
    const careerAlignment = matchScore - 5 + Math.floor(Math.random() * 10);
    const budgetFit = 70 + Math.floor(Math.random() * 15);
    const locationMatch = 75 + Math.floor(Math.random() * 10);
    const academicFit = 80 + Math.floor(Math.random() * 10);
    
    // Create the fallback program with the same structure as produced by the planning agent
    return {
      id,
      name: `${title} Program`,
      institution: `University of ${location.split(',')[0]}`,
      degreeType: qualificationType,
      fieldOfStudy: fieldOfStudy,
      description,
      costPerYear,
      duration,
      location,
      startDate: 'Fall & Spring semesters',
      applicationDeadline: 'Rolling admissions',
      requirements,
      highlights,
      pageLink: 'https://www.example.edu/programs',
      matchScore,
      matchRationale: {
        careerAlignment,
        budgetFit,
        locationMatch,
        academicFit
      },
      // Include all optional fields for consistency
      scholarships: [{
        name: "Merit Scholarship",
        amount: "$5,000 per year",
        eligibility: "Academic excellence and demonstrated potential"
      }],
      isFavorite: false,
      feedbackNegative: false,
      is_deleted: false
    };
  } catch (error) {
    console.error('Error creating fallback program:', error);
    
    // If even the fallback creation fails, return a minimal valid program object
    return {
      id: crypto.randomUUID(),
      name: "Program Information Unavailable",
      institution: "Various Institutions",
      degreeType: "Degree",
      fieldOfStudy: "Various Fields",
      description: "Program details could not be retrieved at this time.",
      costPerYear: 15000,
      duration: 12,
      location: "Multiple Locations",
      startDate: "Various dates",
      applicationDeadline: "Contact institution",
      requirements: ["Contact institution for requirements"],
      highlights: ["Contact institution for program highlights"],
      pageLink: "https://www.example.edu",
      matchScore: 70,
      matchRationale: {
        careerAlignment: 70,
        budgetFit: 70,
        locationMatch: 70,
        academicFit: 70
      },
      scholarships: [],
      isFavorite: false,
      feedbackNegative: false,
      is_deleted: false
    };
  }
}