import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSingleRecommendationToVectorStore } from "@/app/recommendations/vector-store-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { program } = body;

    if (!program) {
      return NextResponse.json(
        { error: "Missing program object" },
        { status: 400 }
      );
    }

    const requiredProgramFields = [
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
    ];
    for (const f of requiredProgramFields) {
      if (program[f] === undefined || program[f] === null) {
        return NextResponse.json(
          { error: `Missing required program field: ${f}` },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    const userId = user.id;

    // Fetch vector_store_id from profile
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("vector_store_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profileRow) {
      return NextResponse.json(
        { error: "Unable to retrieve user profile" },
        { status: 500 }
      );
    }
    const vectorStoreId = profileRow.vector_store_id as string | null;
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: "Vector store not configured for user" },
        { status: 400 }
      );
    }

    // Prepare recommendation payload for RPC
    const recommendationData = {
      name: program.name,
      institution: program.institution,
      degreeType: program.degree_type,
      fieldOfStudy: program.field_of_study,
      description: program.description,
      costPerYear: program.cost_per_year,
      duration: program.duration,
      location: program.location,
      startDate: program.start_date,
      applicationDeadline: program.application_deadline,
      requirements: program.requirements || [],
      highlights: program.highlights || [],
      pageLink: program.page_link,
      pageLinks: program.page_links || [],
      match_score: program.match_score,
      is_favorite: program.is_favorite || false,
      match_rationale: program.match_rationale,
      scholarships: program.scholarships || [],
    };

    // Call RPC store_recommendation
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "store_recommendation",
      {
        p_user_id: userId,
        p_vector_store_id: vectorStoreId,
        p_recommendation: recommendationData,
        p_pathway_id: null,
      }
    );

    if (rpcError) {
      console.error("Error storing recommendation", rpcError);
      return NextResponse.json(
        { error: `Failed to store recommendation: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // Determine recommendation_id and program_id based on RPC response shape
    let recommendationId: string;
    let programId: string;
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      const row = rpcData[0] as any;
      if (!row.success && !row.recommendation_id) {
        return NextResponse.json(
          { error: row.error || "Unknown error saving recommendation" },
          { status: 500 }
        );
      }
      recommendationId = row.recommendation_id;
      programId = row.program_id;
    } else if (typeof rpcData === "string") {
      recommendationId = rpcData;
      // Fetch program_id from recommendations table
      const { data: recRow, error: recError } = await supabase
        .from("recommendations")
        .select("program_id")
        .eq("id", recommendationId)
        .maybeSingle();
      if (recError || !recRow) {
        console.error("Error fetching recommendation record", recError);
        return NextResponse.json(
          { error: "Failed to retrieve program_id for recommendation" },
          { status: 500 }
        );
      }
      programId = recRow.program_id as string;
    } else {
      return NextResponse.json(
        { error: "Unknown error saving recommendation" },
        { status: 500 }
      );
    }

    // Sync to vector store
    try {
      await syncSingleRecommendationToVectorStore(
        userId,
        {
          id: recommendationId,
          program_id: programId,
          pathway_id: null,
          ...program,
          matchScore: program.match_score,
          matchRationale: program.match_rationale,
          isFavorite: program.is_favorite || false,
          pageLinks: program.page_links || (program.page_link ? [program.page_link] : []),
        },
        vectorStoreId
      );
    } catch (vsErr) {
      console.warn("Vector store sync failed", vsErr);
    }

    return NextResponse.json({ success: true, recommendation_id: recommendationId });
  } catch (err: any) {
    console.error("Error in create_recommendation route", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
} 