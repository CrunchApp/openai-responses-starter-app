import { Database } from "@/lib/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { MODEL } from "@/config/constants";
import OpenAI from "openai";
import { getTools } from "@/lib/tools/tools";

// Types
export interface ChecklistTask {
  title: string;
  description: string;
  due_date: string; // ISO date string
}

export interface TimelineEvent {
  label: string;
  target_date: string; // ISO date string
}

export interface ApplicationPlan {
  checklist: ChecklistTask[];
  timeline: TimelineEvent[];
}

export interface GenerateApplicationPlanResult {
  plan: ApplicationPlan;
  previousResponseId: string | null;
}

// REMOVE ChecklistResponse and TimelineResponse if no longer used elsewhere
// export interface ChecklistResponse {
//   tasks: ChecklistTask[];
// }
// 
// export interface TimelineResponse {
//   events: TimelineEvent[];
// }

// REMOVE schema definition and generateApplicationPlan function

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Application checklist generation will use a fallback stub.");
}

// Re-add applicationPlanSchema
const applicationPlanSchema = {
  type: "object",
  properties: {
    checklist: {
      type: "array",
      description: "Granular checklist of tasks for the application process",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD" },
        },
        required: ["title", "description", "due_date"],
        additionalProperties: false,
      },
    },
    timeline: {
      type: "array",
      description: "High-level timeline milestones",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Milestone label" },
          target_date: { type: "string", description: "Target date YYYY-MM-DD" },
        },
        required: ["label", "target_date"],
        additionalProperties: false,
      },
    },
  },
  required: ["checklist", "timeline"],
  additionalProperties: false,
} as const;

/**
 * Generates a detailed application checklist & timeline by leveraging OpenAI's Responses API
 * with file_search and web_search tools.
 */
export async function generateApplicationPlan(params: {
  profileFileId: string;
  programFileId: string;
  vectorStoreId: string;
  supabase: SupabaseClient<Database>;
  rawProfile?: any;
  rawProgram?: any;
  previousResponseId?: string;
}): Promise<GenerateApplicationPlanResult> {
  // Define stubPlan for fallback
  const stubPlan: ApplicationPlan = {
    checklist: [
      { title: "Gather transcripts", description: "Collect official academic transcripts from all institutions attended.", due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) },
      { title: "Prepare statement of purpose", description: "Draft and refine your statement of purpose according to program guidelines.", due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) },
    ],
    timeline: [
      { label: "Application opens", target_date: new Date().toISOString().substring(0, 10) },
      { label: "Application deadline", target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) },
    ],
  };
  // If no API key, return stub
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, using stub application plan.");
    return { plan: stubPlan, previousResponseId: null };
  }

  // Prepare raw profile and program JSON strings for embedding
  const profileDataString = params.rawProfile ? JSON.stringify(params.rawProfile, null, 2) : '';
  const programDataString = params.rawProgram ? JSON.stringify(params.rawProgram, null, 2) : '';

  const systemPrompt = `You are Vista's AI Application Planner.

# Role & Objective
Create a *personalised* application checklist **and** timeline that will help the student stay on track with their chosen study program.

# Persistence
You are an *agent* – keep going until the task is completely solved before ending your turn.

# Tool-Calling
1. **Always** call the \`web_search\` tool to retrieve the latest, authoritative information about the program (deadlines, entry requirements, fees, etc.).
2. Optionally call \`file_search\` if you need to consult additional local context or previous files.
3. If you cannot find the required live data after searching, fall back to the provided PROGRAM_JSON.

# Planning Strategy
Think step by step *before* calling a tool, and reflect on the outcomes after each call. Do **not** guess – if you are missing information, keep searching or request clarification.

# Reasoning Steps
1. **Query Analysis**: Break down what program details are still needed (if any) to craft a reliable checklist/timeline.
2. **Context Gathering**: Use \`web_search\` with focused queries to fetch those missing details. Rate the relevance of each snippet you find.
3. **Synthesis**: Combine USER_PROFILE_JSON, PROGRAM_JSON and live data into a coherent plan.

# Output Format
Return **only** a JSON object that conforms *exactly* to the \`application_plan\` schema. Do **not** wrap the JSON in code-fences and do not add extra keys.

# Final Reminder
Terminate your turn only after you have produced a valid \`application_plan\` JSON object. If you cannot gather sufficient data, ask clarifying questions **instead** of guessing.`;

  const userPrompt = `## Context

### USER_PROFILE_JSON
\`\`\`json
${profileDataString}
\`\`\`

### PROGRAM_JSON
\`\`\`json
${programDataString}
\`\`\`

Use the tools as instructed above, then produce the final \`application_plan\` JSON.`;

  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    // Use existing tool definitions for file_search and web_search, cast to any[] for SDK compatibility
    const tools = (getTools().filter((tool) => tool.type === "file_search" || tool.type === "web_search")) as any[];
    const requestOptions: any = {
      model: MODEL,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      text: {
        format: {
          type: "json_schema",
          name: "application_plan",
          schema: applicationPlanSchema,
          strict: true,
        },
      },
      // Keep output concise but allow sufficient length for 20 tasks + timeline
      max_output_tokens: 2048,
      parallel_tool_calls: false,
      stream: false,
      store: true, // Persist conversation for future turns
    };

    // If caller provided previousResponseId, include it to maintain context
    if (params.previousResponseId) {
      requestOptions.previous_response_id = params.previousResponseId;
    }

    const response = await openai.responses.create(requestOptions);

    const previousResponseId = response.id as string;

    const raw = response.output_text ?? "";
    if (!raw) {
      console.error("Empty output_text from OpenAI when generating application plan");
      return { plan: stubPlan, previousResponseId: null };
    }

    const plan = JSON.parse(raw) as ApplicationPlan;
    if (!plan.checklist || !plan.timeline) {
      console.error("OpenAI returned invalid application plan, using stub", plan);
      return { plan: stubPlan, previousResponseId: null };
    }

    return { plan, previousResponseId };
  } catch (error) {
    console.error("Error generating application plan", error);
    return { plan: stubPlan, previousResponseId: null };
  }
} 