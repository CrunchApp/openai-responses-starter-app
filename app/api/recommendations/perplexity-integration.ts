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
  scholarships?: {
    name: string;
    amount: string;
    eligibility: string;
  }[];
}

/**
 * Calls the Perplexity API with a structured query
 */
export async function callPerplexityApi(query: string): Promise<string> {
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
    model: "sonar-reasoning-pro", // Using the reasoning model for better analysis
    messages: [
      { 
        role: "system", 
        content: "You are an expert educational researcher with global knowledge about universities, colleges, and educational programs."
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.1, // Lower temperature for more factual responses
    max_tokens: 10000,
    web_search_options: {
      search_context_size: "high" // Use high search context for more comprehensive results
    },
    top_p: 0.95,
    frequency_penalty: 0.5 // Reduce repetition
  };

  // Log the API call configuration
  console.log('Calling Perplexity API with options:', {
    model: options.model,
    temperature: options.temperature,
    searchContextSize: options.web_search_options?.search_context_size,
    queryLength: query.length
  });

  // Implement retry logic with exponential backoff
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 180000; // Increased from 15s to 180s
  
  let attempts = 0;
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
        
        // Success! Return the content
        console.log('Perplexity API call successful');
        return data.choices[0].message.content;
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
    
    // Use OpenAI to generate research data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { 
          role: "system", 
          content: "You are an educational research assistant with access to global higher education program data."
        },
        { 
          role: "user", 
          content: `Please conduct thorough research on the following educational query and provide detailed information about specific programs that match these criteria: ${query}` 
        }
      ],
      temperature: 0.5,
    });
    
    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message.content) {
      throw new Error('Failed to generate research data with OpenAI fallback');
    }
    
    console.log('OpenAI fallback successful');
    return completion.choices[0].message.content;
  } catch (error: any) {
    console.error('Error with OpenAI fallback:', error.message);
    throw new Error(`Both Perplexity and OpenAI research attempts failed: ${error.message}`);
  }
}

/**
 * Parses the Perplexity API response and extracts structured program data
 */
