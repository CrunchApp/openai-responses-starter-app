'use server';

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Simplified OpenAI client initialization
const openai = new OpenAI();

export async function POST(request: NextRequest) {
  try {
    const { messageContent } = await request.json();

    if (!messageContent) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Simple prompt to generate a concise title
    const prompt = `Based on the following user message, generate a concise title (4-6 words max) for the conversation:

User Message: "${messageContent}"

Title:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano-2025-04-14", // Using a faster model for title generation
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20, // Limit the title length
      temperature: 0.5, // Moderate creativity
      n: 1,
      stop: ["\n"], // Stop generation at newline
    });

    const title = response.choices[0]?.message?.content?.trim() || "Untitled Conversation";

    // Remove potential quotes from the generated title
    const cleanedTitle = title.replace(/^"|"$/g, '');

    return NextResponse.json({ title: cleanedTitle });

  } catch (error) {
    console.error("Error generating conversation title:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate title",
      },
      { status: 500 }
    );
  }
} 