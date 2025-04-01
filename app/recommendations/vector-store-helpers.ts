import { RecommendationProgram } from "./types";
import { createClient } from "@/lib/supabase/server";

// Helper function to get the base URL for API calls
function getBaseUrl(): string {
  // Use environment variable or default to localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// Replace browser-specific FileReader with a Node.js compatible function
const stringToBase64 = (str: string): string => {
  // In Node.js environment, use Buffer
  if (typeof window === 'undefined') {
    return Buffer.from(str).toString('base64');
  } 
  // In browser environment (should not be used in this server component, but kept for completeness)
  else {
    return btoa(str);
  }
};

/**
 * Get existing file IDs for a recommendation from the recommendation_files table
 */
async function getRecommendationFileIds(recommendationId: string): Promise<string[]> {
  try {
    console.log(`Getting file IDs for recommendation: ${recommendationId}`);
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('recommendation_files')
      .select('file_id')
      .eq('recommendation_id', recommendationId);
    
    if (error) {
      console.error('Error fetching recommendation file IDs:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No file IDs found for recommendation: ${recommendationId}`);
      return [];
    }
    
    console.log(`Found ${data.length} file IDs for recommendation: ${recommendationId}`);
    return data.map(item => item.file_id);
  } catch (error) {
    console.error('Error in getRecommendationFileIds:', error);
    return [];
  }
}

/**
 * Save a file ID to the recommendation_files table
 */
async function saveRecommendationFileId(
  recommendationId: string, 
  fileId: string, 
  fileName: string
): Promise<boolean> {
  try {
    console.log(`Saving file ID ${fileId} for recommendation: ${recommendationId}`);
    const supabase = await createClient();
    
    // Before inserting, delete any existing files for this recommendation
    await cleanupRecommendationFiles(recommendationId);
    
    // Insert the new file ID
    const { error } = await supabase
      .from('recommendation_files')
      .insert({
        recommendation_id: recommendationId,
        file_id: fileId,
        file_name: fileName
      });
    
    if (error) {
      console.error('Error saving recommendation file ID:', error);
      return false;
    }
    
    console.log(`Successfully saved file ID ${fileId} for recommendation: ${recommendationId}`);
    return true;
  } catch (error) {
    console.error('Error in saveRecommendationFileId:', error);
    return false;
  }
}

/**
 * Delete file entries for a recommendation from the recommendation_files table
 * and optionally delete the files from OpenAI
 */
async function cleanupRecommendationFiles(recommendationId: string, deleteFromOpenAI: boolean = false): Promise<boolean> {
  try {
    console.log(`Cleaning up files for recommendation: ${recommendationId}, deleteFromOpenAI: ${deleteFromOpenAI}`);
    const supabase = await createClient();
    
    // Get the file IDs first if we need to delete them from OpenAI
    let fileIds: string[] = [];
    if (deleteFromOpenAI) {
      fileIds = await getRecommendationFileIds(recommendationId);
      console.log(`Found ${fileIds.length} files to delete from OpenAI for recommendation: ${recommendationId}`);
    }
    
    // Delete the entries from the recommendation_files table
    const { error } = await supabase
      .from('recommendation_files')
      .delete()
      .eq('recommendation_id', recommendationId);
    
    if (error) {
      console.error('Error deleting recommendation file entries:', error);
      return false;
    }
    
    // If requested, delete the files from OpenAI
    if (deleteFromOpenAI && fileIds.length > 0) {
      const baseUrl = getBaseUrl();
      console.log(`Using base URL for API calls: ${baseUrl}`);
      
      const headers = await getAuthHeaders();
      
      for (const fileId of fileIds) {
        try {
          console.log(`Deleting file ${fileId} from OpenAI`);
          const deleteUrl = `${baseUrl}/api/vector_stores/delete_file?file_id=${fileId}`;
          console.log(`DELETE request to: ${deleteUrl}`);
          
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            console.error(`Failed to delete file ${fileId} from OpenAI: ${await response.text()}`);
          } else {
            console.log(`Successfully deleted file ${fileId} from OpenAI`);
          }
        } catch (deleteError) {
          console.error(`Error deleting file ${fileId} from OpenAI:`, deleteError);
        }
      }
    }
    
    console.log(`Cleanup completed for recommendation: ${recommendationId}`);
    return true;
  } catch (error) {
    console.error('Error in cleanupRecommendationFiles:', error);
    return false;
  }
}

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    
    // Create headers with content-type
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };
    
    // Add session token if available
    if (data?.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }
    
    return headers;
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return { "Content-Type": "application/json" };
  }
}

