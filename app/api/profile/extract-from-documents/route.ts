import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ProfileDataSchema } from '@/app/types/profile-schema';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    "education", "careerGoals", "skills", "preferences", "documents"
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
    const validationResult = ProfileDataSchema.safeParse(preprocessedProfile);
    
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
- Personal details (name, email, phone)
- Educational background (degrees, institutions, fields of study, graduation years, GPA if available)
  * For degree level, you MUST select ONE of these exact options:
    - "High School"
    - "Associate's"
    - "Bachelor's"
    - "Master's"
    - "Doctorate"
    - "Certificate"
    - "Other"
- Career goals (short and long term goals, industries and roles of interest)
- Skills and competencies
- Any preferences mentioned (locations, study mode, timing, budget)

If you cannot find specific information, use reasonable placeholder values or provide empty strings/arrays as appropriate.
First, search through the documents to find relevant information for each section of the profile.

Format your response as a valid JSON object with the following structure:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "preferredName": "string",
  "linkedInProfile": "string or null",
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
    }
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

  // No longer trying to use file_ids or filters - using the query instead

  try {
    // First, call OpenAI Responses API with file search tool to gather information
    let responsesApiResult;
    
    try {
      responsesApiResult = await openai.responses.create({
        model: "gpt-4o-2024-08-06",
        // Use the search query + full instructions
        input: `${searchQuery}\n\n${prompt}`,
        tools: [fileSearchOptions],
        include: ["file_search_call.results"]
      });
    } catch (apiError) {
      console.error('Error with initial API call, trying simplified approach:', apiError);
      
      // If there was an error, retry with a simpler approach
      responsesApiResult = await openai.responses.create({
        model: "gpt-4o-2024-08-06",
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
          model: "gpt-4o-2024-08-06",
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
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              preferredName: "",
              education: [{ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
              careerGoals: { shortTerm: "", longTerm: "", desiredIndustry: [], desiredRoles: [] },
              skills: [],
              preferences: {
                preferredLocations: [],
                studyMode: "Full-time",
                startDate: "",
                budgetRange: { min: 0, max: 100000 }
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
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          preferredName: "",
          education: [{ degreeLevel: "", institution: "", fieldOfStudy: "", graduationYear: "", gpa: null }],
          careerGoals: { shortTerm: "", longTerm: "", desiredIndustry: [], desiredRoles: [] },
          skills: [],
          preferences: {
            preferredLocations: [],
            studyMode: "Full-time",
            startDate: "",
            budgetRange: { min: 0, max: 100000 }
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
      desiredIndustry: [],
      desiredRoles: []
    };
  } else {
    processed.careerGoals = {
      ...processed.careerGoals,
      shortTerm: processed.careerGoals.shortTerm || "",
      longTerm: processed.careerGoals.longTerm || "",
      desiredIndustry: Array.isArray(processed.careerGoals.desiredIndustry) 
        ? processed.careerGoals.desiredIndustry 
        : [],
      desiredRoles: Array.isArray(processed.careerGoals.desiredRoles) 
        ? processed.careerGoals.desiredRoles 
        : []
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
      }
    };
  } else {
    processed.preferences = {
      ...processed.preferences,
      preferredLocations: Array.isArray(processed.preferences.preferredLocations)
        ? processed.preferences.preferredLocations
        : [],
      studyMode: processed.preferences.studyMode || "",
      startDate: processed.preferences.startDate || "",
      budgetRange: processed.preferences.budgetRange || { min: 0, max: 100000 }
    };
  }
  
  // Handle personal information
  processed.firstName = processed.firstName || "";
  processed.lastName = processed.lastName || "";
  processed.email = processed.email || "";
  processed.phone = processed.phone || "";
  processed.preferredName = processed.preferredName || "";
  processed.linkedInProfile = processed.linkedInProfile || null;
  
  return processed;
} 