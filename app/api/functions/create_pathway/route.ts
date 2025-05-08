import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation of required fields
    const requiredFields = [
      "title",
      "qualification_type",
      "field_of_study",
      "budget_range_usd",
      "duration_months",
      "alignment_rationale",
    ];
    for (const f of requiredFields) {
      if (body[f] === undefined || body[f] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${f}` },
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

    // Prepare the pathway data for stored procedure format (camelCase keys)
    const pathwayPayload = {
      title: body.title,
      qualificationType: body.qualification_type,
      fieldOfStudy: body.field_of_study,
      subfields: body.subfields || [],
      targetRegions: body.target_regions || [],
      budgetRange: body.budget_range_usd,
      duration: body.duration_months,
      alignment: body.alignment_rationale,
      alternatives: body.alternatives || [],
      queryString: body.query_string || null,
    };

    // Call RPC to create pathway (expects array)
    const { data, error } = await supabase.rpc("create_education_pathways", {
      p_user_id: userId,
      p_pathways: [pathwayPayload],
    });

    if (error) {
      console.error("Error creating pathway via RPC", error);
      return NextResponse.json(
        { error: `Failed to create pathway: ${error.message}` },
        { status: 500 }
      );
    }

    // Attempt to fetch the newly created pathway id
    let pathwayId: string | null = null;
    if (Array.isArray(data) && data.length > 0 && data[0]?.id) {
      pathwayId = data[0].id as string;
    } else {
      // Fallback: query last inserted record for this user & title
      const { data: fetchData } = await supabase
        .from("education_pathways")
        .select("id")
        .eq("user_id", userId)
        .eq("title", body.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      pathwayId = fetchData?.id || null;
    }

    return NextResponse.json({ success: true, pathway_id: pathwayId });
  } catch (err: any) {
    console.error("Error in create_pathway route", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
} 