/**
 * Synchronize all recommendations for a user to their vector store
 * This will create/update JSON files for each recommendation and add them to the vector store
 */
export async function syncRecommendationsToVectorStore(
  userId: string,
  recommendations: RecommendationProgram[],
  vectorStoreId: string
): Promise<{ success: boolean; fileIds: string[]; error?: string }> {
  if (!vectorStoreId) {
    return { 
      success: false, 
      fileIds: [],
      error: "No vector store ID provided. Cannot sync recommendations."
    };
  }

  try {
    console.log(`Syncing ${recommendations.length} recommendations to Vector Store with ID: ${vectorStoreId}`);
    
    // Get base URL for absolute API paths
    const baseUrl = getBaseUrl();
    console.log(`Using base URL: ${baseUrl}`);
    
    // Get auth headers for requests
    const headers = await getAuthHeaders();
    console.log('Auth headers included:', Object.keys(headers).join(', '));
    
    // Create new files for each recommendation
    const fileIds: string[] = [];
    
    for (const recommendation of recommendations) {
      if (!recommendation.id) {
        console.error('Recommendation is missing ID, skipping:', recommendation.name);
        continue;
      }
      
      console.log(`Processing recommendation: ${recommendation.id} (${recommendation.name})`);
      
      // First, check if this recommendation already has files associated with it
      await cleanupRecommendationFiles(recommendation.id, true);
      
      // Create a rich JSON representation of the recommendation
      const recommendationJson = JSON.stringify({
        id: recommendation.id,
        name: recommendation.name,
        institution: recommendation.institution,
        degreeType: recommendation.degreeType,
        fieldOfStudy: recommendation.fieldOfStudy,
        description: recommendation.description,
        costPerYear: recommendation.costPerYear,
        duration: recommendation.duration,
        location: recommendation.location,
        startDate: recommendation.startDate,
        applicationDeadline: recommendation.applicationDeadline,
        requirements: recommendation.requirements || [],
        highlights: recommendation.highlights || [],
        pageLink: recommendation.pageLink,
        matchScore: recommendation.matchScore,
        matchRationale: recommendation.matchRationale,
        isFavorite: recommendation.isFavorite || false,
        scholarships: recommendation.scholarships || [],
        userId: userId,
        // Add metadata about when this was added
        syncedAt: new Date().toISOString()
      }, null, 2);
      
      // Convert JSON string directly to base64 (Node.js compatible)
      const base64Content = stringToBase64(recommendationJson);
      
      // Use a consistent naming pattern for recommendation files
      const fileName = `recommendation_${userId}_${recommendation.id}.json`;
      
      const fileObject = { name: fileName, content: base64Content };
      
      // Upload the file with absolute URL
      const uploadUrl = `${baseUrl}/api/vector_stores/upload_file`;
      console.log(`POST request to: ${uploadUrl}`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileObject }),
        credentials: 'include'
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
        throw new Error(`Failed to upload recommendation file for ${recommendation.id}: ${errorText}`);
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      
      if (!fileId) {
        console.error('Upload succeeded but no file ID was returned');
        throw new Error('No file ID returned from upload');
      }
      
      fileIds.push(fileId);
      
      // Save the file ID to the recommendation_files table
      await saveRecommendationFileId(recommendation.id, fileId, fileName);
      
      console.log(`Uploaded recommendation file for ${recommendation.name} with file ID: ${fileId}`);
    }
    
    // Add all files to the vector store using the batch API
    if (fileIds.length > 0) {
      console.log(`Adding ${fileIds.length} files to Vector Store: ${vectorStoreId}`);
      const batchUrl = `${baseUrl}/api/vector_stores/add_files_batch`;
      console.log(`POST request to: ${batchUrl} with data:`, { vectorStoreId, fileIds });
      
      try {
        // Get fresh headers for this request
        const batchHeaders = await getAuthHeaders();
        console.log('Auth headers for batch request:', Object.keys(batchHeaders).join(', '));
        
        // Make the batch request with explicit error handling
        const addFilesResponse = await fetch(batchUrl, {
          method: "POST",
          headers: batchHeaders,
          body: JSON.stringify({
            vectorStoreId,
            fileIds
          }),
          credentials: 'include'
        });
        
        // Log the status of the response for debugging
        console.log(`Batch add response status: ${addFilesResponse.status}`);
        
        if (!addFilesResponse.ok) {
          // Try to extract the error message from the response
          let errorText = '';
          try {
            const errorJson = await addFilesResponse.json();
            errorText = JSON.stringify(errorJson);
          } catch {
            errorText = await addFilesResponse.text();
          }
          
          console.error(`Batch add failed with status ${addFilesResponse.status}: ${errorText}`);
          
          // If batch add fails, try adding files one by one as a fallback
          console.log("Batch add failed, attempting to add files individually...");
          const addFileUrl = `${baseUrl}/api/vector_stores/add_file`;
          
          let individualSuccessCount = 0;
          
          for (const fileId of fileIds) {
            try {
              // Get fresh headers for each request
              const fileHeaders = await getAuthHeaders();
              
              const addSingleFileResponse = await fetch(addFileUrl, {
                method: "POST",
                headers: fileHeaders,
                body: JSON.stringify({
                  vectorStoreId,
                  fileId
                }),
                credentials: 'include'
              });
              
              if (addSingleFileResponse.ok) {
                console.log(`Successfully added file ${fileId} to vector store`);
                individualSuccessCount++;
              } else {
                console.error(`Failed to add file ${fileId} to vector store: ${addSingleFileResponse.status}`);
              }
            } catch (singleFileError) {
              console.error(`Error adding file ${fileId} to vector store:`, singleFileError);
            }
          }
          
          if (individualSuccessCount > 0) {
            console.log(`Successfully added ${individualSuccessCount}/${fileIds.length} files individually`);
          } else {
            // If all individual adds fail too, throw an error
            throw new Error(`Failed to add recommendation files to vector store batch: ${errorText}`);
          }
        } else {
          // Successfully added all files in a batch
          const batchResult = await addFilesResponse.json();
          console.log(`Successfully added ${fileIds.length} recommendation files to vector store with batch ID: ${batchResult.batch_id}`);
        }
      } catch (batchError) {
        console.error('Error in batch operation:', batchError);
        throw new Error(`Failed to add files to vector store: ${batchError instanceof Error ? batchError.message : String(batchError)}`);
      }
    } else {
      console.log("No recommendation files to add to vector store");
    }
    
    return {
      success: true,
      fileIds
    };
  } catch (error) {
    console.error("Error syncing recommendations to Vector Store:", error);
    return {
      success: false,
      fileIds: [],
      error: error instanceof Error ? error.message : "Unknown error during recommendation sync"
    };
  }
}

