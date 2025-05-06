import useToolsStore from "@/stores/useToolsStore";

// Helper to determine base URL for API calls
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || '';
}

export interface VectorStoreAddParams {
  userId: string;
  applicationId: string;
  role: 'user' | 'assistant';
  content: string;
}

export const vectorStoreClient = {
  async add({ userId, applicationId, role, content }: VectorStoreAddParams): Promise<void> {
    try {
      const { vectorStore } = useToolsStore.getState();
      const vectorStoreId = vectorStore?.id;
      if (!vectorStoreId) {
        console.error("Vector store not configured for user");
        return;
      }

      // Construct JSON record for the conversation turn
      const record = {
        userId,
        applicationId,
        role,
        content,
        timestamp: new Date().toISOString(),
      };

      const recordStr = JSON.stringify(record, null, 2);
      // Convert to base64
      let base64: string;
      if (typeof window === 'undefined') {
        base64 = Buffer.from(recordStr).toString('base64');
      } else {
        base64 = btoa(unescape(encodeURIComponent(recordStr)));
      }

      // Name the file for traceability
      const fileName = `conversation_${userId}_${applicationId}_${Date.now()}.json`;

      // Upload the record as a file to OpenAI
      const uploadResponse = await fetch(`${getBaseUrl()}/api/vector_stores/upload_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileObject: { name: fileName, content: base64 } }),
      });
      if (!uploadResponse.ok) {
        console.error('Error uploading conversation file:', await uploadResponse.text());
        return;
      }
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      if (!fileId) {
        console.error('No file ID returned from upload_file');
        return;
      }

      // Add the uploaded file to the vector store
      const addResponse = await fetch(`${getBaseUrl()}/api/vector_stores/add_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vectorStoreId, fileId }),
      });
      if (!addResponse.ok) {
        console.error('Error adding file to vector store:', await addResponse.text());
        return;
      }
    } catch (error) {
      console.error('Error in vectorStoreClient.add:', error);
    }
  },

  // New helper: upsert entire conversation JSON file into vector store
  async upsertConversationFile(conversationId: string): Promise<void> {
    try {
      const { vectorStore } = useToolsStore.getState();
      const vectorStoreId = vectorStore?.id;
      if (!vectorStoreId) {
        console.error("Vector store not configured for user");
        return;
      }

      // Fetch all chat messages for the conversation from our API
      const resp = await fetch(`${getBaseUrl()}/api/conversations/${conversationId}/messages`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!resp.ok) {
        console.error("Failed to fetch messages for conversation", conversationId);
        return;
      }
      const { messages } = await resp.json();

      // Build simple array of {role, content} objects
      const msgs = (messages || []).map((m: any) => ({
        role: m.role,
        content: m.message_content
      }));

      // Call our new upsert endpoint
      const upsertResp = await fetch(
        `${getBaseUrl()}/api/vector_stores/conversation_file`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ conversation_id: conversationId, messages: msgs })
        }
      );
      if (!upsertResp.ok) {
        console.error(
          "Failed to upsert conversation file",
          await upsertResp.text()
        );
      }
    } catch (error) {
      console.error("Error in vectorStoreClient.upsertConversationFile:", error);
    }
  }
}; 