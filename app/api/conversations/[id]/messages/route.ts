'use server';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Add a new message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string | Promise<string> } }
) {
  try {
    const conversationId = await params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const { message_content, role } = await request.json();
    
    if (!message_content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Add the message to the conversation
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        message_content: typeof message_content === 'string' 
          ? message_content 
          : JSON.stringify(message_content),
        role: role || 'user'  // Default to 'user' if not specified
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      );
    }

    // Update the conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error adding message:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get all messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string | Promise<string> } }
) {
  try {
    const conversationId = await params.id;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First, verify the conversation belongs to the user
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch all messages for this conversation
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Unexpected error fetching messages:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 