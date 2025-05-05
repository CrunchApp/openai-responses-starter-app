import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateApplicationTimeline } from '@/lib/data/applications';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Authenticate
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { application_id, timeline } = await request.json();
  if (!application_id || !Array.isArray(timeline)) {
    return NextResponse.json({ error: 'Missing application_id or timeline array' }, { status: 400 });
  }

  const result = await updateApplicationTimeline(
    supabase,
    application_id as string,
    timeline as Array<{ label: string; target_date: string }>
  );
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 