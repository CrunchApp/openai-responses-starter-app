import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI();

/**
 * POST /api/vector_stores/conversation_file
 * Upsert a single JSON file per conversation in the user's vector store.
 * Body: { conversation_id: string, messages: Array<{ role: string, content: string }> }
 */
export async function POST(request: Request) {
  const { conversation_id, messages } = await request.json();
  // Initialize Supabase and authenticate
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
  }
  // Verify conversation ownership
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .eq('user_id', user.id)
    .single();
  if (convError || !conv) {
    return new Response(JSON.stringify({ error: 'Conversation not found or access denied' }), { status: 404 });
  }
  // Fetch user's vector store ID from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('vector_store_id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile?.vector_store_id) {
    return new Response(JSON.stringify({ error: 'Vector store not configured' }), { status: 400 });
  }
  const vectorStoreId = profile.vector_store_id;

  // Get existing pointer row
  const { data: pointer } = await supabase
    .from('conversation_vector_files')
    .select('vector_store_file_id')
    .eq('conversation_id', conversation_id)
    .single();
  const oldFileId = pointer?.vector_store_file_id;

  // Prepare new file content
  const jsonStr = JSON.stringify(messages, null, 2);
  const base64 = Buffer.from(jsonStr).toString('base64');
  const fileName = `conversation_${conversation_id}_${Date.now()}.json`;
  const fileBlob = Buffer.from(base64, 'base64');
  const file = await openai.files.create({
    file: new File([fileBlob], fileName),
    purpose: 'assistants',
  });
  const newFileId = file.id;

  // Add to vector store
  await openai.vectorStores.files.create(vectorStoreId, { file_id: newFileId });

  // Upsert pointer row in Supabase
  if (pointer) {
    await supabase
      .from('conversation_vector_files')
      .update({ vector_store_file_id: newFileId, updated_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id);
  } else {
    await supabase
      .from('conversation_vector_files')
      .insert({ conversation_id: conversation_id, vector_store_file_id: newFileId });
  }

  // Cleanup old file from vector store and OpenAI
  if (oldFileId) {
    try {
      await openai.vectorStores.files.del(vectorStoreId, oldFileId);
      await openai.files.del(oldFileId);
    } catch (_) {
      // ignore errors cleaning up old files
    }
  }

  return new Response(JSON.stringify({ file_id: newFileId }), { status: 200 });
} 