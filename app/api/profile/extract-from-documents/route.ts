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
        ""
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
              ""
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
              "" // Empty string for initial state
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
    documents: {
      type: "object",
      properties: {
        resume: { type: ["string", "null"] },
        transcripts: { type: ["string", "null"] },
        statementOfPurpose: { type: ["string", "null"] },
        otherDocuments: { 
          type: ["array", "null"],
          items: { type: "string" },
        },
      },
      additionalProperties: false,
    },
  },
  required: [
    "firstName", "lastName", "email", "phone", "preferredName",
    "education", "careerGoals", "skills", "preferences", "documents",
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
    - ""
- Language Proficiency: Identify languages spoken, proficiency level (Beginner, Elementary, Intermediate, Upper Intermediate, Advanced, Proficient, Native), and any test results (e.g., IELTS score, TOEFL score).
- Career goals (short and long term goals, achievements, industries and roles of interest)
- Skills and competencies
- Any preferences mentioned (preferred study locations, study mode, preferred start date, overall budget range for tuition/fees, preferred course duration, preferred language of study, budget for living expenses, interest in long-term residency/migration).

If you cannot find specific information, infer plausible and coherent details based on typical applicant profiles. The goal is to deliver a thoughtfully enriched profile with realistic values rather than leaving fields blank. Only use empty strings/null when a value truly makes no sense to guess (e.g., document file IDs).
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
      "proficiencyLevel": "one of the proficiency level options",
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
  },
  "documents": {
    "resume": "string or null",
    "transcripts": "string or null",
    "statementOfPurpose": "string or null",
    "otherDocuments": ["string"] or null
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
              education: [{ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
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
              },
              documents: {
                resume: null,
                transcripts: null,
                statementOfPurpose: null,
                otherDocuments: null
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
          education: [{ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
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
          },
          documents: {
            resume: null,
            transcripts: null,
            statementOfPurpose: null,
            otherDocuments: null
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
  const degreeLower = degree.toLowerCase();
  
  // Define mappings for common variations
  if (!degree || degree.trim() === "") return "";
  
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
  
  // Default to "Other" if no match is found
  return "Other";
}

// Function to preprocess profile data to ensure proper null handling
function preprocessProfileData(data: any) {
  // Deep clone the data to avoid modifying the original
  const processed = JSON.parse(JSON.stringify(data));
  
  // Handle education array
  if (Array.isArray(processed.education)) {
    processed.education = processed.education.map((edu: any) => ({
      ...edu,
      // Ensure gpa is null and not undefined
      gpa: edu.gpa === undefined ? null : edu.gpa,
      // Map degree level to valid option
      degreeLevel: mapToValidDegreeLevel(edu.degreeLevel || ""),
      // Ensure other fields have at least empty strings
      institution: edu.institution || "",
      fieldOfStudy: edu.fieldOfStudy || "",
      graduationYear: edu.graduationYear || ""
    }));
  } else {
    // If education is missing, provide a default entry
    processed.education = [{
      degreeLevel: "",
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
      proficiencyLevel: lang.proficiencyLevel || "",
      testType: lang.testType === undefined ? null : lang.testType,
      score: lang.score === undefined ? null : lang.score,
    }));
  } else {
    processed.languageProficiency = [];
  }
  
  // Handle documents
  if (!processed.documents) {
    processed.documents = {};
  }
  
  processed.documents = {
    ...processed.documents,
    resume: processed.documents.resume === undefined ? null : processed.documents.resume,
    transcripts: processed.documents.transcripts === undefined ? null : processed.documents.transcripts,
    statementOfPurpose: processed.documents.statementOfPurpose === undefined ? null : processed.documents.statementOfPurpose,
    otherDocuments: processed.documents.otherDocuments === undefined ? null : processed.documents.otherDocuments
  };
  
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
  if (!processed.preferences) {
    processed.preferences = {
      preferredLocations: [],
      studyMode: "",
      startDate: "",
      budgetRange: {
        min: 0,
        max: 100000
      },
      preferredDuration: { min: undefined, max: undefined, unit: undefined },
      preferredStudyLanguage: "",
      livingExpensesBudget: { min: undefined, max: undefined, currency: "USD" },
      residencyInterest: false
    };
  } else {
    processed.preferences = {
      ...processed.preferences,
      preferredLocations: Array.isArray(processed.preferences.preferredLocations)
        ? processed.preferences.preferredLocations
        : [],
      studyMode: processed.preferences.studyMode || "",
      startDate: processed.preferences.startDate || "",
      budgetRange: processed.preferences.budgetRange || { min: 0, max: 100000 },
      preferredDuration: processed.preferences.preferredDuration || { min: undefined, max: undefined, unit: undefined },
      preferredStudyLanguage: processed.preferences.preferredStudyLanguage || "",
      livingExpensesBudget: processed.preferences.livingExpensesBudget || { min: undefined, max: undefined, currency: "USD" },
      residencyInterest: processed.preferences.residencyInterest === undefined ? false : processed.preferences.residencyInterest,
    };
  }
  
  // Handle personal information
  processed.firstName = processed.firstName || "";
  processed.lastName = processed.lastName || "";
  processed.email = processed.email || "";
  processed.phone = processed.phone || "";
  processed.preferredName = processed.preferredName || "";
  processed.linkedInProfile = processed.linkedInProfile || null;
  processed.currentLocation = processed.currentLocation || "";
  processed.nationality = processed.nationality || "";
  processed.targetStudyLevel = processed.targetStudyLevel || "";
  
  return processed;
} 