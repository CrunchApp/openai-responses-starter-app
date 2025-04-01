import OpenAI from "openai";

const openai = new OpenAI();

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");

  if (!fileId) {
    return new Response(
      JSON.stringify({ error: 'File ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Delete the file
    await openai.files.del(fileId);

    // Return successful response
    return new Response(
      JSON.stringify({ success: true, message: 'File deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Log the error for debugging
    console.error("--- Error during OpenAI file deletion --- ");
    console.error("Timestamp:", new Date().toISOString());
    console.error("File ID attempted:", fileId); // Log the file ID
    console.error("Full Error Object:", error);

    if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if ('code' in error) console.error("Error Code:", error.code); 
        if ('type' in error) console.error("Error Type:", error.type); 
        if ('status' in error) console.error("HTTP Status:", error.status); 
        if ('request_id' in error) console.error("OpenAI Request ID:", error.request_id);
    }

    if (error.status === 404 || (error instanceof Error && error.message.includes('No such File object'))) {
      console.warn(`Received a 404. File ${fileId} might have ALREADY been deleted, or there's an API/SDK inconsistency.`);
    }
    console.error("--- End Error --- ");
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStatus = typeof error.status === 'number' ? error.status : 500; // Use status from error if available

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: errorStatus, headers: { "Content-Type": "application/json" } }
    );
  }
} 