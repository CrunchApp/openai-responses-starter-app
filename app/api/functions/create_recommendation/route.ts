import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncSingleRecommendationToVectorStore } from "@/app/recommendations/vector-store-helpers";
import { fetchProgramPageLinks } from '@/lib/ai/linkSearch';

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

    // Consolidate links: preserve LLM link and add custom search candidates
    const llmLink = program.page_link as string;
    const customLinks = await fetchProgramPageLinks(program.name, program.institution);
    const pageLinks = Array.from(new Set([
      ...(llmLink ? [llmLink] : []),
      ...customLinks
    ]));
    const pageLink = pageLinks[0] || '';

    // Enforce scholarship data: require non-empty scholarships array
    if (!Array.isArray(program.scholarships) || program.scholarships.length === 0) {
      return NextResponse.json(
        { error: "Missing required program field: scholarships. Please gather scholarship information via web_search." },
        { status: 400 }
      );
    }

    // Avoid duplicate recommendations: check if this program already recommended
    const { data: existingPrograms } = await supabase
      .from('programs')
      .select('id')
      .eq('name', program.name)
      .eq('institution', program.institution)
      .limit(1);
    if (existingPrograms && existingPrograms.length > 0) {
      const existingProgramId = existingPrograms[0].id;
      const { data: existingRec } = await supabase
        .from('recommendations')
        .select('id')
        .eq('user_id', userId)
        .eq('program_id', existingProgramId)
        .maybeSingle();

      /*
        If the current user already has a recommendation for this program we should
        inform the assistant so it can pick a different, truly "new" program.
        Returning success: true here (the previous behaviour) made the model think it
        had successfully created something novel which resulted in duplicate
        suggestions.  Instead we now return an explicit 409 (Conflict) together with
        success: false and the existing recommendation_id so the assistant can act
        accordingly (e.g. choose another program or simply surface the existing one).
      */
      if (existingRec && existingRec.id) {
        return NextResponse.json(
          {
            success: false,
            error: "Program already recommended for this user. Please choose a different program or return the existing recommendation instead of creating a duplicate.",
            recommendation_id: existingRec.id,
          },
          { status: 409 }
        );
      }
    }

    // ----- Sanitize numeric scores -----
    const rawMatchScore = program.match_score;
    let matchScoreInt: number;
    if (typeof rawMatchScore === "number") {
      matchScoreInt = rawMatchScore <= 1 ? Math.round(rawMatchScore * 100) : Math.round(rawMatchScore);
    } else {
      matchScoreInt = 70; // default
    }

    const convertSubScore = (val: any) => {
      if (typeof val === "number") {
        const num = val <= 1 ? val * 100 : val;
        return Math.min(100, Math.max(0, Math.round(num)));
      }
      return 70;
    };

    const sanitizedRationale = {
      careerAlignment: convertSubScore(program.match_rationale?.careerAlignment),
      budgetFit: convertSubScore(program.match_rationale?.budgetFit),
      locationMatch: convertSubScore(program.match_rationale?.locationMatch),
      academicFit: convertSubScore(program.match_rationale?.academicFit),
    };

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
      pageLink: pageLink,
      pageLinks: pageLinks,
      requirements: program.requirements || [],
      highlights: program.highlights || [],
      scholarships: program.scholarships || [],
      match_score: matchScoreInt,
      is_favorite: program.is_favorite || false,
      match_rationale: sanitizedRationale,
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
          pageLink: pageLink,
          pageLinks: pageLinks,
          matchScore: program.match_score,
          matchRationale: program.match_rationale,
          isFavorite: program.is_favorite || false,
          scholarships: program.scholarships || [],
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