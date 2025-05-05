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

export const create_application_plan = async ({
  recommendation_id,
  previous_response_id,
}: {
  recommendation_id: string;
  previous_response_id?: string;
}) => {
  // Call backend route to trigger generation and storage
  const res = await fetch(`/api/functions/create_application_plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendation_id, previous_response_id }),
  }).then((r) => r.json());
  return res;
};

export const get_application_state = async ({ application_id }: { application_id: string }) => {
  const res = await fetch(`/api/functions/get_application_state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id }),
  }).then((r) => r.json());
  return res;
};

export const update_application_task = async ({ task_id, updates }: { task_id: string; updates: any }) => {
  const res = await fetch(`/api/functions/update_application_task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id, updates }),
  }).then((r) => r.json());
  return res;
};

export const save_application_plan = async ({
  recommendation_id,
  plan,
}: {
  recommendation_id: string;
  plan: any;
}) => {
  // Call backend route to trigger storage
  const res = await fetch(`/api/functions/save_application_plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendation_id, plan }),
  }).then((r) => r.json());
  return res; // { success: boolean, application_id?: string, error?: string }
};

export const list_user_applications = async () => {
  const res = await fetch(`/api/functions/list_user_applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).then((r) => r.json());
  return res; // { success: boolean; applications?: Array<{ id: string; recommendation_id: string }>; error?: string }
};

// New functions for manual CRUD on application tasks and timeline
export const create_application_task = async ({ application_id, title, description, due_date, sort_order }: { application_id: string; title: string; description: string; due_date: string; sort_order: number }) => {
  const res = await fetch(`/api/functions/create_application_task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id, title, description, due_date, sort_order }),
  }).then((r) => r.json());
  return res;
};

export const delete_application_task = async ({ task_id }: { task_id: string }) => {
  const res = await fetch(`/api/functions/delete_application_task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id }),
  }).then((r) => r.json());
  return res;
};

export const update_application_timeline = async ({ application_id, timeline }: { application_id: string; timeline: any[] }) => {
  const res = await fetch(`/api/functions/update_application_timeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id, timeline }),
  }).then((r) => r.json());
  return res;
};

export const functionsMap = {
  get_weather: get_weather,
  get_joke: get_joke,
  query_supabase_database: querySupabaseDatabase,
  create_application_plan: create_application_plan,
  get_application_state: get_application_state,
  update_application_task: update_application_task,
  save_application_plan: save_application_plan,
  list_user_applications: list_user_applications,
  create_application_task: create_application_task,
  delete_application_task: delete_application_task,
  update_application_timeline: update_application_timeline,
};
