import OpenAI from "openai";

const openai = new OpenAI();

/**
 * Clean up a vector store and all its associated files
 * @param vectorStoreId The ID of the vector store to clean up
 * @returns A result object indicating success or failure
 */
export async function cleanupVectorStore(vectorStoreId: string): Promise<{ 
  success: boolean; 
  message: string; 
  clearedStoreId?: string;
  error?: any 
}> {
  try {
    // First, get all files associated with the vector store
    const listResponse = await openai.vectorStores.files.list(vectorStoreId);
    const files = listResponse.data || [];
    
    // Remove each file from the vector store
    for (const file of files) {
      try {
        if (file.id) {
          // First remove the file from the vector store
          await openai.vectorStores.files.del(vectorStoreId, file.id);
          
          // Then delete the file from OpenAI
          await openai.files.del(file.id);
        }
      } catch (fileError) {
        console.error(`Error removing file ${file.id} from vector store:`, fileError);
        // Continue with other files even if one fails
      }
    }
    
    // Finally, delete the vector store itself
    await openai.vectorStores.del(vectorStoreId);
    
    return {
      success: true,
      message: `Vector store ${vectorStoreId} and ${files.length} files successfully cleaned up`,
      clearedStoreId: vectorStoreId, // Add the cleared store ID so client can update toolsStore
    };
  } catch (error) {
    console.error("Error in cleanup process:", error);
    return {
      success: false,
      message: "Failed to clean up vector store",
      error: error instanceof Error ? error.message : error,
    };
  }
} 