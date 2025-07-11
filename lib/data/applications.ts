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
    // Sanitize updates
    const sanitized: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        sanitized[key] = value;
      }
      if (key === "due_date" && value === null) {
        sanitized[key] = null;
      }
    });
    if (Object.keys(sanitized).length === 0) {
      return { success: false, error: "No valid updates provided" };
    }

    // Update the single task row
    const { error } = await supabase
      .from("application_tasks")
      .update(sanitized)
      .eq("id", taskId);
    if (error) {
      console.error("Failed to update application task", error);
      return { success: false, error: error.message };
    }

    // Fetch the application_id for this task
    const { data: taskRow, error: rowError } = await supabase
      .from("application_tasks")
      .select("application_id")
      .eq("id", taskId)
      .maybeSingle();
    if (!rowError && taskRow?.application_id) {
      const appId = taskRow.application_id;
      // Fetch all tasks to rebuild checklist JSON
      const { data: allTasks } = await supabase
        .from("application_tasks")
        .select("title, description, due_date, sort_order")
        .eq("application_id", appId)
        .order("sort_order", { ascending: true });
      if (allTasks) {
        // Update applications JSONB checklist
        await supabase
          .from("applications")
          .update({ checklist: allTasks })
          .eq("id", appId);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error in updateApplicationTask", error);
    return { success: false, error: error.message };
  }
}

// Add function for creating a new application task
export async function createApplicationTask(
  supabase: SupabaseClient<Database>,
  params: {
    applicationId: string;
    title: string;
    description: string;
    due_date: string;
    sort_order: number;
  }
): Promise<{ success: boolean; task?: any; error?: string }> {
  try {
    const newTaskId = uuidv4();
    const taskRow = {
      id: newTaskId,
      application_id: params.applicationId,
      title: params.title,
      description: params.description,
      due_date: params.due_date,
      sort_order: params.sort_order,
      status: 'pending',
    };
    const { data, error } = await supabase
      .from('application_tasks')
      .insert([taskRow])
      .select()
      .single();
    if (error) {
      console.error('Failed to create application task', error);
      return { success: false, error: error.message };
    }
    // Sync JSONB checklist
    const { data: allTasks, error: tasksError } = await supabase
      .from('application_tasks')
      .select('title, description, due_date, sort_order')
      .eq('application_id', params.applicationId)
      .order('sort_order', { ascending: true });
    if (!tasksError && allTasks) {
      await supabase
        .from('applications')
        .update({ checklist: allTasks })
        .eq('id', params.applicationId);
    }
    return { success: true, task: data };
  } catch (error: any) {
    console.error('Error in createApplicationTask', error);
    return { success: false, error: error.message };
  }
}

// Add function for deleting an application task
export async function deleteApplicationTask(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find application_id before delete
    const { data: taskRow, error: rowError } = await supabase
      .from('application_tasks')
      .select('application_id')
      .eq('id', taskId)
      .maybeSingle();
    const appId = taskRow?.application_id;

    const { error } = await supabase
      .from('application_tasks')
      .delete()
      .eq('id', taskId);
    if (error) {
      console.error('Failed to delete application task', error);
      return { success: false, error: error.message };
    }
    // Sync JSONB checklist if we had the application ID
    if (appId) {
      const { data: allTasks, error: tasksError } = await supabase
        .from('application_tasks')
        .select('title, description, due_date, sort_order')
        .eq('application_id', appId)
        .order('sort_order', { ascending: true });
      if (!tasksError && allTasks) {
        await supabase
          .from('applications')
          .update({ checklist: allTasks })
          .eq('id', appId);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteApplicationTask', error);
    return { success: false, error: error.message };
  }
}

// Add function for updating the application timeline
export async function updateApplicationTimeline(
  supabase: SupabaseClient<Database>,
  applicationId: string,
  timeline: { label: string; target_date: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('applications')
      .update({ timeline })
      .eq('id', applicationId);
    if (error) {
      console.error('Failed to update application timeline', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateApplicationTimeline', error);
    return { success: false, error: error.message };
  }
} 