import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { programEvaluationSchema } from '@/lib/ai/planningAgent';
import type { RecommendationProgram, EducationPathway, UserProfile } from '@/app/recommendations/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { previousResponseId, pathwayId } = await req.json();
    if (!previousResponseId || !pathwayId) {
      return NextResponse.json({ error: 'Missing previousResponseId or pathwayId' }, { status: 400 });
    }

    // Fetch pathway and user profile from Supabase
    const supabase = await createSupabaseClient();
    const { data: pathway, error: pathwayError } = await supabase
      .from('education_pathways')
      .select('*')
      .eq('id', pathwayId)
      .single();
    if (pathwayError || !pathway) {
      return NextResponse.json({ error: pathwayError?.message || 'Pathway not found' }, { status: 404 });
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', pathway.user_id)
      .single();
    if (profileError || !profileData) {
      return NextResponse.json({ error: profileError?.message || 'User profile not found' }, { status: 404 });
    }

    // Map profileData to UserProfile type (simple cast)
    const userProfile = profileData as UserProfile;
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Call OpenAI Responses API to regenerate the JSON
    const requestOptions: any = {
      model: 'o4-mini-2025-04-16',
      store: true,
      previous_response_id: previousResponseId,
      input: [
        { role: 'user', content: 'Please re-output the previous program evaluation JSON again, strictly following the schema, with no additional explanation.' }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'program_evaluation',
          schema: programEvaluationSchema,
          strict: true
        }
      }
    };

    const response = await openai.responses.create(requestOptions);
    if (response.status === 'incomplete') {
      return NextResponse.json({ error: 'OpenAI response incomplete' }, { status: 500 });
    }

    // Extract output text
    let outputText: string | undefined = response.output_text;
    if (!outputText && Array.isArray(response.output)) {
      for (const item of response.output) {
        if ((item as any).text) {
          outputText = (item as any).text;
          break;
        }
      }
    }
    if (!outputText) {
      return NextResponse.json({ error: 'No output text from OpenAI' }, { status: 500 });
    }

    // Parse JSON
    const result = JSON.parse(outputText) as { programs: RecommendationProgram[] };

    return NextResponse.json({ programs: result.programs, responseId: response.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 