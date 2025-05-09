import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }
    const userId = user.id;

    // Fetch pathways for user via RPC
    const { data, error } = await supabase.rpc("get_user_pathways", {
      p_user_id: userId,
    });
    if (error) {
      console.error("Error fetching user pathways", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pathways: data });
  } catch (err: any) {
    console.error("Unexpected error in list_user_pathways", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
} 