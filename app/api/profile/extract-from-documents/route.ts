import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ProfileSchema } from '@/app/types/profile-schema';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// NEW: Allow overriding the model via env while defaulting to a stronger, more capable model than `gpt-4o-mini`.
const EXTRACT_MODEL = process.env.OPENAI_EXTRACT_MODEL || "gpt-4.1-mini-2025-04-14";

// Define the profile schema for structured outputs
const profileJsonSchema = {
  type: "object",
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    preferredName: { type: "string" },
    linkedInProfile: { type: ["string", "null"] },
    currentLocation: { type: "string" },
    nationality: { type: "string" },
    targetStudyLevel: {
      type: "string",
      enum: [
        "Bachelor\'s", 
        "Master\'s", 
        "Doctorate", 
        "Postgraduate Diploma/Certificate", 
        "Vocational/Trade", 
        "Undecided", 
        "__NONE__"
      ]
    },
    languageProficiency: {
      type: "array",
      items: {
        type: "object",
        properties: {
          language: { type: "string" },
          proficiencyLevel: { 
            type: "string",
            enum: [
              "Beginner", 
              "Elementary", 
              "Intermediate", 
              "Upper Intermediate", 
              "Advanced", 
              "Proficient", 
              "Native",
              "__NONE__"
            ]
          },
          testType: { type: ["string", "null"] },
          score: { type: ["string", "null"] }
        },
        required: ["language"],
        additionalProperties: false
      }
    },
    education: {
      type: "array",
      items: {
        type: "object",
        properties: {
          degreeLevel: { 
            type: "string",
            enum: [
              "High School", 
              "Associate's", 
              "Bachelor's", 
              "Master's", 
              "Doctorate", 
              "Certificate", 
              "Other",
              "__NONE__"
            ]
          },
          institution: { type: "string" },
          fieldOfStudy: { type: "string" },
          graduationYear: { type: "string" },
          gpa: { type: ["string", "null"] },
        },
        required: ["degreeLevel", "institution", "fieldOfStudy", "graduationYear"],
        additionalProperties: false,
      }
    },
    careerGoals: {
      type: "object",
      properties: {
        shortTerm: { type: "string" },
        longTerm: { type: "string" },
        achievements: { type: "string" },
        desiredIndustry: { 
          type: "array", 
          items: { type: "string" } 
        },
        desiredRoles: { 
          type: "array", 
          items: { type: "string" } 
        },
      },
      required: ["shortTerm", "longTerm", "desiredIndustry", "desiredRoles"],
      additionalProperties: false,
    },
    skills: {
      type: "array",
      items: { type: "string" },
    },
    preferences: {
      type: "object",
      properties: {
        preferredLocations: {
          type: "array",
          items: { type: "string" },
        },
        studyMode: { type: "string" },
        startDate: { type: "string" },
        budgetRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          required: ["min", "max"],
          additionalProperties: false,
        },
        preferredDuration: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
            unit: { type: "string", enum: ["years", "months"] }
          },
          required: [],
          additionalProperties: false
        },
        preferredStudyLanguage: { type: "string" },
        livingExpensesBudget: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
            currency: { type: "string" }
          },
          required: [],
          additionalProperties: false
        },
        residencyInterest: { type: "boolean" }
      },
      required: ["preferredLocations", "studyMode", "startDate", "budgetRange"],
      additionalProperties: false,
    },
  },
  required: [
    "firstName", "lastName", "email", "phone", "preferredName",
    "education", "careerGoals", "skills", "preferences",
    "currentLocation", "nationality", "targetStudyLevel", "languageProficiency"
  ],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  try {
    const { vectorStoreId, documentIds } = await request.json();
    
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Missing required parameter: vectorStoreId' },
        { status: 400 }
      );
    }
    
    // Use the Responses API with file search tool to extract profile information
    const extractedProfile = await extractProfileInformationUsingFileSearch(vectorStoreId, documentIds);

    // Validate the extracted profile against our schema
    const preprocessedProfile = preprocessProfileData(extractedProfile);
    const validationResult = ProfileSchema.safeParse(preprocessedProfile);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid extracted profile data format' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: preprocessedProfile });
  } catch (error) {
    console.error('Error extracting profile information:', error);
    return NextResponse.json(
      { error: 'Failed to extract profile information', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Function to extract profile information using OpenAI's Responses API with file search tool
async function extractProfileInformationUsingFileSearch(vectorStoreId: string, documentIds?: string[]) {
  // Prepare file search tool options and a more targeted query if we have document IDs
  let searchQuery = "Extract profile information from the documents.";

  if (documentIds && documentIds.length > 0) {
    // Create a query that explicitly references the file IDs to focus the search
    searchQuery = `Extract profile information from the store documents`;
  }

  // Full prompt with extraction instructions and format
  const prompt = `
You are an expert in extracting structured information from documents. 
Your task is to analyze the user's documents (which may include resumes, transcripts, and statements of purpose) 
and extract as much relevant information as possible to populate a user profile.

Please extract the following information:
- Personal details (name, email, phone, current location, nationality, preferred name, LinkedIn profile URL)
- Educational background (degrees, institutions, fields of study, graduation years, GPA if available). Also identify the target level of study the user is aiming for (e.g., Master's, PhD).
  * For degree level, you MUST select ONE of these exact options:
    - "High School"
    - "Associate's"
    - "Bachelor's"
    - "Master's"
    - "Doctorate"
    - "Certificate"
    - "Other"
  * For target study level, you MUST select ONE of these exact options:
    - "Bachelor's" 
    - "Master's" 
    - "Doctorate" 
    - "Postgraduate Diploma/Certificate" 
    - "Vocational/Trade" 
    - "Undecided" 
    - "__NONE__" // Use this if unknown or not specified
- Language Proficiency: Identify languages spoken, proficiency level, and any test results (e.g., IELTS score, TOEFL score).
  * For proficiency level, you MUST select ONE of these exact options:
    - "Beginner" 
    - "Elementary" 
    - "Intermediate" 
    - "Upper Intermediate" 
    - "Advanced" 
    - "Proficient" 
    - "Native"
    - "__NONE__" // Use this if unknown or cannot be mapped clearly
- Career goals (short and long term goals, achievements, industries and roles of interest)
- Skills and competencies
- Any preferences mentioned (preferred study locations, study mode, preferred start date, overall budget range for tuition/fees, preferred course duration, preferred language of study, budget for living expenses, interest in long-term residency/migration).

If you cannot find specific information, infer plausible and coherent details based on typical applicant profiles. The goal is to deliver a thoughtfully enriched profile with realistic values rather than leaving fields blank. Only use "__NONE__" or null when a value truly makes no sense to guess or is explicitly unknown.
First, search through the documents to find relevant information for each section of the profile.

Format your response as a valid JSON object with the following structure:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "preferredName": "string",
  "linkedInProfile": "string or null",
  "currentLocation": "string",
  "nationality": "string",
  "targetStudyLevel": "one of the target level options",
  "languageProficiency": [
    {
      "language": "string",
      "proficiencyLevel": "one of the proficiency level options listed above",
      "testType": "string or null",
      "score": "string or null"
    }
  ],
  "education": [
    {
      "degreeLevel": "one of the exact options listed above",
      "institution": "string",
      "fieldOfStudy": "string",
      "graduationYear": "string",
      "gpa": "string or null"
    }
  ],
  "careerGoals": {
    "shortTerm": "string",
    "longTerm": "string",
    "achievements": "string",
    "desiredIndustry": ["string"],
    "desiredRoles": ["string"]
  },
  "skills": ["string"],
  "preferences": {
    "preferredLocations": ["string"],
    "studyMode": "string",
    "startDate": "string",
    "budgetRange": {
      "min": number,
      "max": number
    },
    "preferredDuration": {
      "min": number (optional),
      "max": number (optional),
      "unit": "'years' or 'months'" (optional)
    },
    "preferredStudyLanguage": "string",
    "livingExpensesBudget": {
      "min": number (optional),
      "max": number (optional),
      "currency": "string" (optional, default 'USD')
    },
    "residencyInterest": boolean
  }
}

Ensure your output is formatted as a valid JSON object that can be parsed.
`;

  const fileSearchOptions: any = {
    type: "file_search",
    vector_store_ids: [vectorStoreId],
    max_num_results: 10
  };

  try {
    // First, call OpenAI Responses API with file search tool to gather information
    let responsesApiResult;
    
    try {
      responsesApiResult = await openai.responses.create({
        model: EXTRACT_MODEL,
        // Use the search query + full instructions
        input: `${searchQuery}\n\n${prompt}`,
        tools: [fileSearchOptions],
        include: ["file_search_call.results"]
      });
    } catch (apiError) {
      console.error('Error with initial API call, trying simplified approach:', apiError);
      
      // If there was an error, retry with a simpler approach
      responsesApiResult = await openai.responses.create({
        model: EXTRACT_MODEL,
        // Use the search query + full instructions
        input: `${searchQuery}\n\n${prompt}`,
        tools: [{
          type: "file_search",
          vector_store_ids: [vectorStoreId],
          max_num_results: 10
        }],
        include: ["file_search_call.results"]
      });
    }

    // Process the response to extract JSON data from text
    let extractedData = null;
    
    for (const output of responsesApiResult.output) {
      if (output.type === 'message') {
        const messageOutput = output as any;
        
        if (messageOutput.content && Array.isArray(messageOutput.content)) {
          for (const contentItem of messageOutput.content) {
            if (contentItem.type === 'output_text') {
              const text = contentItem.text;
              
              // Try to extract JSON from the text
              try {
                // Look for a JSON object in the text
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  extractedData = JSON.parse(jsonMatch[0]);
                  break;
                }
              } catch (error) {
                console.error('Error parsing JSON from text:', error);
              }
            }
          }
        }
      }
    }

    // If we couldn't extract structured data, then use the Chat Completions API with structured outputs
    if (!extractedData) {
      console.log("Falling back to Chat Completions API with structured outputs");
      
      // Extract search results from the Responses API
      let searchResults = "";
      try {
        for (const output of responsesApiResult.output) {
          if (output.type === 'file_search_call') {
            const searchOutput = output as any;
            if (searchOutput.search_results && Array.isArray(searchOutput.search_results)) {
              searchResults = searchOutput.search_results
                .map((result: any) => result.text || "")
                .join("\n\n---\n\n");
            }
          }
        }

        // If no search results were found, check if there are any in the file_search_call
        if (!searchResults) {
          console.log("No search results found in output, checking for matches");
          // Look for matches in file_search_call
          const fileSearchCall = responsesApiResult.output.find(output => output.type === 'file_search_call');
          if (fileSearchCall) {
            // The structure might be different depending on the API version
            const matches = (fileSearchCall as any).matches || 
                            (fileSearchCall as any).result?.matches || 
                            [];
            
            if (Array.isArray(matches) && matches.length > 0) {
              searchResults = matches
                .map((match: any) => match.text || match.content || "")
                .join("\n\n---\n\n");
            }
          }
        }
      } catch (error) {
        console.error("Error extracting search results:", error);
        // Provide a fallback message
        searchResults = "No document content could be extracted. Please try again with different documents.";
      }
      
      // Use the Chat Completions API with structured outputs
      try {
        console.log("Falling back to Chat Completions API with structured outputs");
        
        const completion = await openai.chat.completions.create({
          model: EXTRACT_MODEL,
          messages: [
            { 
              role: "system", 
              content: "You are an expert in extracting structured information from documents."
            },
            {
              role: "user",
              content: `Extract profile information from these document excerpts:\n\n${searchResults}\n\n${prompt}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "profile_data",
              schema: profileJsonSchema,
              strict: true
            }
          }
        });
        
        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message.content) {
          try {
            extractedData = JSON.parse(completion.choices[0].message.content);
          } catch (parseError) {
            console.error('Error parsing JSON from Chat Completions API:', parseError);
            // Create a minimal valid profile as fallback
            extractedData = {
              firstName: "Alex",
              lastName: "Taylor",
              email: "alex.taylor@example.com",
              phone: "+1 555-123-4567",
              preferredName: "Alex",
              education: [{ degreeLevel: "__NONE__", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
              careerGoals: { shortTerm: "", longTerm: "", achievements: "", desiredIndustry: [], desiredRoles: [] },
              skills: [],
              preferences: {
                preferredLocations: [],
                studyMode: "Full-time",
                startDate: "",
                budgetRange: { min: 0, max: 100000 },
                preferredDuration: { min: undefined, max: undefined, unit: undefined },
                preferredStudyLanguage: "",
                livingExpensesBudget: { min: undefined, max: undefined, currency: "USD" },
                residencyInterest: false
              }
            };
          }
        } else if (completion.choices && completion.choices.length > 0 && completion.choices[0].message.refusal) {
          console.warn('Model refused to extract profile data:', completion.choices[0].message.refusal);
          throw new Error('The AI refused to extract data from the provided documents.');
        } else {
          throw new Error('Failed to extract structured data using Chat Completions API');
        }
      } catch (completionError) {
        console.error('Error with Chat Completions API:', completionError);
        // Create a minimal valid profile as fallback
        extractedData = {
          firstName: "Alex",
          lastName: "Taylor",
          email: "alex.taylor@example.com",
          phone: "+1 555-123-4567",
          preferredName: "Alex",
          education: [{ degreeLevel: "__NONE__", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
          careerGoals: { shortTerm: "", longTerm: "", achievements: "", desiredIndustry: [], desiredRoles: [] },
          skills: [],
          preferences: {
            preferredLocations: [],
            studyMode: "Full-time",
            startDate: "",
            budgetRange: { min: 0, max: 100000 },
            preferredDuration: { min: undefined, max: undefined, unit: undefined },
            preferredStudyLanguage: "",
            livingExpensesBudget: { min: undefined, max: undefined, currency: "USD" },
            residencyInterest: false
          }
        };
      }
    }

    if (!extractedData) {
      throw new Error('Could not extract structured data from the model response');
    }

    return extractedData;
  } catch (error) {
    console.error('Error extracting profile information:', error);
    throw error;
  }
}

// Function to map extracted degree level to valid options
function mapToValidDegreeLevel(degree: string): string {
  // Convert to lowercase for case-insensitive matching
  const degreeLower = degree?.toLowerCase() || ""; // Add null check
  
  // Define mappings for common variations
  if (!degree || degree.trim() === "" || degreeLower === "__none__") return "__NONE__"; // Match schema's __NONE__
  
  if (degreeLower.includes("high school") || degreeLower.includes("secondary")) {
    return "High School";
  }
  
  if (degreeLower.includes("associate") || degreeLower.includes("aa") || degreeLower.includes("a.a")) {
    return "Associate's";
  }
  
  if (degreeLower.includes("bachelor") || degreeLower.includes("ba") || degreeLower.includes("bs") || 
      degreeLower.includes("b.a") || degreeLower.includes("b.s") || degreeLower.includes("undergrad")) {
    return "Bachelor's";
  }
  
  if (degreeLower.includes("master") || degreeLower.includes("ma") || degreeLower.includes("ms") || 
      degreeLower.includes("m.a") || degreeLower.includes("m.s") || degreeLower.includes("mba") || 
      degreeLower.includes("m.b.a")) {
    return "Master's";
  }
  
  if (degreeLower.includes("phd") || degreeLower.includes("ph.d") || degreeLower.includes("doctor") || 
      degreeLower.includes("doctorate")) {
    return "Doctorate";
  }
  
  if (degreeLower.includes("certificate") || degreeLower.includes("diploma") || 
      degreeLower.includes("cert")) {
    return "Certificate";
  }
  
  // Default to "Other" if no match is found, but return __NONE__ if it seems completely unrelated
  // Simple check: if it contains common degree terms, maybe keep as Other, else __NONE__
  const containsDegreeTerm = degreeLower.includes("degree") || degreeLower.includes("study") || degreeLower.includes("program");
  return containsDegreeTerm ? "Other" : "__NONE__"; 
}

// NEW: Function to map extracted language proficiency level to valid options
function mapToValidProficiencyLevel(level: string): string {
  const levelLower = level?.toLowerCase() || ""; // Add null check

  if (!level || level.trim() === "" || levelLower === "__none__") return "__NONE__";

  // Direct matches
  if (["beginner", "basic", "a1", "a2"].some(term => levelLower.includes(term))) return "Beginner";
  if (["elementary", "pre-intermediate"].some(term => levelLower.includes(term))) return "Elementary";
  if (["intermediate", "b1", "conversational"].some(term => levelLower.includes(term))) return "Intermediate";
  if (["upper intermediate", "b2"].some(term => levelLower.includes(term))) return "Upper Intermediate";
  if (["advanced", "c1", "fluent"].some(term => levelLower.includes(term))) return "Advanced";
  if (["proficient", "c2", "professional", "full professional"].some(term => levelLower.includes(term))) return "Proficient"; // Added mapping for "Full Professional Proficiency"
  if (["native", "mother tongue"].some(term => levelLower.includes(term))) return "Native";

  // Default fallback
  return "__NONE__";
}

// NEW: Function to map extracted target study level to valid options
function mapToValidTargetStudyLevel(level: string): string {
  const levelLower = level?.toLowerCase() || "";

  if (!level || level.trim() === "" || levelLower === "__none__") return "__NONE__";

  if (levelLower.includes("bachelor")) return "Bachelor's";
  if (levelLower.includes("master")) return "Master's";
  if (levelLower.includes("doctorate") || levelLower.includes("phd")) return "Doctorate";
  if (levelLower.includes("postgrad") || levelLower.includes("post-grad") || levelLower.includes("diploma") || levelLower.includes("certificate")) return "Postgraduate Diploma/Certificate";
  if (levelLower.includes("vocational") || levelLower.includes("trade") || levelLower.includes("technical")) return "Vocational/Trade";
  if (levelLower.includes("undecided")) return "Undecided";

  // Default fallback
  return "__NONE__";
}

// Function to preprocess profile data to ensure proper null handling and enum mapping
function preprocessProfileData(data: any): any {
  // Create a deep copy to avoid modifying the original extracted data
  const processed = JSON.parse(JSON.stringify(data || {}));

  // --- Personal Information ---
  processed.firstName = processed.firstName || "";
  processed.lastName = processed.lastName || "";
  processed.email = processed.email || "";
  processed.phone = processed.phone || ""; 
  processed.preferredName = processed.preferredName || ""; // Added preferredName back with default
  processed.linkedInProfile = processed.linkedInProfile === undefined ? null : (processed.linkedInProfile || null); 
  processed.currentLocation = processed.currentLocation || "";
  processed.nationality = processed.nationality || "";
  processed.targetStudyLevel = processed.targetStudyLevel || "__NONE__"; // Default to __NONE__

  // Handle education array
  if (Array.isArray(processed.education)) {
    processed.education = processed.education.map((edu: any) => ({
      institution: edu.institution || "",
      fieldOfStudy: edu.fieldOfStudy || "",
      graduationYear: edu.graduationYear || "",
      // Ensure gpa is null and not undefined
      gpa: edu.gpa === undefined ? null : edu.gpa,
      // Map degree level to valid option using the updated function
      degreeLevel: mapToValidDegreeLevel(edu.degreeLevel || ""), 
    })).filter((edu: any) => edu.institution || edu.fieldOfStudy); // Keep entries with some info
    
    // If filtering leaves an empty array, add a default entry
    if (processed.education.length === 0) {
        processed.education = [{
          degreeLevel: "__NONE__", 
          institution: "",
          fieldOfStudy: "",
          graduationYear: "",
          gpa: null
        }];
    }
  } else {
    // If education is missing or not an array, provide a default entry
    processed.education = [{
      degreeLevel: "__NONE__", // Match schema's __NONE__
      institution: "",
      fieldOfStudy: "",
      graduationYear: "",
      gpa: null
    }];
  }
  
  // Handle language proficiency
  if (Array.isArray(processed.languageProficiency)) {
    processed.languageProficiency = processed.languageProficiency.map((lang: any) => ({
      language: lang.language || "",
      // Use the new mapping function for proficiency level
      proficiencyLevel: mapToValidProficiencyLevel(lang.proficiencyLevel || ""), 
      testType: lang.testType === undefined || lang.testType === "" ? null : lang.testType, // Ensure null if empty/undefined
      score: lang.score === undefined || lang.score === "" ? null : lang.score, // Ensure null if empty/undefined
    })).filter((lang: any) => lang.language); // Filter out entries without a language
  } else {
    processed.languageProficiency = []; // Default to empty array if missing or not an array
  }
  
  // Handle career goals
  if (!processed.careerGoals) {
    processed.careerGoals = {
      shortTerm: "",
      longTerm: "",
      achievements: "",
      desiredIndustry: [],
      desiredRoles: [],
    };
  } else {
    processed.careerGoals = {
      ...processed.careerGoals,
      shortTerm: processed.careerGoals.shortTerm || "",
      longTerm: processed.careerGoals.longTerm || "",
      achievements: processed.careerGoals.achievements || "",
      desiredIndustry: Array.isArray(processed.careerGoals.desiredIndustry) 
        ? processed.careerGoals.desiredIndustry 
        : [],
      desiredRoles: Array.isArray(processed.careerGoals.desiredRoles) 
        ? processed.careerGoals.desiredRoles 
        : [],
    };
  }
  
  // Handle skills
  if (!Array.isArray(processed.skills)) {
    processed.skills = [];
  }
  
  // Handle preferences
  const prefs = processed.preferences || {};
  processed.preferences = {
    preferredLocations: Array.isArray(prefs.preferredLocations) 
      ? prefs.preferredLocations.filter((loc: string) => loc && loc !== "__NONE__") // Also filter out empty strings
      : [],
    studyMode: prefs.studyMode === "__NONE__" ? "" : (prefs.studyMode || ""), 
    startDate: prefs.startDate === "__NONE__" ? "" : (prefs.startDate || ""), 
    
    // Ensure budgetRange is an object, resetting if invalid
    budgetRange: (typeof prefs.budgetRange === 'object' && prefs.budgetRange !== null) 
      ? {
          min: typeof prefs.budgetRange.min === 'number' ? prefs.budgetRange.min : 0,
          max: typeof prefs.budgetRange.max === 'number' ? prefs.budgetRange.max : 100000, 
        }
      : { min: 0, max: 100000 }, // Default if not object or is null
      
    // Ensure preferredDuration is an object or default, resetting if invalid
    preferredDuration: (typeof prefs.preferredDuration === 'object' && prefs.preferredDuration !== null)
      ? {
          min: typeof prefs.preferredDuration.min === 'number' ? prefs.preferredDuration.min : undefined,
          max: typeof prefs.preferredDuration.max === 'number' ? prefs.preferredDuration.max : undefined,
          unit: ["years", "months"].includes(prefs.preferredDuration.unit) ? prefs.preferredDuration.unit : undefined,
        }
      : { min: undefined, max: undefined, unit: undefined }, // Default if not object or is null
      
    preferredStudyLanguage: prefs.preferredStudyLanguage === "__NONE__" ? "" : (prefs.preferredStudyLanguage || ""), 
    
    // Ensure livingExpensesBudget is an object or default, resetting if invalid
    livingExpensesBudget: (typeof prefs.livingExpensesBudget === 'object' && prefs.livingExpensesBudget !== null)
      ? {
         min: typeof prefs.livingExpensesBudget.min === 'number' ? prefs.livingExpensesBudget.min : undefined,
         max: typeof prefs.livingExpensesBudget.max === 'number' ? prefs.livingExpensesBudget.max : undefined,
         currency: prefs.livingExpensesBudget.currency || "USD",
       }
      : { min: undefined, max: undefined, currency: "USD" }, // Default if not object or is null
      
    // Ensure residencyInterest is a boolean, resetting if invalid
    residencyInterest: typeof prefs.residencyInterest === 'boolean' 
      ? prefs.residencyInterest 
      : false, // Default to false if not boolean
  };
  
  // Use the mapping function to ensure the value is valid
  processed.targetStudyLevel = mapToValidTargetStudyLevel(processed.targetStudyLevel);
  
  return processed;
} 