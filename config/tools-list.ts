// List of tools available to the assistant
// No need to include the top-level wrapper object as it is added in lib/tools/tools.ts
// More information on function calling: https://platform.openai.com/docs/guides/function-calling

export const toolsList = [
  // {
  //   name: "get_weather",
  //   description: "Get the weather for a given location",
  //   parameters: {
  //     location: {
  //       type: "string",
  //       description: "Location to get weather for",
  //     },
  //     unit: {
  //       type: "string",
  //       description: "Unit to get weather in",
  //       enum: ["celsius", "fahrenheit"],
  //     },
  //   },
  // },
  // {
  //   name: "get_joke",
  //   description: "Get a programming joke",
  //   parameters: {},
  // },
  // {
  //   name: "query_supabase_database",
  //   description:
  //     "Query the Supabase database using a natural language question to retrieve relevant user data or context. Use this to fetch information potentially stored in the database based on the user's request.",
  //   parameters: {
  //     natural_language_query: {
  //       type: "string",
  //       description:
  //         "The user's question or request in natural language, which will be used to query the database.",
  //     },
  //   },
  // },
  {
    name: "create_application_plan",
    description:
      "Generate an application checklist and timeline for a selected program using the user's profile. Internally calls OpenAI with file_search and web_search to build the plan, then stores it via createApplicationWithPlan and returns application_id.",
    parameters: {
      recommendation_id: {
        type: "string",
        description: "The ID of the recommendation/program the user is applying to.",
      },
    },
  },
  {
    name: "get_application_state",
    description: "Fetch current state and tasks of a user application by application_id.",
    parameters: {
      application_id: {
        type: "string",
        description: "The UUID of the application to retrieve.",
      },
    },
  },
  {
    name: "update_application_task",
    description: "Update a specific task in an application (status, due_date, etc.)",
    parameters: {
      task_id: {
        type: "string",
        description: "The UUID of the task to update.",
      },
      updates: {
        type: "object",
        description: "The fields to update on the task.",
        properties: {
          title: { type: "string", description: "New task title" },
          description: { type: "string", description: "New task description" },
          due_date: { type: "string", description: "New due date (YYYY-MM-DD)" },
          status: { type: "string", description: "New status (e.g. pending, done)" },
          sort_order: { type: "integer", description: "New sort order" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    name: "save_application_plan",
    description:
      "Saves the generated application checklist and timeline to the database for the given recommendation ID.",
    parameters: {
      recommendation_id: {
        type: "string",
        description: "The ID of the recommendation/program the user is applying to.",
      },
      plan: {
        type: "object",
        description: "The application plan containing checklist and timeline.",
        properties: {
          checklist: {
            type: "array",
            description: "Detailed checklist tasks.",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                due_date: { type: "string", description: "YYYY-MM-DD" },
              },
              required: ["title", "description", "due_date"],
              additionalProperties: false,
            },
          },
          timeline: {
            type: "array",
            description: "High-level timeline milestones.",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                target_date: { type: "string", description: "YYYY-MM-DD" },
              },
              required: ["label", "target_date"],
              additionalProperties: false,
            },
          },
        },
        required: ["checklist", "timeline"],
        additionalProperties: false,
      },
    },
  },
  {
    name: "list_user_applications",
    description: "Retrieve all applications for the authenticated user, returning a list of application IDs and associated recommendation IDs.",
    parameters: {},
  },
];
