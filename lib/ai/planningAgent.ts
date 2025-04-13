import OpenAI from 'openai';
import { UserProfile } from '@/app/types/profile-schema';
import { EducationPathway } from '@/app/recommendations/types';
import { OpenAIError } from 'openai/error';

// Check for required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Define interfaces for better typing and parsing clarity
interface PathwayOutput {
  title: string;
  qualificationType: string;
  fieldOfStudy: string;
  subfields: string[];
  targetRegions: string[];
  budgetRange: {
    min: number;
    max: number;
  };
  duration: {
    min: number;
    max: number;
  };
  alignment: string;
  alternatives: string[];
  queryString: string;
}

interface PathwaysResponse {
  pathways: PathwayOutput[];
}

interface GeneratePathwaysResult {
  pathways: PathwayOutput[];
  responseId?: string;
}

// Define the JSON Schema for the pathway output
const pathwaySchema = {
  type: "object",
  properties: {
    pathways: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "A concise title describing the pathway" },
          qualificationType: { type: "string", description: "The type of qualification/degree suggested (e.g., Degree, Certificate, Diploma)" },
          fieldOfStudy: { type: "string", description: "Main field(s) of study" },
          subfields: { type: "array", items: { type: "string" }, description: "Specialization areas within the field of study" },
          targetRegions: { type: "array", items: { type: "string" }, description: "Geographic region(s) to target for programs" },
          budgetRange: {
            type: "object",
            properties: {
              min: { type: "number", description: "Minimum estimated annual cost in GBP" },
              max: { type: "number", description: "Maximum estimated annual cost in GBP" }
            },
            required: ["min", "max"],
            additionalProperties: false
          },
          duration: {
            type: "object",
            properties: {
              min: { type: "number", description: "Minimum estimated duration in months" },
              max: { type: "number", description: "Maximum estimated duration in months" }
            },
            required: ["min", "max"],
            additionalProperties: false
          },
          alignment: { type: "string", description: "Explanation of why this pathway aligns with the user's profile and goals" },
          alternatives: { type: "array", items: { type: "string" }, description: "Alternative options or variations within this pathway" },
          queryString: { type: "string", description: "A search query that would help find specific programs matching this pathway" }
        },
        required: [
          "title", 
          "qualificationType", 
          "fieldOfStudy", 
          "subfields", 
          "targetRegions", 
          "budgetRange", 
          "duration", 
          "alignment", 
          "alternatives", 
          "queryString"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["pathways"],
  additionalProperties: false
};

/**
 * Career & Education Matcher (Planning Agent)
 * Analyzes the user profile and generates tailored education pathway queries
 */
