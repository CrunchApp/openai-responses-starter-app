import { toolsList } from "../../config/tools-list";
import useToolsStore from "@/stores/useToolsStore";
import { WebSearchConfig } from "@/stores/useToolsStore";

interface WebSearchTool extends WebSearchConfig {
  type: "web_search";
}
export const getTools = () => {
  const { vectorStore, webSearchConfig } = useToolsStore.getState();

  const tools = [];

  // Always include web search tool
  const webSearchTool: WebSearchTool = { type: "web_search" };
  if (
    webSearchConfig.user_location &&
    (webSearchConfig.user_location.country !== "" ||
      webSearchConfig.user_location.region !== "" ||
      webSearchConfig.user_location.city !== "")
  ) {
    webSearchTool.user_location = webSearchConfig.user_location;
  }
  tools.push(webSearchTool);

  // Always include file search tool if a vector store is available
  if (vectorStore?.id) {
    const fileSearchTool = {
      type: "file_search",
      vector_store_ids: [vectorStore.id],
    };
    tools.push(fileSearchTool);
  }

  // Always include all function tools
  tools.push(
    ...toolsList.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: { ...tool.parameters },
        required: Object.keys(tool.parameters),
        additionalProperties: false,
      },
      strict: true,
    }))
  );

  console.log("tools", tools);

  return tools;
};
