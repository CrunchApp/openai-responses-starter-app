import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

// Placeholder for Supabase client setup
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!); 

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const naturalQuery = searchParams.get("query");

  if (!naturalQuery) {
    return NextResponse.json(
      { error: "Missing natural language query parameter" },
      { status: 400 }
    );
  }

  console.log("Received Supabase query request:", naturalQuery);

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error in query_supabase:', authError?.message);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // --- Call Supabase Function --- 
    // TODO: Create the corresponding SQL function 'search_user_context' in a Supabase migration.
    // This function should accept p_user_id (uuid) and p_natural_query (text)
    // and return relevant user context as JSONB.
    const { data: queryResult, error: rpcError } = await supabase.rpc(
      'search_user_context', 
      {
        p_user_id: user.id,
        p_natural_query: naturalQuery
      }
    );

    if (rpcError) {
      console.error('Error calling Supabase function search_user_context:', rpcError);
      throw new Error(`Failed to query Supabase: ${rpcError.message}`);
    }

    console.log("Supabase query result:", queryResult);

    // Return the data fetched from the Supabase function
    return NextResponse.json(queryResult || { message: "No relevant context found." });

  } catch (error) {
    console.error("Error processing Supabase query:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process Supabase query";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 