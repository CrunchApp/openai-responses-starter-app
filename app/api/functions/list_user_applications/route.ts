import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Authenticate user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "Unauthenticated", success: false }, { status: 401 });
    }
    const userId = session.user.id;

    // Fetch applications for user
    const { data, error } = await supabase
      .from('applications')
      .select('id, recommendation_id')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching applications', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Return list of applications
    return NextResponse.json({ success: true, applications: data });
  } catch (err: any) {
    console.error('Unexpected error in list_user_applications', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 