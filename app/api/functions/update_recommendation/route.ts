import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendation_id, program, scholarships, recommendation: recUpdates, files } = body;

    if (!recommendation_id) {
      return NextResponse.json({ success: false, error: "Missing recommendation_id" }, { status: 400 });
    }

    // Authenticated client with RLS for recommendation updates
    const supabase = await createAuthClient();
    // Admin client with service role to bypass RLS for programs and scholarships
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }
    const userId = user.id;

    // Fetch the recommendation to confirm ownership and get program_id
    const { data: recRow, error: recErr } = await supabase
      .from("recommendations")
      .select("program_id")
      .eq("id", recommendation_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (recErr || !recRow) {
      return NextResponse.json({ success: false, error: "Recommendation not found" }, { status: 404 });
    }
    const programId = recRow.program_id;

    // 1. Update program details if provided
    if (program && typeof program === "object") {
      const progUpdates: Record<string, any> = {};
      [
        "name", "institution", "degree_type", "field_of_study", "description",
        "cost_per_year", "duration", "location", "start_date", "application_deadline",
        "requirements", "highlights", "page_link", "page_links"
      ].forEach((key) => {
        if (program[key] !== undefined) progUpdates[key] = program[key];
      });
      if (Object.keys(progUpdates).length > 0) {
        const { error: progErr } = await admin
          .from("programs")
          .update(progUpdates)
          .eq("id", programId);
        if (progErr) {
          return NextResponse.json({ success: false, error: `Error updating program: ${progErr.message}` }, { status: 500 });
        }
      }

      // 2. Update scholarships if provided
      if (Array.isArray(scholarships)) {
        // Clear existing scholarships
        const { error: delErr } = await admin
          .from("program_scholarships")
          .delete()
          .eq("program_id", programId);
        if (delErr) {
          return NextResponse.json({ success: false, error: `Error clearing scholarships: ${delErr.message}` }, { status: 500 });
        }
        // Insert new scholarships
        for (const s of scholarships) {
          const { error: insErr } = await admin
            .from("program_scholarships")
            .insert({ program_id: programId, name: s.name, amount: s.amount, eligibility: s.eligibility });
          if (insErr) {
            return NextResponse.json({ success: false, error: `Error inserting scholarship: ${insErr.message}` }, { status: 500 });
          }
        }
      }
    }

    // 3. Update recommendation fields if provided
    if (recUpdates && typeof recUpdates === "object") {
      const recFields: Record<string, any> = {};
      ["match_score", "match_rationale", "is_favorite", "pathway_id", "vector_store_id"].forEach((key) => {
        if (recUpdates[key] !== undefined) recFields[key] = recUpdates[key];
      });
      if (Object.keys(recFields).length > 0) {
        const { error: recUpdErr } = await supabase
          .from("recommendations")
          .update(recFields)
          .eq("id", recommendation_id);
        if (recUpdErr) {
          return NextResponse.json({ success: false, error: `Error updating recommendation: ${recUpdErr.message}` }, { status: 500 });
        }
      }
    }

    // 4. Update recommendation_files if provided
    if (Array.isArray(files)) {
      // Remove existing file mappings
      const { error: delFilesErr } = await supabase
        .from("recommendation_files")
        .delete()
        .eq("recommendation_id", recommendation_id);
      if (delFilesErr) {
        return NextResponse.json({ success: false, error: `Error clearing recommendation files: ${delFilesErr.message}` }, { status: 500 });
      }
      // Save new files via server RPC
      for (const f of files) {
        const { error: saveFileErr } = await supabase.rpc(
          "save_recommendation_file_server",
          {
            p_recommendation_id: recommendation_id,
            p_file_id: f.file_id,
            p_file_name: f.file_name,
          }
        );
        if (saveFileErr) {
          return NextResponse.json({ success: false, error: `Error saving recommendation file ${f.file_id}: ${saveFileErr.message}` }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in update_recommendation route", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
} 