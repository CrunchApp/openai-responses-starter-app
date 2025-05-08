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
        required: ["title", "description", "due_date", "status", "sort_order"],
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
  {
    name: "create_application_task",
    description: "Create a new task in an application checklist",
    parameters: {
      application_id: { type: "string", description: "The UUID of the application" },
      title: { type: "string", description: "Task title" },
      description: { type: "string", description: "Task description" },
      due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
      sort_order: { type: "integer", description: "Sort order for the new task" },
    },
  },
  {
    name: "delete_application_task",
    description: "Delete a task from an application by task ID",
    parameters: {
      task_id: { type: "string", description: "The UUID of the task to delete" },
    },
  },
  {
    name: "update_application_timeline",
    description: "Update the timeline of an application",
    parameters: {
      application_id: { type: "string", description: "The UUID of the application" },
      timeline: {
        type: "array",
        description: "Updated array of timeline events",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Event label" },
            target_date: { type: "string", description: "Target date (YYYY-MM-DD)" },
          },
          required: ["label", "target_date"],
          additionalProperties: false,
        },
      },
    },
  },
  {
    name: "create_pathway",
    description: "Create a new single education pathway for the authenticated user and persist it to the database. Returns the newly created pathway_id on success.",
    parameters: {
      title: { type: "string", description: "Concise title providing an overview of the pathway (e.g. Financial Technology, Data Analytics, Marketing, Chemical Engineering, International Commercial and Energy Law)" },
      qualification_type: { type: "string", description: "Type of qualification/degree suggested (e.g., Degree, Certificate, Diploma)" },
      field_of_study: { type: "string", description: "Main field of study" },
      subfields: { type: "array", description: "Specialisation areas within the field of study", items: { type: "string" } },
      target_regions: { type: "array", description: "Geographic regions (countries/continents) to target for programs", items: { type: "string" } },
      budget_range_usd: {
        type: "object",
        description: "Estimated annual budget range in USD",
        properties: {
          min: { type: "number", description: "Minimum budget" },
          max: { type: "number", description: "Maximum budget" },
        },
        required: ["min", "max"],
        additionalProperties: false,
      },
      duration_months: {
        type: "object",
        description: "Estimated program duration in months (min/max)",
        properties: {
          min: { type: "number", description: "Minimum duration" },
          max: { type: "number", description: "Maximum duration" },
        },
        required: ["min", "max"],
        additionalProperties: false,
      },
      alignment_rationale: { type: "string", description: "Explanation of why this pathway aligns with the user's profile and goals" },
      alternatives: { type: "array", description: "Alternative options or variations within this pathway", items: { type: "string" } },
      query_string: { type: "string", description: "Boolean-style search query for downstream research agents" },
    },
  },
  {
    name: "create_recommendation",
    description: "Create a new program recommendation for the authenticated user and persist it along with program details. Returns the new recommendation_id on success.",
    parameters: {
      program: {
        type: "object",
        description: "Full program details used to populate the database records",
        properties: {
          name: { type: "string" },
          institution: { type: "string" },
          degree_type: { type: "string" },
          field_of_study: { type: "string" },
          description: { type: "string" },
          cost_per_year: { type: "number" },
          duration: { type: "number", description: "Duration in months" },
          location: { type: "string" },
          start_date: { type: "string" },
          application_deadline: { type: "string" },
          requirements: { type: "array", items: { type: "string" } },
          highlights: { type: "array", items: { type: "string" } },
          page_link: { type: "string" },
          scholarships: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "string" },
                eligibility: { type: "string" },
              },
              required: ["name", "amount", "eligibility"],
              additionalProperties: false,
            },
          },
          match_score: { type: "number" },
          match_rationale: {
            type: "object",
            properties: {
              careerAlignment: { type: "number" },
              budgetFit: { type: "number" },
              locationMatch: { type: "number" },
              academicFit: { type: "number" },
            },
            required: ["careerAlignment", "budgetFit", "locationMatch", "academicFit"],
            additionalProperties: false,
          },
          is_favorite: { type: "boolean" },
        },
        required: [
          "name",
          "institution",
          "degree_type",
          "field_of_study",
          "description",
          "cost_per_year",
          "duration",
          "location",
          "start_date",
          "application_deadline",
          "requirements",
          "highlights",
          "page_link",
          "match_score",
          "match_rationale",
          "scholarships",
          "is_favorite"
        ],
        additionalProperties: false,
      },
    },
  },
];
