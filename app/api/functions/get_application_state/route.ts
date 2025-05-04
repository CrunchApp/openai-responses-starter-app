import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApplicationState } from "@/lib/data/applications";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { application_id } = await request.json();
  if (!application_id) {
    return NextResponse.json({ error: "Missing application_id" }, { status: 400 });
  }

  const result = await getApplicationState(supabase, application_id as string);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to fetch application state" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    application: result.application,
    tasks: result.tasks,
  });
} 