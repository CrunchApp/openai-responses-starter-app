import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Verify API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured.' },
      { status: 500 }
    );
  }

  try {
    // Authenticate the user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const { vectorStoreId, fileIds } = await request.json();

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store ID is required' },
        { status: 400 }
      );
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one file ID is required' },
        { status: 400 }
      );
    }

    // Verify user has permission to add files to this vector store
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('vector_store_id')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Error retrieving user profile' },
        { status: 500 }
      );
    }
    
    if (profile.vector_store_id !== vectorStoreId) {
      return NextResponse.json(
        { error: 'You do not have permission to add files to this vector store' },
        { status: 403 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Add files to vector store in a batch
    const fileBatch = await openai.vectorStores.fileBatches.create(
      vectorStoreId,
      {
        file_ids: fileIds
      }
    );

    return NextResponse.json({
      success: true,
      batch_id: fileBatch.id,
      status: fileBatch.status
    });
  } catch (error) {
    console.error('Error adding files to vector store batch:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add files to vector store',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 