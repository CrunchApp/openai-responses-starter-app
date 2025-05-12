import { MODEL, FALLBACK_MODEL } from "@/config/constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// Define types for the tools
interface FileTool {
  type: 'file_search';
  vector_store_ids: string[];
}

interface WebTool {
  type: 'web_search';
  user_location?: {
    type: string;
    country?: string;
    city?: string;
    region?: string;
  };
}

interface FunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
    additionalProperties: boolean;
  };
  strict: boolean;
}

type Tool = FileTool | WebTool | FunctionTool;

export async function POST(request: Request) {
  try {
    const { messages, tools, previous_response_id } = await request.json();
    console.log("Received messages:", messages);
    // Sanitize previous_response_id: only chain if valid resp_ id
    let safePrevId: string | undefined;
    if (typeof previous_response_id === 'string') {
      if (previous_response_id.startsWith('resp_')) {
        safePrevId = previous_response_id;
      } else {
        console.warn(`Dropping invalid previous_response_id: '${previous_response_id}'`);
      }
    }

    // Validate tools array to prevent errors with null vector_store_ids
    const validatedTools = tools.filter((tool: Tool) => {
      if (tool.type === 'file_search') {
        // Ensure vector_store_ids is an array with at least one non-empty string
        return Array.isArray(tool.vector_store_ids) && 
               tool.vector_store_ids.length > 0 && 
               typeof tool.vector_store_ids[0] === 'string' &&
               tool.vector_store_ids[0].trim() !== '';
      }
      return true; // Keep all other tool types
    });

    const openai = new OpenAI();

    let events;
    try {
      events = await openai.responses.create({
        model: MODEL,
        input: messages,
        tools: validatedTools,
        stream: true,
        parallel_tool_calls: false,
        ...(safePrevId ? { previous_response_id: safePrevId } : {}),
        store: true,
      });
    } catch (error: any) {
      if (error.status === 429) {
        console.warn("Primary model rate limited, falling back to mini model:", FALLBACK_MODEL);
        events = await openai.responses.create({
          model: FALLBACK_MODEL,
          input: messages,
          tools: validatedTools,
          stream: true,
          parallel_tool_calls: false,
          ...(safePrevId ? { previous_response_id: safePrevId } : {}),
          store: true,
        });
      } else {
        throw error;
      }
    }

    // Create a ReadableStream that emits SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of events) {
            // Sending all events to the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            controller.enqueue(`data: ${data}\n\n`);
          }
          // End of stream
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          controller.error(error);
        }
      },
    });

    // Return the ReadableStream as SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
