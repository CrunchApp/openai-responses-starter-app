import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A valid name is required for the vector store' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create vector store with OpenAI API
    const vectorStore = await openai.vectorStores.create({
      name,
    });

    // Return successful response with the created vector store data
    return new Response(
      JSON.stringify(vectorStore),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Error creating vector store:", error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
