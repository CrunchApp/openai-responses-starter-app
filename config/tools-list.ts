// List of tools available to the assistant
// No need to include the top-level wrapper object as it is added in lib/tools/tools.ts
// More information on function calling: https://platform.openai.com/docs/guides/function-calling

export const toolsList = [
  {
    name: "get_weather",
    description: "Get the weather for a given location",
    parameters: {
      location: {
        type: "string",
        description: "Location to get weather for",
      },
      unit: {
        type: "string",
        description: "Unit to get weather in",
        enum: ["celsius", "fahrenheit"],
      },
    },
  },
  {
    name: "get_joke",
    description: "Get a programming joke",
    parameters: {},
  },
  {
    name: "query_supabase_database",
    description:
      "Query the Supabase database using a natural language question to retrieve relevant user data or context. Use this to fetch information potentially stored in the database based on the user's request.",
    parameters: {
      natural_language_query: {
        type: "string",
        description:
          "The user's question or request in natural language, which will be used to query the database.",
      },
    },
  },
];
