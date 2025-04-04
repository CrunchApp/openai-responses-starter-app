import { DEVELOPER_PROMPT } from "@/config/constants";
import { parse } from "partial-json";
import { handleTool } from "@/lib/tools/tools-handling";
import useConversationStore from "@/stores/useConversationStore";
import { getTools } from "./tools/tools";
import { Annotation } from "@/components/annotations";
import { functionsMap } from "@/config/functions";

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
  onMessage: (data: any) => void
) => {
  try {
    // Get response from the API (defined in app/api/turn_response/route.ts)
    const response = await fetch("/api/turn_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        tools: tools,
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
    } = useConversationStore.getState();

    // Create local copies to avoid state mutation issues
    const localChatMessages = [...chatMessages];
    const localConversationItems = [...conversationItems];

    const tools = getTools();
    const allConversationItems = [
      // Adding developer prompt as first item in the conversation
      {
        role: "developer",
        content: DEVELOPER_PROMPT,
      },
      ...localConversationItems,
    ];

    let assistantMessageContent = "";
    let functionArguments = "";
    
    // Track which messages have been added to avoid duplication
    const addedMessageIds = new Set();

    await handleTurn(allConversationItems, tools, async ({ event, data }) => {
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
          assistantMessageContent += partial;

          // Check if we already have a message with this ID
          let assistantMessage = localChatMessages.find(
            (m) => m.type === "message" && m.role === "assistant" && m.id === item_id
          ) as MessageItem | undefined;

          if (!assistantMessage) {
            // No message with this ID exists yet, create a new one
            console.log("Creating new assistant message with ID:", item_id);
            assistantMessage = {
              type: "message",
              role: "assistant",
              id: item_id,
              content: [
                {
                  type: "output_text",
                  text: assistantMessageContent,
                  annotations: annotation ? [annotation] : undefined,
                },
              ],
            };
            
            localChatMessages.push(assistantMessage);
            addedMessageIds.add(item_id); // Track that we've added this message ID
          } else {
            // Update the existing message
            console.log("Updating existing assistant message with ID:", item_id);
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
              // IMPORTANT: Skip adding assistant messages here completely
              // They are already handled by response.output_text.delta
              if (item.role === "assistant") {
                // Only track in conversationItems for API context, not in UI
                const itemExists = localConversationItems.some(
                  (ci) => ci.role === "assistant" && JSON.stringify(ci.content) === JSON.stringify(item.content)
                );
                
                if (!itemExists) {
                  console.log("Adding assistant message to conversationItems only:", item.id);
                  localConversationItems.push({
                    role: "assistant",
                    content: item.content
                  });
                  setConversationItems([...localConversationItems]);
                }
                break;
              }
              
              // Non-assistant messages can be handled normally
              console.log("Adding non-assistant message:", item.role, item.id);
              const text = item.content?.text || "";
              localChatMessages.push({
                type: "message",
                role: item.role,
                id: item.id,
                content: [
                  {
                    type: "input_text", // For user messages we use input_text
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
            setConversationItems([...localConversationItems, item]);
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
    });
  } catch (error) {
    console.error("Error in processMessages:", error);
  } finally {
    // Always reset the processing flag when done
    isProcessingMessages = false;
  }
};
