import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST - Create a new thread in a session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, modelId, iterationNumber } = body;

    if (!sessionId || !modelId) {
      return NextResponse.json(
        { error: "sessionId and modelId are required" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(threads)
      .values({
        sessionId: parseInt(sessionId),
        modelId,
        iterationNumber: iterationNumber || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to create thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}