/**
 * Synchronize a single recommendation to the vector store
 * Used for updating a single recommendation (e.g., when toggling favorite status)
 */
export async function syncSingleRecommendationToVectorStore(
  userId: string,
  recommendation: RecommendationProgram,
  vectorStoreId: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  if (!vectorStoreId) {
    return { 
      success: false, 
      error: "No vector store ID provided. Cannot sync recommendation."
    };
  }

  try {
    if (!recommendation.id) {
      throw new Error('Recommendation ID is required');
    }
    
    console.log(`Syncing recommendation ${recommendation.id} to Vector Store with ID: ${vectorStoreId}`);
    
    // Get base URL for absolute API paths
    const baseUrl = getBaseUrl();
    console.log(`Using base URL: ${baseUrl}`);
    
    // Get auth headers for requests
    const headers = await getAuthHeaders();
    console.log('Auth headers included:', Object.keys(headers).join(', '));
    
    // First, clean up any existing files for this recommendation
    await cleanupRecommendationFiles(recommendation.id, true);
    
    // Create new file with updated data
    const recommendationJson = JSON.stringify({
      id: recommendation.id,
      name: recommendation.name,
      institution: recommendation.institution,
      degreeType: recommendation.degreeType,
      fieldOfStudy: recommendation.fieldOfStudy,
      description: recommendation.description,
      costPerYear: recommendation.costPerYear,
      duration: recommendation.duration,
      location: recommendation.location,
      startDate: recommendation.startDate,
      applicationDeadline: recommendation.applicationDeadline,
      requirements: recommendation.requirements || [],
      highlights: recommendation.highlights || [],
      pageLink: recommendation.pageLink,
      matchScore: recommendation.matchScore,
      matchRationale: recommendation.matchRationale,
      isFavorite: recommendation.isFavorite || false,
      scholarships: recommendation.scholarships || [],
      userId: userId,
      syncedAt: new Date().toISOString(),
      // Include a note about updating to ensure content is different
      updateNote: `Updated at ${new Date().toISOString()}`
    }, null, 2);
    
    // Convert JSON string directly to base64 (Node.js compatible)
    const base64Content = stringToBase64(recommendationJson);
    
    // Use a consistent naming pattern for recommendation files
    const fileName = `recommendation_${userId}_${recommendation.id}.json`;
    
    const fileObject = { name: fileName, content: base64Content };
    
    // Upload the file with absolute URL
    const uploadUrl = `${baseUrl}/api/vector_stores/upload_file`;
    console.log(`POST request to: ${uploadUrl}`);
    
    const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ fileObject }),
        credentials: 'include'
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
      throw new Error(`Failed to upload recommendation file for ${recommendation.id}: ${errorText}`);
    }
    
    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    
    if (!fileId) {
      console.error('Upload succeeded but no file ID was returned');
      throw new Error('No file ID returned from upload');
    }
    
    // Save the file ID to the recommendation_files table
    await saveRecommendationFileId(recommendation.id, fileId, fileName);
    
    // Add the file to the vector store
    const addFileUrl = `${baseUrl}/api/vector_stores/add_file`;
    console.log(`POST request to: ${addFileUrl}`);
    
    // Get fresh headers for this request
    const addFileHeaders = await getAuthHeaders();
    
    const addFileResponse = await fetch(addFileUrl, {
      method: "POST",
      headers: addFileHeaders,
      body: JSON.stringify({
        fileId,
        vectorStoreId
      }),
      credentials: 'include'
    });
    
    if (!addFileResponse.ok) {
      const errorText = await addFileResponse.text();
      console.error(`Add file failed with status ${addFileResponse.status}: ${errorText}`);
      
      // Check if this is an auth error and provide more specific information
      if (addFileResponse.status === 401) {
        console.error("Authentication error when adding file to vector store. User session may have expired.");
        throw new Error(`Authentication error when adding file to vector store: ${errorText}`);
      }
      
      throw new Error(`Failed to add recommendation file to vector store: ${errorText}`);
    }
    
    const addFileResult = await addFileResponse.json();
    console.log(`Successfully updated recommendation file for ${recommendation.name} in vector store with file ID: ${fileId}`);
    
    return {
      success: true,
      fileId
    };
  } catch (error) {
    console.error("Error syncing single recommendation to Vector Store:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during recommendation sync"
    };
  }
}

/**
 * Delete a recommendation from the vector store
 */
export async function deleteRecommendationFromVectorStore(
  userId: string,
  recommendationId: string,
  vectorStoreId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Deleting recommendation ${recommendationId} from Vector Store with ID: ${vectorStoreId}`);
    
    // Delete the files from both the database and OpenAI
    const success = await cleanupRecommendationFiles(recommendationId, true);
    
    if (!success) {
      throw new Error("Failed to clean up recommendation files");
    }
    
    console.log(`Successfully deleted recommendation files for ${recommendationId}`);
    
    return {
      success: true
    };
  } catch (error) {
    console.error("Error deleting recommendation from Vector Store:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during recommendation deletion"
    };
  }
} 