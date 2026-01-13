import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, threads, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// GET - Get a single session with all threads and messages
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)
      .all();

    if (session.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all threads for this session
    const threadList = await db
      .select()
      .from(threads)
      .where(eq(threads.sessionId, sessionId))
      .all();

    // Get all messages for each thread
    const threadsWithMessages = await Promise.all(
      threadList.map(async (thread) => {
        let messageList = await db
          .select()
          .from(messages)
          .where(eq(messages.threadId, thread.id))
          .all();
        
        // Sort messages by createdAt ascending
        messageList = messageList.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });

        return {
          ...thread,
          messages: messageList.map((m) => {
            let attachments = null;
            if (m.attachments) {
              try {
                attachments = JSON.parse(m.attachments);
              } catch (e) {
                console.error("Failed to parse attachments:", e);
                attachments = null;
              }
            }
            return {
              ...m,
              attachments,
            };
          }),
        };
      })
    );

    return NextResponse.json({
      ...session[0],
      threads: threadsWithMessages,
    });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch session", details: errorMessage },
      { status: 500 }
    );
  }
}
