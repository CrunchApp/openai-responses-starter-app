import OpenAI from "openai";

const openai = new OpenAI();

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const vectorStoreId = searchParams.get("vector_store_id");

  if (!vectorStoreId) {
    return new Response(
      JSON.stringify({ error: 'Vector store ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Delete the vector store
    await openai.vectorStores.del(vectorStoreId);

    // Return successful response
    return new Response(
      JSON.stringify({ success: true, message: 'Vector store deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Error deleting vector store:", error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 