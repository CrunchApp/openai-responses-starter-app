import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    // Verify API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the request
    const { vectorStoreId, fileId } = await request.json();
    
    // Validate required parameters
    if (!vectorStoreId) {
      return new Response(
        JSON.stringify({ error: "Vector store ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "File ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Adding file ${fileId} to vector store ${vectorStoreId}`);
    
    // Add the file to the vector store
    const vectorStore = await openai.vectorStores.files.create(
      vectorStoreId,
      {
        file_id: fileId,
      }
    );
    
    console.log(`Successfully added file ${fileId} to vector store ${vectorStoreId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        object: vectorStore.object,
        id: vectorStore.id
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error adding file:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: "Error adding file to vector store",
        details: errorMessage
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
