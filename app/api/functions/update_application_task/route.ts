import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateApplicationTask } from "@/lib/data/applications";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { task_id, updates } = await request.json();
    if (!task_id) {
      return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
    }
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: "Missing updates object" }, { status: 400 });
    }

    const result = await updateApplicationTask(supabase, task_id, updates);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in update_application_task API", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 