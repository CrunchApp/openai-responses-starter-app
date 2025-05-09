import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/functions/get_recommendation_by_program
 * Expects query params:
 *   name         – Program name (string, required)
 *   institution  – Institution name (string, required)
 *
 * Optional params can be extended later (e.g. degree_type).
 *
 * Responds with { success: boolean, recommendation_id?: string, program_id?: string, error?: string }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const institution = searchParams.get("institution");

  // Require at least one of name or institution
  if (!name && !institution) {
    return NextResponse.json(
      { success: false, error: "Missing required query parameter: provide name or institution" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  try {
    /**
     * Search for the program by name and/or institution.
     */
    // Build a case-insensitive wildcard search: match name OR institution
    let programQuery = supabase.from("programs").select("id");
    const namePattern = name ? `%${name.trim()}%` : null;
    const instPattern = institution ? `%${institution.trim()}%` : null;
    if (namePattern && instPattern) {
      // OR: match either field
      programQuery = programQuery.or(
        `name.ilike.${namePattern},institution.ilike.${instPattern}`
      );
    } else if (namePattern) {
      programQuery = programQuery.ilike("name", namePattern);
    } else if (instPattern) {
      programQuery = programQuery.ilike("institution", instPattern);
    }
    const { data: programRow, error: programError } = await programQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (programError) throw programError;
    if (!programRow) {
      return NextResponse.json(
        { success: false, error: "No program found matching the given criteria" },
        { status: 404 }
      );
    }

    const programId = programRow.id as string;

    const { data: recRow, error: recError } = await supabase
      .from("recommendations")
      .select("id")
      .eq("program_id", programId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recError) throw recError;
    if (!recRow) {
      return NextResponse.json(
        { success: false, error: "No recommendation found for this program for the current user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, recommendation_id: recRow.id, program_id: programId });
  } catch (err: any) {
    console.error("Error in get_recommendation_by_program route", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
} 