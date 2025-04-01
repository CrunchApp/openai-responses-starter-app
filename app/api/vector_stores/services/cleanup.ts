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

/**
 * Clean up specific files from a vector store
 * @param vectorStoreId The ID of the vector store containing the files
 * @param fileIds Array of file IDs to delete
 * @returns A result object indicating success or failure
 */
export async function cleanupVectorStoreFiles(
  vectorStoreId: string, 
  fileIds: string[]
): Promise<{
  success: boolean;
  message: string;
  deletedFiles: number;
  error?: any;
}> {
  try {
    console.log(`Cleaning up ${fileIds.length} files from vector store ${vectorStoreId}`);
    
    if (!fileIds.length) {
      return {
        success: true,
        message: "No files to delete",
        deletedFiles: 0
      };
    }
    
    let deletedCount = 0;
    let errors = [];
    
    // Process each file ID
    for (const fileId of fileIds) {
      try {
        // First remove the file from the vector store
        await openai.vectorStores.files.del(vectorStoreId, fileId);
        
        // Then delete the file from OpenAI
        await openai.files.del(fileId);
        
        deletedCount++;
      } catch (fileError) {
        console.error(`Error removing file ${fileId} from vector store:`, fileError);
        errors.push(`Error with file ${fileId}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
        // Continue with other files even if one fails
      }
    }
    
    // Return result with information about partial success if needed
    if (errors.length > 0) {
      return {
        success: deletedCount > 0, // Consider it a partial success if at least one file was deleted
        message: `Deleted ${deletedCount}/${fileIds.length} files. Encountered ${errors.length} errors.`,
        deletedFiles: deletedCount,
        error: errors.join('; ')
      };
    }
    
    return {
      success: true,
      message: `Successfully deleted ${deletedCount} files from vector store ${vectorStoreId}`,
      deletedFiles: deletedCount
    };
  } catch (error) {
    console.error("Error in cleanupVectorStoreFiles process:", error);
    return {
      success: false,
      message: "Failed to clean up vector store files",
      deletedFiles: 0,
      error: error instanceof Error ? error.message : error,
    };
  }
} 