export async function generateEducationPathways(
  userProfile: UserProfile, 
  previousResponseId?: string,
  existingPathways?: EducationPathway[],
  feedbackContext?: Array<{ pathwaySummary: string; feedback: object }>
): Promise<GeneratePathwaysResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    // Add logging to verify params are being received correctly
    console.log(`generateEducationPathways called with:
      - previousResponseId: ${previousResponseId || 'none'}
      - existingPathways: ${existingPathways?.length || 0} pathways
      - feedbackContext: ${feedbackContext?.length || 0} feedback items`);
    
    if (feedbackContext && feedbackContext.length > 0) {
      console.log('Feedback context examples:', feedbackContext.slice(0, 2));
    }

    // Prepare feedback context for the model if it exists
    const feedbackContextString = feedbackContext && feedbackContext.length > 0 
      ? `\nRECENT USER FEEDBACK:
${feedbackContext.map((item, index) => 
  `${index + 1}. Pathway: "${item.pathwaySummary}"\n   Feedback: ${JSON.stringify(item.feedback)}`
).join("\n\n")}`
      : '';

    // Log the feedback context string for debugging
    if (feedbackContextString) {
      console.log('Feedback context string created:', feedbackContextString.substring(0, 200) + '...');
    }

    // If we have existing pathways, provide them as context
    // Handle different property naming conventions in the EducationPathway type
    const existingPathwaysContext = existingPathways && existingPathways.length > 0
      ? `\nEXISTING PATHWAYS (DO NOT DUPLICATE):
${existingPathways.map((pathway, index) => {
  // Handle different possible property names
  const title = pathway.title || '';
  const qualificationType = pathway.qualification_type || '';
  const fieldOfStudy = pathway.field_of_study || '';
  return `${index + 1}. "${title}" - ${qualificationType} in ${fieldOfStudy}`;
}).join("\n")}`
      : '';

    // Safely access career goals, providing defaults if undefined
    const careerGoals = userProfile.careerGoals || {};
    const shortTermGoal = careerGoals.shortTerm || 'Not specified';
    const longTermGoal = careerGoals.longTerm || 'Not specified';
    const desiredIndustry = Array.isArray(careerGoals.desiredIndustry) ? careerGoals.desiredIndustry.join(', ') : 'Not specified';
    const desiredRoles = Array.isArray(careerGoals.desiredRoles) ? careerGoals.desiredRoles.join(', ') : 'Not specified';

    // Safely access education, providing defaults if undefined
    const educationHistory = Array.isArray(userProfile.education) 
      ? userProfile.education.map((edu) => 
        `${edu.degreeLevel} in ${edu.fieldOfStudy} from ${edu.institution} (${edu.graduationYear})`
      ).join(', ')
      : 'Not specified';

    // Simplified prompt - removed the detailed OUTPUT FORMAT as it's now in the schema
    const prompt = `
Your task is to analyze a user's profile and generate 4 creative, tailored education pathway suggestions.

SPECIFIC DETAILS TO CONSIDER:
1. Educational Background:
   - Current education level: ${educationHistory}
   - Academic performance: ${userProfile.education && Array.isArray(userProfile.education) && userProfile.education.some((edu) => edu.gpa) ? userProfile.education.map((edu) => edu.gpa ? `${edu.gpa} GPA` : '').filter(Boolean).join(', ') : 'Not specified'}

2. Career Goals:
   - Short-term goals: ${shortTermGoal}
   - Long-term goals: ${longTermGoal}
   - Target industries: ${desiredIndustry}
   - Desired roles: ${desiredRoles}

3. Skills & Competencies:
   - ${Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : 'Not specified'}

4. Program Preferences:
   - Preferred locations: ${userProfile.preferences?.preferredLocations?.join(', ') || 'Not specified'}
   - Study mode: ${userProfile.preferences?.studyMode || 'Not specified'}
   - Target start: ${userProfile.preferences?.startDate || 'Not specified'}
   - Budget constraints: $${(userProfile.preferences?.budgetRange?.min ?? 0).toLocaleString()} - $${(userProfile.preferences?.budgetRange?.max ?? 0).toLocaleString()} per year
${existingPathwaysContext}
${feedbackContextString}

INSTRUCTIONS:
1. Analyze the user's background, education history, career goals, skills, preferences and constraints.
2. Consider their budget constraints, location preferences, and time limitations carefully.
3. Think outside the box - don't just suggest the most obvious educational paths.
4. If budget is low, consider alternative routes (e.g., certificates first, then degrees; online options; countries with free/cheaper education).
5. If the user already has degrees, consider if they need additional qualifications or could benefit from specialized certificates instead.
6. Consider both immediate next steps and longer-term educational journeys.
7. If existing pathways are provided, do not repeat them - suggest entirely new alternatives.
8. If user feedback is provided, learn from it to create better, more personalized recommendations.

Think carefully about each suggestion and ensure they truly fit the user's unique circumstances and goals. Be creative but practical. Respond using the required JSON schema.
`;
  
    // Use OpenAI responses API with JSON Schema for structured output
    const requestOptions: any = {
      model: "o3-mini-2025-01-31", // Ensure this model supports json_schema
      input: [
        { role: "system", content: "You are an expert career and education pathway planner. Respond strictly according to the provided JSON schema." },
        { role: "user", content: prompt }
      ],
      text: { 
        format: { 
          type: "json_schema",
          name: "education_pathways", // Added a name for the schema
          schema: pathwaySchema,
          strict: true // Enforce strict schema adherence
        } 
      },
      store: true // Store the conversation so we can reference it later
    };
    
    // If we have a previous response ID, include it to maintain conversation history
    if (previousResponseId) {
      requestOptions.previous_response_id = previousResponseId;
      console.log(`Using previous conversation response ID: ${previousResponseId}`);
    } else {
      console.log('No previous response ID provided, starting new conversation');
    }
    
    console.log("Calling OpenAI Responses API with JSON Schema");

    try {
      const response = await openai.responses.create(requestOptions);
      console.log(`Response received with status: ${response.status}, output types: ${response.output?.map(item => item.type).join(', ') || 'none'}`);

      // Handle potential incomplete responses
      if (response.status === 'incomplete') {
        const reason = response.incomplete_details?.reason || 'unknown';
        const details = (response.incomplete_details as any)?.typedError?.message || '';
        console.error(`OpenAI response incomplete (${reason}): ${details}`);
        throw new Error(`Pathway generation failed: Response was incomplete. Reason: ${reason}${details ? ` - ${details}` : ''}`);
      }

      // Simplified Output Extraction
      let outputText: string | undefined;
      let extractionPath = 'unknown';

      // 1. First try response.output_text (direct API response)
      if (response.output_text) {
        extractionPath = 'direct_output_text';
        outputText = response.output_text;
        console.log(`Extracted text using ${extractionPath}`);
      } 
      // 2. Otherwise, search through response.output
      else if (response.output && Array.isArray(response.output)) {
        // First try to find an assistant message with output_text content
        const messageOutput = response.output.find(item => item.type === 'message');
        
        if (messageOutput && (messageOutput as any).content) {
          const content = (messageOutput as any).content;
          
          // Check for refusals first
          const refusalContent = Array.isArray(content) && content.find(c => c.type === 'refusal');
          if (refusalContent?.type === 'refusal') {
            const refusalMessage = refusalContent.refusal;
            console.error(`OpenAI refused the request: ${refusalMessage}`);
            throw new Error(`Pathway generation failed: AI refused the request. Reason: ${refusalMessage}`);
          }
          
          // Then look for output_text
          const outputTextContent = Array.isArray(content) && content.find(c => c.type === 'output_text');
          if (outputTextContent?.type === 'output_text') {
            extractionPath = 'message_output_text';
            outputText = outputTextContent.text;
            console.log(`Extracted text using ${extractionPath}`);
          }
        }
        
        // If still no output, check reasoning output (common in newer models)
        if (!outputText) {
          const reasoningOutput = response.output.find(item => item.type === 'reasoning');
          if (reasoningOutput && (reasoningOutput as any).text) {
            extractionPath = 'reasoning_text';
            outputText = (reasoningOutput as any).text;
            console.log(`Extracted text using ${extractionPath}`);
          }
        }
        
        // Final fallback: try any item with a text property
        if (!outputText) {
          for (const item of response.output) {
            if ((item as any).text) {
              extractionPath = `fallback_${item.type}_text`;
              outputText = (item as any).text;
              console.log(`Extracted text using ${extractionPath}`);
              break;
            }
          }
        }
      }

      if (!outputText) {
        console.error('Could not find output_text in response');
        throw new Error('Failed to extract any usable text from the AI response. Please try again.');
      }

      console.log(`Successfully extracted output text via ${extractionPath}`);
      console.log(`Output text preview: ${outputText.substring(0, 100)}...`);

      try {
        // Parse the JSON response (which should now strictly adhere to the schema)
        const pathwaysData = JSON.parse(outputText) as PathwaysResponse;
        
        // Validate the parsed data structure
        if (!pathwaysData || !Array.isArray(pathwaysData.pathways)) {
          console.error('Parsed JSON does not match expected structure', 
            pathwaysData ? 'pathways property missing or not an array' : 'null response');
          throw new Error('Failed to parse generated pathways: Invalid JSON structure in AI response.');
        }

        console.log(`Successfully parsed ${pathwaysData.pathways.length} pathways from JSON response`);

        // Include the response ID so it can be referenced in future calls
        return {
          pathways: pathwaysData.pathways,
          responseId: response.id
        };
      } catch (parseError) {
        console.error('JSON parsing error:', parseError instanceof Error ? parseError.message : String(parseError));
        console.error('Raw Output Text:', outputText.substring(0, 500) + (outputText.length > 500 ? '...(truncated)' : ''));
        throw new Error(`Failed to parse education pathways: Invalid JSON in AI response. ${parseError instanceof Error ? parseError.message : ''}`);
      }
    } catch (apiError) {
      // Handle OpenAI API-specific errors
      if (apiError instanceof OpenAIError) {
        console.error(`OpenAI API Error:`, apiError.message);
        throw new Error(`OpenAI API error: ${apiError.message}`);
      }
      // Re-throw other errors
      throw apiError;
    }
  } catch (error) {
    console.error('Error generating education pathways:', error);
    // Re-throw with improved contextual information
    if (error instanceof Error) {
      throw new Error(`Education pathway generation failed: ${error.message}`);
    } else {
      throw new Error(`Education pathway generation failed: ${String(error)}`);
    }
  }
} 