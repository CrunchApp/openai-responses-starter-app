import { functionsMap } from "../../config/functions";
import useConversationStore from "@/stores/useConversationStore";

type ToolName = keyof typeof functionsMap;

export const handleTool = async (toolName: ToolName, parameters: any) => {
  console.log("Handle tool", toolName, parameters);
  // Enforce sequential flow: require web_search and file_search before creating pathways or recommendations
  const { conversationItems, chatMessages } = useConversationStore.getState();
  // Find index of last user message
  const lastUserIndex = conversationItems.map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.type === 'message' && item.role === 'user')
    .map(({ idx }) => idx)
    .pop();
  // Items after last user message
  const recentItems = lastUserIndex !== undefined
    ? conversationItems.slice(lastUserIndex + 1)
    : conversationItems;

  if (toolName === 'create_recommendation') {
    const hasWeb = recentItems.some(i => i.tool_type === 'web_search_call' || i.type === 'web_search_call');
    const hasFile = recentItems.some(i => i.tool_type === 'file_search_call' || i.type === 'file_search_call');
    if (!hasWeb) {
      return { success: false, error: "Before creating a recommendation, please use the web_search tool to gather accurate external program information (including scholarships)." };
    }
    if (!hasFile) {
      return { success: false, error: "Before creating a recommendation, please use the file_search tool to verify the user's profile context." };
    }
    // Require checking for existing recommendations to avoid duplicates
    const hasCheckedExisting = chatMessages.some(
      (m) => m.type === 'tool_call' &&
             m.tool_type === 'function_call' &&
             m.name === 'get_recommendation_by_program'
    );
    if (!hasCheckedExisting) {
      return {
        success: false,
        error: "Before creating a recommendation, please use the get_recommendation_by_program function to check for existing recommendations and avoid duplicates.",
      };
    }
  }
  if (toolName === 'create_pathway') {
    const hasWeb = recentItems.some(i => i.tool_type === 'web_search_call' || i.type === 'web_search_call');
    const hasFile = recentItems.some(i => i.tool_type === 'file_search_call' || i.type === 'file_search_call');
    if (!hasWeb) {
      return { success: false, error: "Before creating a pathway, please use the web_search tool to gather detailed external information about the pathway criteria." };
    }
    if (!hasFile) {
      return { success: false, error: "Before creating a pathway, please use the file_search tool to verify the user's profile context." };
    }
    // Ensure the assistant has fetched existing pathways to avoid duplicates
    const hasCheckedPathways = chatMessages.some(
      (m) => m.type === 'tool_call' &&
             m.tool_type === 'function_call' &&
             m.name === 'list_user_pathways'
    );
    if (!hasCheckedPathways) {
      return {
        success: false,
        error: "Before creating a pathway, please use the list_user_pathways function to fetch existing pathways and avoid duplicates."
      };
    }
  }

  // Normalize parameters for get_recommendation_by_program: ensure both present and handle identical values
  if (toolName === 'get_recommendation_by_program') {
    // Ensure parameters object has both keys
    const params = { name: '', institution: '', ...parameters };
    // If assistant supplied identical values for both, assume they intended only institution
    if (params.name && params.institution && params.name === params.institution) {
      params.name = '';
    }
    parameters = params;
  }

  if (functionsMap[toolName]) {
    return await functionsMap[toolName](parameters);
  } else {
    throw new Error(`Unknown tool: ${toolName}`);
  }
};
