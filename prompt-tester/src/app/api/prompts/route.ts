import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { savedPrompts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all saved prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'system' | 'user' | null for all
    const category = searchParams.get("category");

    let query = db.select().from(savedPrompts);

    if (type === "system" || type === "user") {
      query = query.where(eq(savedPrompts.type, type)) as any;
    }

    const prompts = await query.orderBy(desc(savedPrompts.updatedAt)).all();

    // Filter by category if provided
    const filteredPrompts = category
      ? prompts.filter((p) => p.category === category)
      : prompts;

    return NextResponse.json(filteredPrompts);
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST - Create a new saved prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, content, category } = body;

    if (!name || !type || !content) {
      return NextResponse.json(
        { error: "name, type, and content are required" },
        { status: 400 }
      );
    }

    if (type !== "system" && type !== "user") {
      return NextResponse.json(
        { error: "type must be 'system' or 'user'" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const result = await db
      .insert(savedPrompts)
      .values({
        name,
        type,
        content,
        category: category || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to create prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing prompt
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, content, category } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (content) updateData.content = content;
    if (category !== undefined) updateData.category = category;

    const result = await db
      .update(savedPrompts)
      .set(updateData)
      .where(eq(savedPrompts.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Failed to update prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a saved prompt
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(savedPrompts).where(eq(savedPrompts.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
