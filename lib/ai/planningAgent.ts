import OpenAI from 'openai';
import { UserProfile } from '@/app/types/profile-schema';
import { EducationPathway, RecommendationProgram } from '@/app/recommendations/types';
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

// Define the JSON Schema for the program evaluation output
const programEvaluationSchema = {
  "type": "object",
  "properties": {
    "programs": {
      "type": "array",
      "description": "List of programs evaluated.",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the program."
          },
          "institution": {
            "type": "string",
            "description": "Name of the institution offering the program."
          },
          "degreeType": {
            "type": "string",
            "description": "Type of degree or qualification (e.g., Bachelor's, Master's)."
          },
          "fieldOfStudy": {
            "type": "string",
            "description": "Main field of study."
          },
          "description": {
            "type": "string",
            "description": "Brief description of the program."
          },
          "costPerYear": {
            "type": "number",
            "description": "Estimated annual cost in USD. Estimate if not explicitly mentioned."
          },
          "duration": {
            "type": "number",
            "description": "Program duration in months. Estimate if not explicitly mentioned."
          },
          "location": {
            "type": "string",
            "description": "Location of the program (City, Country or Online)."
          },
          "startDate": {
            "type": "string",
            "description": "Typical start date(s)."
          },
          "applicationDeadline": {
            "type": "string",
            "description": "Application deadline(s)."
          },
          "requirements": {
            "type": "array",
            "description": "Key admission requirements.",
            "items": {
              "type": "string"
            }
          },
          "highlights": {
            "type": "array",
            "description": "Key program highlights or unique selling points.",
            "items": {
              "type": "string"
            }
          },
          "pageLink": {
            "type": "string",
            "description": "Direct URL to the program's webpage."
          },
          "scholarships": {
            "type": "array",
            "description": "List of potential scholarships mentioned.",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string",
                  "description": "Name of the scholarship."
                },
                "amount": {
                  "type": "string",
                  "description": "Financial amount of the scholarship."
                },
                "eligibility": {
                  "type": "string",
                  "description": "Eligibility criteria for the scholarship."
                }
              },
              "required": [
                "name",
                "amount",
                "eligibility"
              ],
              "additionalProperties": false
            }
          },
          "matchScore": {
            "type": "number",
            "description": "Overall match score (0-100) based on alignment with pathway and user profile."
          },
          "matchRationale": {
            "type": "object",
            "description": "Breakdown of match scores based on specific criteria.",
            "properties": {
              "careerAlignment": {
                "type": "number",
                "description": "Score based on alignment with user's career goals."
              },
              "budgetFit": {
                "type": "number",
                "description": "Score based on how well the cost fits the user's budget."
              },
              "locationMatch": {
                "type": "number",
                "description": "Score based on alignment with user's location preferences."
              },
              "academicFit": {
                "type": "number",
                "description": "Score based on academic prerequisites and user's background."
              }
            },
            "required": [
              "careerAlignment",
              "budgetFit",
              "locationMatch",
              "academicFit"
            ],
            "additionalProperties": false
          }
        },
        "required": [
          "name",
          "institution",
          "degreeType",
          "fieldOfStudy",
          "description",
          "costPerYear",
          "duration",
          "location",
          "startDate",
          "applicationDeadline",
          "requirements",
          "highlights",
          "pageLink",
          "scholarships",
          "matchScore",
          "matchRationale"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "programs"
  ],
  "additionalProperties": false
};

// Define interface for the structured output (excluding generated ID)
interface EvaluatedProgramOutput extends Omit<RecommendationProgram, 'id'> {}