export async function parsePerplexityResponse(response: string, pathway: any): Promise<any[]> {
  try {
    console.log('Parsing Perplexity API response', { 
      responseLength: response.length,
      pathwayField: pathway.fieldOfStudy,
      pathwayType: pathway.qualificationType 
    });
    
    // Use OpenAI to extract and structure the information from the research data
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not found in environment variables');
      throw new Error('OpenAI API key missing for parsing');
    }

    const prompt = `
    Below is information about education programs from a Perplexity search query.
    Extract all the distinct programs mentioned and format them as structured data.

    For each program, extract the following information:
    - Name of program
    - Institution
    - Degree type (e.g., Bachelor's, Master's, Certificate)
    - Field of study
    - Description (a brief overview of the program)
    - Annual cost in USD (just the number)
    - Program duration in months (just the number)
    - Location
    - Starting dates (when the program typically begins)
    - Application deadlines
    - Requirements (as a list of strings)
    - Program highlights (as a list of strings)
    - Scholarships (optional, if mentioned)

    SEARCH RESPONSE:
    ${response}

    FORMAT AS VALID JSON:
    [
      {
        "name": "Program name",
        "institution": "Institution name",
        "degreeType": "Degree type",
        "fieldOfStudy": "Field of study",
        "description": "Brief description",
        "costPerYear": annual cost as number (in USD),
        "duration": duration in months as number,
        "location": "Location",
        "startDate": "Start date(s)",
        "applicationDeadline": "Application deadline(s)",
        "requirements": ["Requirement 1", "Requirement 2", ...],
        "highlights": ["Highlight 1", "Highlight 2", ...],
        "scholarships": [
          {
            "name": "Scholarship name",
            "amount": "Amount",
            "eligibility": "Eligibility criteria"
          }
        ]
      },
      ...
    ]

    Extract 5 programs maximum. If the exact cost, duration, or other numerical values are not provided, make a reasonable estimate based on similar programs.
    Ensure the JSON is valid and doesn't contain any trailing commas.
    `;

    console.log('Calling OpenAI to parse program data');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: "You are an expert at extracting structured data about education programs from search results." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message.content) {
      throw new Error('Failed to parse program data - no content returned from OpenAI');
    }

    // Parse the JSON response
    const content = completion.choices[0].message.content;
    let programs: ParsedProgram[] = [];
    
    try {
      // The response should be a JSON object with a "programs" array
      const parsedData = JSON.parse(content);
      programs = Array.isArray(parsedData) ? parsedData : (parsedData.programs || []);
      
      console.log(`Successfully parsed ${programs.length} programs from response`);
    } catch (error: any) {
      console.error('Error parsing JSON from completion:', error.message);
      // Try to extract JSON array from the text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          programs = JSON.parse(jsonMatch[0]);
          console.log(`Extracted ${programs.length} programs using regex matching`);
        } catch (parseError: any) {
          console.error('Failed to parse JSON after regex extraction:', parseError.message);
          throw new Error('Could not parse program data from response - invalid JSON format');
        }
      } else {
        throw new Error('Could not parse program data from response - no JSON found');
      }
    }

    if (programs.length === 0) {
      console.warn('No programs extracted from response - returning empty result');
    }

    // Calculate match scores based on pathway alignment
    const enrichedPrograms = programs.map((program, index) => {
      // Calculate base match score starting from 95 and decreasing by 3 per rank
      let baseScore = Math.max(70, 95 - (index * 3));
      
      // Adjust score based on pathway alignment
      let alignmentBonus = 0;
      
      // Check for degree type match
      if (program.degreeType.toLowerCase().includes(pathway.qualificationType.toLowerCase())) {
        alignmentBonus += 2;
      }
      
      // Check for field match
      if (program.fieldOfStudy.toLowerCase().includes(pathway.fieldOfStudy.toLowerCase())) {
        alignmentBonus += 3;
      }
      
      // Final match score
      const matchScore = Math.min(98, baseScore + alignmentBonus);
      
      // Calculate match rationale components
      const careerAlignmentScore = Math.min(98, Math.floor(matchScore + Math.random() * 4 - 2));
      const budgetFitScore = Math.min(95, Math.floor(85 + Math.random() * 10));
      const locationMatchScore = Math.min(95, Math.floor(88 + Math.random() * 7));
      const academicFitScore = Math.min(98, Math.floor(matchScore + Math.random() * 3));
      
      return {
        id: `prg_${Date.now()}_${index}`,
        ...program,
        fieldOfStudy: program.fieldOfStudy || pathway.fieldOfStudy,
        degreeType: program.degreeType || pathway.qualificationType,
        matchScore,
        matchRationale: {
          careerAlignment: careerAlignmentScore,
          budgetFit: budgetFitScore,
          locationMatch: locationMatchScore,
          academicFit: academicFitScore
        }
      };
    });
    
    console.log(`Returning ${enrichedPrograms.length} enriched programs with match scores`);
    return enrichedPrograms;
  } catch (error: any) {
    console.error('Error parsing Perplexity response:', error.message);
    throw error;
  }
}

/**
 * Main function to search for programs using Perplexity
 * Combines the API call and parsing in one function
 */
export async function searchProgramsWithPerplexityAPI(query: string, pathway: any): Promise<any[]> {
  console.log('Starting Perplexity search for programs', { 
    pathwayTitle: pathway.title,
    queryLength: query.length 
  });
  
  try {
    // First, call the Perplexity API with the query
    console.log('Calling Perplexity API for education program data');
    const perplexityResponse = await callPerplexityApi(query);
    
    // Then parse the response to extract structured program data
    console.log('Parsing Perplexity response into structured program data');
    const programs = await parsePerplexityResponse(perplexityResponse, pathway);
    
    console.log(`Perplexity search complete, found ${programs.length} matching programs`);
    return programs;
  } catch (error: any) {
    // Add detailed error information
    console.error('Error with Perplexity search:', {
      message: error.message,
      pathway: pathway.title,
      error: error.toString()
    });
    throw error;
  }
}