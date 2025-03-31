// Functions mapping to tool calls
// Define one function per tool call - each tool call should have a matching function
// Parameters for a tool call are passed as an object to the corresponding function

export const get_weather = async ({
  location,
  unit,
}: {
  location: string;
  unit: string;
}) => {
  console.log("location", location);
  console.log("unit", unit);
  const res = await fetch(
    `/api/functions/get_weather?location=${location}&unit=${unit}`
  ).then((res) => res.json());

  console.log("executed get_weather function", res);

  return res;
};

export const get_joke = async () => {
  const res = await fetch(`/api/functions/get_joke`).then((res) => res.json());
  return res;
};

export const querySupabaseDatabase = async ({
  natural_language_query,
}: {
  natural_language_query: string;
}) => {
  console.log("natural_language_query", natural_language_query);
  // We'll need to pass the query to the backend API route
  const res = await fetch(
    `/api/functions/query_supabase?query=${encodeURIComponent(
      natural_language_query
    )}`
  ).then((res) => res.json());

  console.log("executed querySupabaseDatabase function", res);

  return res;
};

export const functionsMap = {
  get_weather: get_weather,
  get_joke: get_joke,
  query_supabase_database: querySupabaseDatabase,
};
