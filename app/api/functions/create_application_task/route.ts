import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createApplicationTask } from "@/lib/data/applications";

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

  const { application_id, title, description, due_date, sort_order } = await request.json();
  if (!application_id || !title || due_date === undefined || sort_order === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await createApplicationTask(supabase, {
    applicationId: application_id,
    title,
    description,
    due_date,
    sort_order,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, task: result.task });
} 