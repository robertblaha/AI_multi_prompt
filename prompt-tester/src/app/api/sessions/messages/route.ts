import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Create a new message in a thread
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      threadId,
      role,
      content,
      attachments,
      tokensInput,
      tokensOutput,
      cost,
      latencyMs,
    } = body;

    if (!threadId || !role || !content) {
      return NextResponse.json(
        { error: "threadId, role, and content are required" },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "role must be 'user' or 'assistant'" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(messages)
      .values({
        threadId: parseInt(threadId),
        role,
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
        tokensInput: tokensInput || null,
        tokensOutput: tokensOutput || null,
        cost: cost || null,
        latencyMs: latencyMs || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to create message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