// Updated return type to include responseId
interface ProgramEvaluationResponse {
  programs: EvaluatedProgramOutput[];
  responseId?: string; // Added responseId
}

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
    const shortTermGoal = careerGoals.shortTerm !== undefined && careerGoals.shortTerm !== null 
      ? careerGoals.shortTerm 
      : 'Not specified';
    const longTermGoal = careerGoals.longTerm !== undefined && careerGoals.longTerm !== null 
      ? careerGoals.longTerm 
      : 'Not specified';
    const achievements = careerGoals.achievements !== undefined && careerGoals.achievements !== null && careerGoals.achievements.trim() !== ''
      ? careerGoals.achievements
      : 'Not specified';
    const desiredIndustry = Array.isArray(careerGoals.desiredIndustry) && careerGoals.desiredIndustry.length > 0
      ? careerGoals.desiredIndustry.join(', ') 
      : 'Not specified';
    const desiredRoles = Array.isArray(careerGoals.desiredRoles) && careerGoals.desiredRoles.length > 0
      ? careerGoals.desiredRoles.join(', ') 
      : 'Not specified';

    // Additional debug logging for career goals and preferences
    console.log('DEBUG - Career Goals Processing:');
    console.log('Raw careerGoals:', JSON.stringify(careerGoals));
    console.log('Processed shortTermGoal:', shortTermGoal);
    console.log('Processed longTermGoal:', longTermGoal);
    console.log('Processed desiredIndustry:', desiredIndustry);
    console.log('Processed desiredRoles:', desiredRoles);
    console.log('Preferences:', JSON.stringify(userProfile.preferences));
    
    // Safely access education, providing defaults if undefined
    const validEducation = Array.isArray(userProfile.education)
      ? userProfile.education.filter((edu) =>
          edu.degreeLevel !== "__NONE__" &&
          edu.fieldOfStudy.trim() !== "" &&
          edu.institution.trim() !== "" &&
          edu.graduationYear.trim() !== ""
        )
      : [];
    const educationHistory = validEducation.length > 0
      ? validEducation
          .sort((a, b) => Number(b.graduationYear) - Number(a.graduationYear))
          .map((edu) => {
            const degree = edu.degreeLevel;
            const field = edu.fieldOfStudy;
            const institution = edu.institution;
            const graduationYear = edu.graduationYear;
            const gpaInfo = edu.gpa ? `, GPA: ${edu.gpa}` : "";
            return `- ${graduationYear}: ${degree} in ${field} from ${institution}${gpaInfo}`;
          })
          .join("\n")
      : "Not specified";

    // NEW: Build richer context strings for additional profile attributes
    const targetStudyLevel = userProfile.targetStudyLevel && userProfile.targetStudyLevel !== '__NONE__' 
      ? userProfile.targetStudyLevel 
      : 'Not specified';

    const languageProficiencySummary = Array.isArray(userProfile.languageProficiency) && userProfile.languageProficiency.length > 0
      ? userProfile.languageProficiency.map((lp) => {
          const testInfo = lp.testType && lp.score ? `, ${lp.testType}: ${lp.score}` : '';
          return `${lp.language} (${lp.proficiencyLevel}${testInfo})`;
        }).join(', ')
      : 'Not specified';

    const preferredDurationSummary = userProfile.preferences?.preferredDuration && (userProfile.preferences.preferredDuration.min || userProfile.preferences.preferredDuration.max)
      ? `${userProfile.preferences.preferredDuration.min ?? 'any'} - ${userProfile.preferences.preferredDuration.max ?? 'any'} ${userProfile.preferences.preferredDuration.unit || 'months'}`
      : 'Not specified';

    const preferredStudyLanguage = userProfile.preferences?.preferredStudyLanguage && userProfile.preferences?.preferredStudyLanguage !== '__NONE__'
      ? userProfile.preferences.preferredStudyLanguage
      : 'Not specified';

    const livingExpensesBudgetSummary = userProfile.preferences?.livingExpensesBudget && (userProfile.preferences.livingExpensesBudget.min || userProfile.preferences.livingExpensesBudget.max)
      ? `$${(userProfile.preferences.livingExpensesBudget.min ?? 0).toLocaleString()} - $${(userProfile.preferences.livingExpensesBudget.max ?? 'any').toLocaleString()} ${userProfile.preferences.livingExpensesBudget.currency || 'USD'}`
      : 'Not specified';

    const residencyInterest = typeof userProfile.preferences?.residencyInterest === 'boolean'
      ? (userProfile.preferences.residencyInterest ? 'Yes' : 'No')
      : 'Not specified';

    // ---------------- Developer & User messages ----------------
    const developerPrompt = `You are an expert career and education pathway planner.

TASK: Generate exactly 4 distinct, creative education pathway suggestions that strictly adhere to the \"education_pathways\" JSON schema provided via the request. Do **NOT** return any keys that are not part of the schema and do **NOT** output anything outside of the single JSON object.

IMPORTANT GUIDELINES (read carefully):
1. For every pathway you propose, you **MUST** populate the \\"queryString\\" field with a concise but information‑rich boolean style search query that can be fed directly into downstream research agents.  Build this string so that it can be copied verbatim into a web search.
    • Incorporate the key pathway attributes where relevant:
      – qualificationType (include common synonyms, e.g. "Master OR MSc" or "Bachelor OR BSc").
      – fieldOfStudy and any subfields/specialisations (wrap multi‑word terms in quotes).
      – targetRegions or specific countries/cities (use OR to enumerate alternatives).
      – budgetRange limits, e.g. "tuition under $15,000 per year" when a max budget is present.
      – expected duration descriptors, e.g. "duration 12‑24 months".
      – preferred study mode keywords (online, on‑campus, hybrid) if implied by the pathway.
      – start date or intake season keywords when specified.
    • Use boolean operators (AND / OR), parentheses, quotes and comparative phrases ("under $X", "less than 2 years") to narrow results.
    • Aim for < 300 characters while still being expressive.
    • Example pattern: (\"Master of Data Science\" OR \"MSc Data Science\") AND (UK OR \"United Kingdom\") AND (tuition under $20k) AND (duration 12‑24 months).

2. The \"alignment\" field should *explicitly* state why this pathway matches the **specific** user profile attributes supplied (skills, goals, location, budget, etc.). The downstream UI surfaces this text to the user.

3. Ensure that \"alternatives\" provides at least 2 plausible variations or neighbouring options (e.g. related degree types, adjacent specialisations, different study regions) so the system can pivot if no programs are found.

4. Think step‑by‑step but only return the final JSON object.`;

    // USER context (full profile & feedback) with explicit delimiters
    const prompt = `<USER_PROFILE>
### Personal Details
- Preferred name: ${userProfile.preferredName || userProfile.firstName}
- Current location: ${userProfile.currentLocation || 'Not specified'}
- Nationality: ${userProfile.nationality || 'Not specified'}
- Target study level: ${targetStudyLevel}

### Education History
${educationHistory}

### Career Goals
- Short‑term: ${shortTermGoal}
- Long‑term: ${longTermGoal}
- Desired industries: ${desiredIndustry}
- Desired roles: ${desiredRoles}
- Achievements: ${achievements}

### Skills
${Array.isArray(userProfile.skills) && userProfile.skills.length > 0 ? userProfile.skills.join(', ') : 'Not specified'}

### Language Proficiency
${languageProficiencySummary}

### Preferences
- Preferred locations: ${userProfile.preferences?.preferredLocations?.join(', ') || 'Not specified'}
- Study mode: ${userProfile.preferences?.studyMode || 'Not specified'}
- Preferred start date: ${userProfile.preferences?.startDate || 'Not specified'}
- Preferred duration: ${preferredDurationSummary}
- Preferred study language: ${preferredStudyLanguage}
- Tuition budget (annual): $${(userProfile.preferences?.budgetRange?.min ?? 0).toLocaleString()} - $${(userProfile.preferences?.budgetRange?.max ?? 0).toLocaleString()}
- Living expenses budget: ${livingExpensesBudgetSummary}
- Post‑study residency interest: ${residencyInterest}
</USER_PROFILE>

<EXISTING_PATHWAYS>
${existingPathwaysContext || 'None'}
</EXISTING_PATHWAYS>

<FEEDBACK_CONTEXT>
${feedbackContextString || 'None'}
</FEEDBACK_CONTEXT>`;
  
    // Use OpenAI responses API with JSON Schema for structured output
    const requestOptions: any = {
      model: "o4-mini-2025-04-16", // Latest reasoning model with json_schema support
      reasoning: { effort: "medium" },
      input: [
        { role: "developer", content: developerPrompt },
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

/**
 * Evaluates programs found by programResearchAgent against
 * a specific education pathway and user profile, calculating match scores.
 * Now accepts previousResponseId and returns a responseId.
 */
export async function evaluateAndScorePrograms(
  perplexityResponseText: string,
  pathway: EducationPathway, // Use the specific type
  userProfile: UserProfile,
  previousResponseId?: string // Accept previousResponseId
): Promise<ProgramEvaluationResponse> { // Updated return type
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    if (!perplexityResponseText) {
      throw new Error('Missing Perplexity response text');
    }
    if (!pathway) {
      throw new Error('Missing pathway context');
    }
    if (!userProfile) {
      throw new Error('Missing user profile context');
    }

    // Add detailed logging to verify full text is received
    console.log(`evaluateAndScorePrograms called for pathway: ${pathway.title}`);
    console.log(`Received perplexityResponseText: ${perplexityResponseText.length} characters`);
    console.log(`First 200 chars: ${perplexityResponseText.substring(0, 200)}`);
    console.log(`Last 200 chars: ${perplexityResponseText.substring(Math.max(0, perplexityResponseText.length - 200))}`);
    
    // Verify text is large enough
    if (perplexityResponseText.length < 1000) {
      console.warn('WARNING: perplexityResponseText is suspiciously short. Full text:', perplexityResponseText);
    }
    
    // Check for potential truncation markers
    const hasTruncationMarkers = perplexityResponseText.includes('...');
    if (hasTruncationMarkers) {
      console.warn('WARNING: perplexityResponseText contains ellipsis (...) which might indicate truncation');
    }
    
    console.log(`Using previous response ID: ${previousResponseId || 'none'}`);
    
    // Add debug logging to inspect the schema structure
    console.log('Program evaluation schema structure:', JSON.stringify(programEvaluationSchema).substring(0, 100) + '...');

    // --- Prepare Request Options ---
    const requestOptions: any = {
      model: "o4-mini-2025-04-16",
      store: true // Ensure conversation state is stored
    };
    
    // If we have a previous response ID, use it to maintain conversation context
    if (previousResponseId) {
      // When using previous_response_id, we don't need to reconstruct the full context
      // as the model already has access to the conversation history
      console.log('Using previous conversation context via previous_response_id');
      requestOptions.previous_response_id = previousResponseId;
      
      // With conversation history, we only need to send the new user message
      const userMessage = `I managed to find the following programs for the ${pathway.qualification_type || 'degree'} program in ${pathway.field_of_study || 'the field'} that you suggested. Please evaluate these programs against your recommendation and my profile.

Research results:
\`\`\`
${perplexityResponseText}
\`\`\`

Please review the results and for each program, assign specific 'matchRationale' scores (0-100) for:
    -   'careerAlignment': How well the program aligns with user's stated career goals and desired roles/industries.
    -   'budgetFit': How well the program's cost fits within the user's and pathway's budget range.
    -   'locationMatch': How well the program's location aligns with user's and pathway's preferred regions.
    -   'academicFit': How well the program's field, degree level, and potential prerequisites align with the user's education history and the pathway's intent.

Then, calculate an overall 'matchScore' (0-100) reflecting the holistic fit.

Finally, pick the top 5 programs with the highest overall matchScore and return your analysis in a structured JSON format.

Respond ONLY with the valid JSON object conforming strictly to the provided schema. Do not include explanations outside the JSON structure.`;
      
      requestOptions.input = [
        {
          role: "user",
          content: userMessage
        }
      ];
      
      // Add logging to verify prompt content
      console.log(`Prompt with previous_response_id constructed. Total length: ${userMessage.length} characters`);
      console.log(`Research results section starts at char ${userMessage.indexOf('Research results:')}`);
      console.log(`Research results section length: ${perplexityResponseText.length} characters`);
      
      // Verify the prompt contains the full perplexity text
      if (!userMessage.includes(perplexityResponseText.substring(0, 100)) || 
          !userMessage.includes(perplexityResponseText.substring(perplexityResponseText.length - 100))) {
        console.warn('WARNING: Prompt may not contain the full perplexity response text!');
      }
      
      // Use the same JSON schema format to ensure structured output
      requestOptions.text = { 
        format: { 
          type: "json_schema",
          name: "program_evaluation",
          schema: programEvaluationSchema,
          strict: true 
        } 
      };
    } else {
      // If no previous_response_id is available, fall back to the full context construction
      console.log('No previous conversation context, creating detailed prompt');
      
      // --- Prepare Context ---
      // User Profile Summary
      const evalValidEducation = Array.isArray(userProfile.education)
        ? userProfile.education.filter((edu) =>
            edu.degreeLevel !== "__NONE__" &&
            edu.fieldOfStudy.trim() !== "" &&
            edu.institution.trim() !== "" &&
            edu.graduationYear.trim() !== ""
          )
        : [];
      const evalEducationHistory = evalValidEducation.length > 0
        ? evalValidEducation
            .sort((a, b) => Number(b.graduationYear) - Number(a.graduationYear))
            .map((edu) => {
              const degree = edu.degreeLevel;
              const field = edu.fieldOfStudy;
              const institution = edu.institution;
              const graduationYear = edu.graduationYear;
              const gpaInfo = edu.gpa ? `, GPA: ${edu.gpa}` : "";
              return `- ${graduationYear}: ${degree} in ${field} from ${institution}${gpaInfo}`;
            })
            .join("\n")
        : "Not specified";
      const careerGoals = userProfile.careerGoals || {};
      const shortTermGoal = careerGoals.shortTerm !== undefined && careerGoals.shortTerm !== null 
        ? careerGoals.shortTerm 
        : 'Not specified';
      const longTermGoal = careerGoals.longTerm !== undefined && careerGoals.longTerm !== null 
        ? careerGoals.longTerm 
        : 'Not specified';
      const achievements = careerGoals.achievements !== undefined && careerGoals.achievements !== null && careerGoals.achievements.trim() !== ''
        ? careerGoals.achievements
        : 'Not specified';
      const desiredIndustry = Array.isArray(careerGoals.desiredIndustry) && careerGoals.desiredIndustry.length > 0
        ? careerGoals.desiredIndustry.join(', ') 
        : 'Not specified';
      const desiredRoles = Array.isArray(careerGoals.desiredRoles) && careerGoals.desiredRoles.length > 0
        ? careerGoals.desiredRoles.join(', ') 
        : 'Not specified';
      const skillsList = Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : 'Not specified';
      const preferences = userProfile.preferences || {};
      const preferredLocations = preferences.preferredLocations?.join(', ') || 'Not specified';
      const budgetRange = `$${(preferences.budgetRange?.min ?? 0).toLocaleString()} - $${(preferences.budgetRange?.max ?? 0).toLocaleString()} per year`;

      // Pathway Context
      const pathwayContext = `
PATHWAY CONTEXT:
- Title: ${pathway.title}
- Qualification: ${pathway.qualification_type}
- Field: ${pathway.field_of_study} ${pathway.subfields ? `(${pathway.subfields.join(', ')})` : ''}
- Target Regions: ${pathway.target_regions?.join(', ') || 'Global'}
- Budget (Annual USD): $${pathway.budget_range_usd?.min?.toLocaleString()} - $${pathway.budget_range_usd?.max?.toLocaleString()}
- Duration (Months): ${pathway.duration_months || 'Not specified'}
- Alignment Rationale: ${pathway.alignment_rationale || 'Not specified'}
`;

      // --- Construct Full Prompt ---
      const prompt = `
You are an expert education program evaluator. Your task is to analyze the following research results (from Perplexity) about education programs, evaluate their fit against a specific pathway and user profile, and calculate meaningful match scores.

RESEARCH RESULTS:
\`\`\`
${perplexityResponseText}
\`\`\`

${pathwayContext}

USER PROFILE SUMMARY:
- Career Goals: Short-term: ${shortTermGoal}; Long-term: ${longTermGoal}; Industries: ${desiredIndustry}; Roles: ${desiredRoles}
- Education: ${evalEducationHistory}
- Skills: ${skillsList}
- Preferences: Locations: ${preferredLocations}; Budget: ${budgetRange}; Study Mode: ${preferences.studyMode || 'Any'}; Start Date: ${preferences.startDate || 'Any'}

INSTRUCTIONS:
1.  Parse the 'RESEARCH RESULTS' to identify distinct educational programs (aim for 5).
2.  For each program, extract the details required by the JSON schema (Name, Institution, Degree Type, Field, Description, Cost/Year (USD), Duration (months), Location, Start Date, Deadline, Requirements, Highlights, URL, Scholarships). If cost or duration are not explicit, provide a reasonable estimate based on the program type and location.
3.  Evaluate each program against the 'PATHWAY CONTEXT' and 'USER PROFILE SUMMARY'.
4.  Calculate an overall 'matchScore' (0-100) reflecting the holistic fit.
5.  Calculate specific 'matchRationale' scores (0-100) for:
    -   'careerAlignment': How well the program aligns with user's stated career goals and desired roles/industries.
    -   'budgetFit': How well the program's cost fits within the user's and pathway's budget range.
    -   'locationMatch': How well the program's location aligns with user's and pathway's preferred regions.
    -   'academicFit': How well the program's field, degree level, and potential prerequisites align with the user's education history and the pathway's intent.
6.  Respond ONLY with the valid JSON object conforming strictly to the provided schema. Do not include explanations outside the JSON structure.

Think critically about the alignment. The match scores should be quantitative reflections of the fit based on the provided context.
`;

      // Add validation for the full prompt construction
      console.log(`Full prompt constructed. Total length: ${prompt.length} characters`);
      console.log(`Research results section starts at char ${prompt.indexOf('RESEARCH RESULTS:')}`);
      console.log(`Research results section length: ${perplexityResponseText.length} characters`);
      
      // Verify the prompt contains the full perplexity text
      if (!prompt.includes(perplexityResponseText.substring(0, 100)) || 
          !prompt.includes(perplexityResponseText.substring(perplexityResponseText.length - 100))) {
        console.warn('WARNING: Full prompt may not contain the complete perplexity response text!');
      }
      
      // Analyze potential truncation - if the prompt is very large, OpenAI might truncate it
      if (prompt.length > 100000) {
        console.warn(`WARNING: Full prompt is very large (${prompt.length} chars), which may exceed API limits`);
      }

      // --- Set up request options for new conversation ---
      requestOptions.input = [
        { role: "system", content: "You are an expert education program evaluator. Respond strictly according to the provided JSON schema." },
        { role: "user", content: prompt }
      ];
      requestOptions.text = { 
        format: { 
          type: "json_schema",
          name: "program_evaluation",
          schema: programEvaluationSchema,
          strict: true 
        } 
      };
    }
    
    // --- Call OpenAI API ---
    console.log("Calling OpenAI Responses API for program evaluation");
    console.log("Request format configuration:", JSON.stringify(requestOptions.text.format).substring(0, 150) + '...');
    
    try {
      const response = await openai.responses.create(requestOptions);
      console.log(`Evaluation response received with status: ${response.status}`);

      // --- Process Response ---
      if (response.status === 'incomplete') {
        const reason = response.incomplete_details?.reason || 'unknown';
        const details = (response.incomplete_details as any)?.typedError?.message || '';
        console.error(`OpenAI evaluation response incomplete (${reason}): ${details}`);
        throw new Error(`Program evaluation failed: Response was incomplete. Reason: ${reason}${details ? ` - ${details}` : ''}`);
      }

      // Extract output text (similar logic as generateEducationPathways)
      let outputText: string | undefined;
      if (response.output_text) {
        outputText = response.output_text;
      } else if (response.output && Array.isArray(response.output)) {
        const messageOutput = response.output.find(item => item.type === 'message');
        if (messageOutput && (messageOutput as any).content) {
          const content = (messageOutput as any).content;
          const refusalContent = Array.isArray(content) && content.find(c => c.type === 'refusal');
           if (refusalContent?.type === 'refusal') {
             throw new Error(`Program evaluation failed: AI refused the request. Reason: ${refusalContent.refusal}`);
           }
          const outputTextContent = Array.isArray(content) && content.find(c => c.type === 'output_text');
          if (outputTextContent?.type === 'output_text') {
            outputText = outputTextContent.text;
          }
        }
         if (!outputText) {
           const reasoningOutput = response.output.find(item => item.type === 'reasoning');
           if (reasoningOutput && (reasoningOutput as any).text) {
             outputText = (reasoningOutput as any).text;
           }
         }
         if (!outputText) {
           for (const item of response.output) {
             if ((item as any).text) {
               outputText = (item as any).text;
               break;
             }
           }
         }
      }

      if (!outputText) {
        console.error('Could not find output_text in evaluation response');
        throw new Error('Failed to extract any usable text from the AI evaluation response.');
      }

      console.log(`Successfully extracted evaluation output text.`);
      
      try {
        const evaluatedData = JSON.parse(outputText) as ProgramEvaluationResponse;

        if (!evaluatedData || !Array.isArray(evaluatedData.programs)) {
          console.error('Parsed evaluation JSON does not match expected structure');
          throw new Error('Failed to parse evaluated programs: Invalid JSON structure.');
        }

        console.log(`Successfully parsed ${evaluatedData.programs.length} evaluated programs.`);
        
        // Add verification of the number of programs
        if (evaluatedData.programs.length < 3) {
          console.warn(`WARNING: Only ${evaluatedData.programs.length} programs were extracted. This may indicate text truncation.`);
          console.warn(`Original perplexityResponseText length: ${perplexityResponseText.length} characters.`);
          
          // Count the approximate number of programs in the original text
          const programMatches = perplexityResponseText.match(/(\d+\.\s+|Program\s+\d+:|University of|College of)/gi) || [];
          console.warn(`Approximate program mentions in original text: ${programMatches.length}`);
          
          // If there's a significant discrepancy, log a more severe warning
          if (programMatches.length > 5 && evaluatedData.programs.length < 3) {
            console.error(`CRITICAL: Text analysis suggests ${programMatches.length} programs in original text, but only ${evaluatedData.programs.length} were extracted. Text was likely truncated.`);
          }
        }
        
        // Return the parsed data along with the response ID
        return {
          programs: evaluatedData.programs, // Note: The caller (parsePerplexityResponse) will add unique IDs.
          responseId: response.id // Return the response ID
        }; 
        
      } catch (parseError) {
        console.error('JSON parsing error during evaluation:', parseError instanceof Error ? parseError.message : String(parseError));
        console.error('Raw Evaluation Output Text:', outputText.substring(0, 500) + (outputText.length > 500 ? '...(truncated)' : ''));
        throw new Error(`Failed to parse evaluated programs: Invalid JSON. ${parseError instanceof Error ? parseError.message : ''}`);
      }
    } catch (apiError) {
      if (apiError instanceof OpenAIError) {
        console.error(`OpenAI API Error during evaluation:`, apiError.message);
        throw new Error(`OpenAI API error during evaluation: ${apiError.message}`);
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error evaluating and scoring programs:', error);
    if (error instanceof Error) {
      throw new Error(`Program evaluation failed: ${error.message}`);
    } else {
      throw new Error(`Program evaluation failed: ${String(error)}`);
    }
  }
}

/**
 * Retrieves more evaluated programs based on previous conversation context.
 */
export async function getMoreEvaluatedPrograms(
  previousResponseId: string,
  pathway: EducationPathway,
  userProfile: UserProfile,
  userRequest: string // e.g., "Find 5 more distinct programs, prioritizing affordability."
): Promise<ProgramEvaluationResponse> { // Returns programs and the new responseId
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    if (!previousResponseId) {
      throw new Error('Missing previousResponseId for conversation context');
    }
    if (!pathway) {
      throw new Error('Missing pathway context');
    }
    if (!userProfile) {
      throw new Error('Missing user profile context');
    }
    if (!userRequest) {
      throw new Error('Missing user request for getting more programs');
    }

    console.log(`getMoreEvaluatedPrograms called for pathway: ${pathway.title} using previousResponseId: ${previousResponseId}`);

    // Construct the user message for the follow-up request
    const followUpMessage = `Based on our previous conversation (where you evaluated programs for the ${pathway.qualification_type} in ${pathway.field_of_study}), please find more programs matching that pathway and my profile.

${userRequest}

Please ensure these programs are *distinct* from the ones you previously recommended in this conversation thread. Evaluate these new programs using the same criteria and scoring rationale as before (careerAlignment, budgetFit, locationMatch, academicFit, overall matchScore).

Respond ONLY with the valid JSON object conforming strictly to the program evaluation schema. Do not include explanations outside the JSON structure. Only include the *new* programs found.`;

    // Prepare Request Options
    const requestOptions: any = {
      model: "o4-mini-2025-04-16",
      store: true, // Ensure conversation state is stored
      previous_response_id: previousResponseId, // Link to the previous evaluation
      input: [
        {
          role: "user",
          content: followUpMessage
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "program_evaluation", // Use the same schema name
          schema: programEvaluationSchema,
          strict: true
        }
      }
    };

    console.log("Calling OpenAI Responses API for *more* program evaluations");
    
    try {
      const response = await openai.responses.create(requestOptions);
      console.log(`'Get More' evaluation response received with status: ${response.status}`);

      // Process Response (similar to evaluateAndScorePrograms)
      if (response.status === 'incomplete') {
        const reason = response.incomplete_details?.reason || 'unknown';
        const details = (response.incomplete_details as any)?.typedError?.message || '';
        console.error(`OpenAI 'Get More' evaluation response incomplete (${reason}): ${details}`);
        throw new Error(`'Get More' program evaluation failed: Response incomplete. Reason: ${reason}${details ? ` - ${details}` : ''}`);
      }

      // Extract output text
      let outputText: string | undefined;
      // ... (Extraction logic identical to evaluateAndScorePrograms - omitted for brevity, assume it works) ...
       if (response.output_text) {
         outputText = response.output_text;
       } else if (response.output && Array.isArray(response.output)) {
         const messageOutput = response.output.find(item => item.type === 'message');
         if (messageOutput && (messageOutput as any).content) {
           const content = (messageOutput as any).content;
           const refusalContent = Array.isArray(content) && content.find(c => c.type === 'refusal');
            if (refusalContent?.type === 'refusal') {
              throw new Error(`'Get More' evaluation failed: AI refused request. Reason: ${refusalContent.refusal}`);
            }
           const outputTextContent = Array.isArray(content) && content.find(c => c.type === 'output_text');
           if (outputTextContent?.type === 'output_text') {
             outputText = outputTextContent.text;
           }
         }
          if (!outputText) {
            const reasoningOutput = response.output.find(item => item.type === 'reasoning');
            if (reasoningOutput && (reasoningOutput as any).text) {
              outputText = (reasoningOutput as any).text;
            }
          }
          if (!outputText) {
            for (const item of response.output) {
              if ((item as any).text) {
                outputText = (item as any).text;
                break;
              }
            }
          }
       }

      if (!outputText) {
        console.error('Could not find output_text in \'Get More\' evaluation response');
        throw new Error('Failed to extract usable text from the AI \'Get More\' evaluation response.');
      }

      console.log(`Successfully extracted 'Get More' evaluation output text.`);

      try {
        const evaluatedData = JSON.parse(outputText) as ProgramEvaluationResponse;

        if (!evaluatedData || !Array.isArray(evaluatedData.programs)) {
          console.error('Parsed \'Get More\' evaluation JSON does not match expected structure');
          throw new Error('Failed to parse additional evaluated programs: Invalid JSON structure.');
        }

        console.log(`Successfully parsed ${evaluatedData.programs.length} additional evaluated programs.`);

        // Return the parsed data along with the new response ID
        return {
          programs: evaluatedData.programs,
          responseId: response.id // Return the NEW response ID for this turn
        };

      } catch (parseError) {
        console.error('JSON parsing error during \'Get More\' evaluation:', parseError instanceof Error ? parseError.message : String(parseError));
        console.error('Raw \'Get More\' Output Text:', outputText.substring(0, 500) + (outputText.length > 500 ? '...(truncated)' : ''));
        throw new Error(`Failed to parse additional evaluated programs: Invalid JSON. ${parseError instanceof Error ? parseError.message : ''}`);
      }
    } catch (apiError) {
      if (apiError instanceof OpenAIError) {
        console.error(`OpenAI API Error during 'Get More' evaluation:`, apiError.message);
        throw new Error(`OpenAI API error during 'Get More' evaluation: ${apiError.message}`);
      }
      throw apiError;
    }
  } catch (error) {
    console.error('Error getting more evaluated programs:', error);
    if (error instanceof Error) {
      throw new Error(`'Get More' program evaluation failed: ${error.message}`);
    } else {
      throw new Error(`'Get More' program evaluation failed: ${String(error)}`);
    }
  }
} 