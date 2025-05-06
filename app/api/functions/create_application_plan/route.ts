import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApplicationPlan } from "@/lib/ai/applicationManager";
import { createApplicationWithPlan } from "@/lib/data/applications";

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

    const { recommendation_id, previous_response_id } = await request.json();
    if (!recommendation_id) {
      return NextResponse.json(
        { error: "Missing recommendation_id" },
        { status: 400 }
      );
    }

    // Fetch program file id from recommendation_files table, but don't abort if missing
    const { data: recFileRow, error: recFileError } = await supabase
      .from("recommendation_files")
      .select("file_id")
      .eq("recommendation_id", recommendation_id)
      .maybeSingle();
    let programFileId: string;
    if (recFileError) {
      console.error("Error fetching program file id for recommendation", recFileError);
      // Proceed without a specific program file id
      programFileId = "";
    } else if (!recFileRow) {
      console.warn(
        `Program file not found for recommendation ${recommendation_id}, proceeding with raw program data`
      );
      programFileId = "";
    } else {
      programFileId = recFileRow.file_id as string;
    }

    // Fetch profile file id and vector_store_id from profiles table
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("profile_file_id, vector_store_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profileRow || !profileRow.profile_file_id) {
      return NextResponse.json(
        { error: "Profile file not found for user" },
        { status: 404 }
      );
    }
    const profileFileId = profileRow.profile_file_id as string;
    const vectorStoreId = profileRow.vector_store_id as string | null;

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: "Vector store not configured for user" },
        { status: 400 }
      );
    }

    // Fetch raw profile data for embedding in prompt
    const { data: profileData, error: profileDataError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profileDataError || !profileData) {
      return NextResponse.json({ error: 'Failed to fetch user profile data' }, { status: 500 });
    }
    
    // Fetch program ID from recommendations table
    const { data: recRow, error: recError } = await supabase
      .from('recommendations')
      .select('program_id')
      .eq('id', recommendation_id)
      .maybeSingle();
    if (recError || !recRow || !recRow.program_id) {
      return NextResponse.json({ error: 'Failed to fetch recommendation program ID' }, { status: 500 });
    }
    const programId = recRow.program_id;
    
    // Fetch raw program data for embedding in prompt
    const { data: programData, error: programDataError } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .maybeSingle();
    if (programDataError || !programData) {
      return NextResponse.json({ error: 'Failed to fetch program data' }, { status: 500 });
    }
    
    // Generate plan via OpenAI with embedded raw data and capture responseId
    const { plan, previousResponseId } = await generateApplicationPlan({
      profileFileId,
      programFileId,
      vectorStoreId,
      supabase,
      rawProfile: profileData,
      rawProgram: programData,
      previousResponseId: previous_response_id,
    });

    // Store in database
    const result = await createApplicationWithPlan(supabase, {
      userId,
      recommendationId: recommendation_id,
      profileFileId,
      programFileId,
      plan,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create application" },
        { status: 500 }
      );
    }

    // Persist planner_response_id for chaining
    if (previousResponseId) {
      await supabase
        .from('applications')
        .update({ planner_response_id: previousResponseId })
        .eq('id', result.applicationId);
    }

    return NextResponse.json({
      success: true,
      application_id: result.applicationId,
      previous_response_id: previousResponseId || null,
    });
  } catch (error: any) {
    console.error("Error in create_application_plan API", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 