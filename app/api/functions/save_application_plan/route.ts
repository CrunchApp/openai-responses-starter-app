import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApplicationWithPlan } from "@/lib/data/applications";
import { ApplicationPlan } from "@/lib/ai/applicationManager"; // Import type

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get auth user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const userId = user.id;

    // Arguments from the assistant tool call
    const { recommendation_id, plan, previous_response_id } = await request.json();

    // Validate required arguments
    if (!recommendation_id || !plan || !plan.checklist || !plan.timeline) {
      return NextResponse.json({ error: "Missing required arguments for save_application_plan" }, { status: 400 });
    }

    // Fetch program file id from recommendation_files
    const { data: recFileRow, error: recFileError } = await supabase
      .from("recommendation_files")
      .select("file_id")
      .eq("recommendation_id", recommendation_id)
      .maybeSingle();
    if (recFileError || !recFileRow) {
      return NextResponse.json({ error: "Program file not found for recommendation" }, { status: 404 });
    }
    const programFileId = recFileRow.file_id as string;

    // Fetch profile file id from profiles table
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("profile_file_id, vector_store_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profileRow || !profileRow.profile_file_id) {
      return NextResponse.json({ error: "Profile file not found for user" }, { status: 404 });
    }
    const profileFileId = profileRow.profile_file_id as string;
    const vectorStoreId = profileRow.vector_store_id as string | null;
    if (!vectorStoreId) {
      return NextResponse.json({ error: "Vector store not configured for user" }, { status: 400 });
    }

    // Store in database using existing helper
    const result = await createApplicationWithPlan(supabase, {
      userId,
      recommendationId: recommendation_id,
      profileFileId,
      programFileId,
      plan: plan as ApplicationPlan,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to save application plan" },
        { status: 500 }
      );
    }

    // Persist planner_response_id for chaining
    if (previous_response_id) {
      await supabase
        .from('applications')
        .update({ planner_response_id: previous_response_id })
        .eq('id', result.applicationId);
    }

    // Return the application ID and previous_response_id for follow-up turns
    return NextResponse.json({
      success: true,
      application_id: result.applicationId,
      previous_response_id: previous_response_id || null,
    });

  } catch (error: any) {
    console.error("Error in save_application_plan API", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 