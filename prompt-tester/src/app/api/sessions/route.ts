import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, threads, messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all sessions
export async function GET() {
  try {
    const sessionList = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .all();

    // For each session, get thread count
    const sessionsWithCounts = await Promise.all(
      sessionList.map(async (session) => {
        const threadCount = await db
          .select()
          .from(threads)
          .where(eq(threads.sessionId, session.id))
          .all();

        return {
          ...session,
          threadCount: threadCount.length,
        };
      })
    );

    return NextResponse.json(sessionsWithCounts);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST - Create a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, apiKeyId, systemPrompt, mode } = body;

    if (!mode || (mode !== "single_repeat" && mode !== "multi_model")) {
      return NextResponse.json(
        { error: "Valid mode is required (single_repeat or multi_model)" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(sessions)
      .values({
        name: name || null,
        apiKeyId: apiKeyId || null,
        systemPrompt: systemPrompt || null,
        mode,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a session (cascades to threads and messages)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(sessions).where(eq(sessions.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

// PATCH - Update session name
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await db
      .update(sessions)
      .set({ name: name || null })
      .where(eq(sessions.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to update session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}
