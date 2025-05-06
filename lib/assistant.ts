import { DEVELOPER_PROMPT } from "@/config/constants";
import { parse } from "partial-json";
import { handleTool } from "@/lib/tools/tools-handling";
import useConversationStore from "@/stores/useConversationStore";
import { getTools } from "./tools/tools";
import { Annotation } from "@/components/annotations";
import { functionsMap } from "@/config/functions";

// Sentinel prefixes for chaining previous response context
const CHAIN_PREFIX = "__CHAIN__:";
const USE_PREV_PREFIX = "__USE_PREV__:";

export interface ContentItem {
  type: "input_text" | "output_text" | "refusal" | "output_audio";
  annotations?: Annotation[];
  text?: string;
}

// Message items for storing conversation history matching API shape
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  id?: string;
  content: ContentItem[];
}

// Custom items to display in chat
export interface ToolCallItem {
  type: "tool_call";
  tool_type: "file_search_call" | "web_search_call" | "function_call";
  status: "in_progress" | "completed" | "failed" | "searching";
  id: string;
  name?: string | null;
  call_id?: string;
  arguments?: string;
  parsedArguments?: any;
  output?: string | null;
}

export type Item = MessageItem | ToolCallItem;

export const handleTurn = async (
  messages: any[],
  tools: any[],
  onMessage: (data: any) => void,
  previousResponseId?: string | null
) => {
  try {
    // Get response from the API (defined in app/api/turn_response/route.ts)
    const response = await fetch("/api/turn_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        tools: tools,
        previous_response_id: previousResponseId ?? undefined,
      }),
    });

    if (!response.ok) {
      console.error(`Error: ${response.status} - ${response.statusText}`);
      return;
    }

    // Reader for streaming data
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      buffer += chunkValue;

      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            done = true;
            break;
          }
          const data = JSON.parse(dataStr);
          onMessage(data);
        }
      }
    }

    // Handle any remaining data in buffer
    if (buffer && buffer.startsWith("data: ")) {
      const dataStr = buffer.slice(6);
      if (dataStr !== "[DONE]") {
        const data = JSON.parse(dataStr);
        onMessage(data);
      }
    }
  } catch (error) {
    console.error("Error handling turn:", error);
  }
};

// Add a processing flag at the module level to track if we're already processing messages
let isProcessingMessages = false;

