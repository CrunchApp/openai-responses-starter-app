import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { ApplicationPlan } from "@/lib/ai/applicationManager";
import { v4 as uuidv4 } from "uuid";

export interface CreateApplicationParams {
  userId: string;
  recommendationId: string | null; // can be null
  profileFileId: string;
  programFileId: string;
  plan: ApplicationPlan;
  /** ID of the initial plan-generation response for chaining context */
  previousResponseId?: string | null;
}

export async function createApplicationWithPlan(
  supabase: SupabaseClient<Database>,
  params: CreateApplicationParams
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  try {
    const newAppId = uuidv4();

    // Insert into applications table
    const { error: appError } = await supabase.from("applications").insert({
      id: newAppId,
      user_id: params.userId,
      recommendation_id: params.recommendationId,
      profile_file_id: params.profileFileId,
      program_file_id: params.programFileId,
      planner_response_id: params.previousResponseId ?? null,
      checklist: params.plan.checklist,
      timeline: params.plan.timeline,
    });

    if (appError) {
      console.error("Failed to insert application", appError);
      return { success: false, error: appError.message };
    }

    // Insert tasks into application_tasks
    if (params.plan.checklist && params.plan.checklist.length > 0) {
      const taskRows = params.plan.checklist.map((task, idx) => ({
        id: uuidv4(),
        application_id: newAppId,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        sort_order: idx,
        status: "pending",
      }));

      const { error: taskError } = await supabase.from("application_tasks").insert(taskRows);
      if (taskError) {
        console.error("Failed to insert application tasks", taskError);
        // Application inserted but tasks failed; decide whether to rollback or ignore. For now return error.
        return { success: false, applicationId: newAppId, error: taskError.message };
      }
    }

    return { success: true, applicationId: newAppId };
  } catch (error: any) {
    console.error("Error in createApplicationWithPlan", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches an application and its tasks for a given application ID.
 */
export async function getApplicationState(
  supabase: SupabaseClient<Database>,
  applicationId: string
): Promise<{ success: boolean; application?: any; tasks?: any[]; error?: string }> {
  try {
    // Get application record
    const { data: appRow, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (appError || !appRow) {
      return { success: false, error: appError?.message || "Application not found" };
    }

    // Fetch program details via recommendation -> program
    let programName: string | null = null;
    let institutionName: string | null = null;
    let degreeType: string | null = null;
    if (appRow.recommendation_id) {
      // Get recommendation record to find program_id
      const { data: recRow, error: recError } = await supabase
        .from("recommendations")
        .select("program_id")
        .eq("id", appRow.recommendation_id)
        .maybeSingle();
      if (!recError && recRow?.program_id) {
        // Get program details
        const { data: progRow, error: progError } = await supabase
          .from("programs")
          .select("name, institution, degree_type")
          .eq("id", recRow.program_id)
          .maybeSingle();
        if (!progError && progRow) {
          programName = progRow.name;
          institutionName = progRow.institution;
          degreeType = progRow.degree_type;
        }
      }
    }

    // Include program fields on returned application object
    const application = {
      ...appRow,
      program_name: programName,
      institution_name: institutionName,
      degree_type: degreeType,
    };

    // Get tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("application_tasks")
      .select("*")
      .eq("application_id", applicationId)
      .order("sort_order", { ascending: true });
    if (tasksError) {
      return { success: false, error: tasksError.message };
    }

    return { success: true, application, tasks: tasks || [] };
  } catch (error: any) {
    console.error("Error in getApplicationState", error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates a specific task within an application.
 */
export async function updateApplicationTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
  updates: Partial<{ title: string; description: string; due_date: string; status: string; sort_order: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitize updates: remove keys with undefined, null, or empty string values to avoid DB errors (e.g., due_date "")
    const sanitized: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        sanitized[key] = value;
      }
      // Special case: allow clearing due_date by passing null explicitly
      if (key === "due_date" && value === null) {
        sanitized[key] = null;
      }
    });

    if (Object.keys(sanitized).length === 0) {
      return { success: false, error: "No valid updates provided" };
    }

    const { error } = await supabase
      .from("application_tasks")
      .update(sanitized)
      .eq("id", taskId);
    if (error) {
      console.error("Failed to update application task", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error in updateApplicationTask", error);
    return { success: false, error: error.message };
  }
} 