import OpenAI from "openai";
const openai = new OpenAI();

export async function POST(request: Request) {
  const { fileObject } = await request.json();

  try {
    const fileBuffer = Buffer.from(fileObject.content, "base64");
    const fileBlob = new Blob([fileBuffer], {
      type: "application/octet-stream",
    });

    const file = await openai.files.create({
      file: new File([fileBlob], fileObject.name),
      purpose: "assistants",
    });

    return new Response(JSON.stringify(file), { status: 200 });
  } catch (error) {
    console.error("--- Error during OpenAI file upload ---");
    console.error("Timestamp:", new Date().toISOString());
    // Attempt to log file name if fileObject is available in scope
    // Note: fileObject might not be directly accessible here depending on exact error point
    // Consider passing it or logging earlier if needed. We'll log the error object itself.
    console.error("Full Error Object:", error); 

    if (error instanceof Error) {
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        // Check for specific properties common in network or SDK errors
        if ('code' in error) console.error("Error Code:", (error as any).code); 
        if ('type' in error) console.error("Error Type:", (error as any).type); 
        if ('status' in error) console.error("HTTP Status (if available):", (error as any).status);
        if ('cause' in error) console.error("Cause:", (error as any).cause); // Log the cause, useful for ECONNRESET
    }

    if (error instanceof Error && (error.message.includes('ECONNRESET') || (error as any).cause?.code === 'ECONNRESET')) {
        console.warn("ECONNRESET detected. The file *might* have been uploaded successfully on OpenAI's side despite this client-side connection error.");
    }
    console.error("--- End Error ---");
    // Ensure fileObject is defined before accessing properties
    const fileName = typeof fileObject !== 'undefined' && fileObject ? fileObject.name : 'unknown';
    console.error(`Error uploading file: ${fileName}`); // Added original console log back for consistency if needed

    return new Response("Error uploading file", { status: 500 });
  }
}