export const processMessages = async () => {
  // If we're already processing messages, skip this call to avoid redundant processing
  if (isProcessingMessages) {
    console.log("Already processing messages, skipping redundant call.");
    return;
  }
  
  try {
    // Set the processing flag to prevent concurrent calls
    isProcessingMessages = true;
    
    const {
      chatMessages,
      conversationItems,
      setChatMessages,
      setConversationItems,
      previousResponseId,
      setPreviousResponseId,
    } = useConversationStore.getState();

    // Create local copies to avoid state mutation issues
    const localChatMessages = [...chatMessages];
    const localConversationItems = [...conversationItems];

    const tools = getTools();

    // Filter out sentinel system messages and handle chaining logic
    let effectivePreviousResponseId: string | null = previousResponseId;
    const filteredConversationItems = localConversationItems.filter((item) => {
      if (item.role === "system" && typeof item.content === "string") {
        const contentStr = item.content as string;
        if (contentStr.startsWith(CHAIN_PREFIX)) {
          // Set initial previous response ID from chain sentinel
          effectivePreviousResponseId = contentStr.slice(CHAIN_PREFIX.length);
          return false; // Exclude from input
        }
        if (contentStr.startsWith(USE_PREV_PREFIX)) {
          // Instruction to use existing previousResponseId; exclude
          return false;
        }
      }
      return true;
    });

    // Persist discovered previousResponseId in store
    if (effectivePreviousResponseId && effectivePreviousResponseId !== previousResponseId) {
      setPreviousResponseId(effectivePreviousResponseId);
    }

    const allConversationItems = [
      { role: "developer", content: DEVELOPER_PROMPT },
      ...filteredConversationItems,
    ];

    let assistantMessageContent = "";
    let currentAssistantId: string | null = null;
    let functionArguments = "";
    
    // Track which messages have been added to avoid duplication
    const addedMessageIds = new Set();

    await handleTurn(allConversationItems, tools, async ({ event, data }) => {
      // On initial response event, capture the model response ID for chaining
      if (event === 'response' && data.id && typeof data.id === 'string') {
        setPreviousResponseId(data.id);
        console.log('Captured new previousResponseId:', data.id);
        return; // skip further processing for this event
      }
      switch (event) {
        case "response.output_text.delta":
        case "response.output_text.annotation.added": {
          const { delta, item_id, annotation } = data;

          // For debugging
          console.log("Streaming delta:", { event, delta: delta?.slice(0, 20), item_id });

          let partial = "";
          if (typeof delta === "string") {
            partial = delta;
          }
          // Determine which ID to use for display (chain into previous message if applicable)
          const displayId = item_id;
          // If we started streaming a new assistant message, reset buffer BEFORE appending partial
          if (currentAssistantId !== displayId) {
            assistantMessageContent = "";
            currentAssistantId = displayId;
          }
          assistantMessageContent += partial;

          // Check if we already have a message with this display ID
          let assistantMessage = localChatMessages.find(
            (m) => m.type === "message" && m.role === "assistant" && m.id === displayId
          ) as MessageItem | undefined;

          if (!assistantMessage) {
            // Create a new assistant message (use displayId for chaining)
            console.log("Creating new assistant message with display ID:", displayId);
            assistantMessage = {
              type: "message",
              role: "assistant",
              id: displayId,
              content: [
                {
                  type: "output_text",
                  text: assistantMessageContent,
                  annotations: annotation ? [annotation] : undefined,
                },
              ],
            };
            localChatMessages.push(assistantMessage);
            addedMessageIds.add(displayId); // Track that we've added this message ID
          } else {
            // Update the existing message content
            console.log("Updating existing assistant message with display ID:", displayId);
            const contentItem = assistantMessage.content[0];
            if (contentItem && contentItem.type === "output_text") {
              contentItem.text = assistantMessageContent;
              if (annotation) {
                contentItem.annotations = [
                  ...(contentItem.annotations ?? []),
                  annotation,
                ];
              }
            }
          }

          setChatMessages([...localChatMessages]);
          break;
        }

        case "response.output_item.added": {
          const { item } = data || {};
          // New item coming in
          if (!item || !item.type) {
            break;
          }
          
          // Handle differently depending on the item type
          switch (item.type) {
            case "message": {
              // Skip user messages (they are already present locally to avoid duplication)
              if (item.role === "user") {
                break; // Prevent duplicate user messages
              }

              // Assistant messages: add only to conversationItems (stream handled elsewhere)
              if (item.role === "assistant") {
                const itemExists = localConversationItems.some(
                  (ci) => ci.role === "assistant" && JSON.stringify(ci.content) === JSON.stringify(item.content)
                );
                if (!itemExists) {
                  console.log("Adding assistant message to conversationItems only:", item.id);
                  localConversationItems.push({
                    role: "assistant",
                    content: item.content,
                  });
                  setConversationItems([...localConversationItems]);
                }
                break;
              }

              // Handle any other message roles if needed (e.g., system)
              console.log("Adding message:", item.role, item.id);
              const text = item.content?.text || "";
              localChatMessages.push({
                type: "message",
                role: item.role as any,
                id: item.id,
                content: [
                  {
                    type: "input_text",
                    text,
                  },
                ],
              });
              setChatMessages([...localChatMessages]);
              break;
            }
            
            case "function_call": {
              functionArguments += item.arguments || "";
              localChatMessages.push({
                type: "tool_call",
                tool_type: "function_call",
                status: "in_progress",
                id: item.id,
                name: item.name, // function name,e.g. "get_weather"
                arguments: item.arguments || "",
                parsedArguments: {},
                output: null,
              });
              setChatMessages([...localChatMessages]);
              break;
            }
            
            case "web_search_call": {
              localChatMessages.push({
                type: "tool_call",
                tool_type: "web_search_call",
                status: item.status || "in_progress",
                id: item.id,
              });
              setChatMessages([...localChatMessages]);
              break;
            }
            
            case "file_search_call": {
              localChatMessages.push({
                type: "tool_call",
                tool_type: "file_search_call",
                status: item.status || "in_progress",
                id: item.id,
              });
              setChatMessages([...localChatMessages]);
              break;
            }
          }
          break;
        }

        case "response.output_item.done": {
          // After output item is done, add tool call ID or save message
          const { item } = data || {};

          // Ensure item exists before proceeding
          if (!item || !item.id) {
            console.warn("Received response.output_item.done without a valid item or item.id");
            break; // Exit if item is invalid
          }

          // Add final message state to conversation context
          if (!localConversationItems.some(
            ci => ci.type === item.type && ci.id === item.id
          )) {
            localConversationItems.push(item);
            setConversationItems([...localConversationItems]);
          }

          // For tool calls, update status
          if (item.type !== "message") {
            const toolCallMessage = localChatMessages.find((m) => m.id === item.id);
            
            if (toolCallMessage && toolCallMessage.type === "tool_call") {
              toolCallMessage.call_id = item.call_id;
              toolCallMessage.status = "completed";
              setChatMessages([...localChatMessages]);
            }
          }
          
          // For assistant messages, save the final state to the database
          else if (item.type === "message" && item.role === "assistant") {
            console.log("Message done:", item.id);
            
            // Find the message in the current chat state (which includes streamed text)
            const finalMessage = localChatMessages.find(
              (m): m is MessageItem => m.type === "message" && m.id === item.id
            );
            
            if (finalMessage) {
              console.log("Saving completed message to database:", finalMessage.id);
              // Save to database without adding another copy to the UI
              await useConversationStore.getState().addChatMessage(finalMessage, true);
            }
          }
          
          break;
        }

        case "response.function_call_arguments.delta": {
          // Streaming arguments delta to show in the chat
          functionArguments += data.delta || "";
          let parsedFunctionArguments = {};
          if (functionArguments.length > 0) {
            try {
              parsedFunctionArguments = parse(functionArguments);
            } catch {
              // partial JSON can fail parse; ignore
            }
          }

          const toolCallMessage = localChatMessages.find((m) => m.id === data.item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = functionArguments;
            toolCallMessage.parsedArguments = parsedFunctionArguments;
            setChatMessages([...localChatMessages]);
          }
          break;
        }

        case "response.function_call_arguments.done": {
          // This has the full final arguments string
          const { item_id, arguments: finalArgs } = data;

          functionArguments = finalArgs;

          // Mark the tool_call as "completed" and parse the final JSON
          const toolCallMessage = localChatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = finalArgs;
            toolCallMessage.parsedArguments = parse(finalArgs);
            toolCallMessage.status = "completed";
            setChatMessages([...localChatMessages]);

            // Handle tool call (execute function)
            const toolResult = await handleTool(
              toolCallMessage.name as keyof typeof functionsMap,
              toolCallMessage.parsedArguments
            );

            // Record tool output
            toolCallMessage.output = JSON.stringify(toolResult);
            setChatMessages([...localChatMessages]);
            localConversationItems.push({
              type: "function_call_output",
              call_id: toolCallMessage.call_id,
              
              status: "completed",
              output: JSON.stringify(toolResult),
            });
            setConversationItems([...localConversationItems]);

            // Create another turn after tool output has been added, but reset the processing flag first
            isProcessingMessages = false;
            
            // Use setTimeout to prevent synchronous recursive calls
            setTimeout(() => processMessages(), 0);
            return; // Exit to prevent finishing this function call
          }
          break;
        }

        case "response.web_search_call.completed": {
          const { item_id, output } = data;
          const toolCallMessage = localChatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.output = output;
            toolCallMessage.status = "completed";
            setChatMessages([...localChatMessages]);
          }
          break;
        }

        case "response.file_search_call.completed": {
          const { item_id, output } = data;
          const toolCallMessage = localChatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.output = output;
            toolCallMessage.status = "completed";
            setChatMessages([...localChatMessages]);
          }
          break;
        }

        // Handle other events as needed
      }
    }, effectivePreviousResponseId);

    // After turn completes, if effectivePreviousResponseId exists, drop older assistant messages from conversationItems to reduce payload
    if (effectivePreviousResponseId) {
      const updatedConversationItems = filteredConversationItems.filter(
        (item) => !(item.role === "assistant")
      );
      setConversationItems(updatedConversationItems);
    }
  } catch (error) {
    console.error("Error in processMessages:", error);
  } finally {
    // Always reset the processing flag when done
    isProcessingMessages = false;
  }
};
