import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { favoriteModels } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// GET - List all favorite models
export async function GET() {
  try {
    const models = await db
      .select()
      .from(favoriteModels)
      .orderBy(favoriteModels.sortOrder)
      .all();
    return NextResponse.json(
      models.map((m) => ({
        ...m,
        isActive: Boolean(m.isActive),
      }))
    );
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

// POST - Create a new favorite model
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, displayName, isActive = true } = body;

    if (!modelId || !displayName) {
      return NextResponse.json(
        { error: "modelId and displayName are required" },
        { status: 400 }
      );
    }

    // Get the highest sort order
    const maxOrder = await db
      .select({ max: sql<number>`MAX(${favoriteModels.sortOrder})` })
      .from(favoriteModels)
      .all();
    const nextOrder = (maxOrder[0]?.max || 0) + 1;

    const result = await db
      .insert(favoriteModels)
      .values({
        modelId,
        displayName,
        isActive,
        sortOrder: nextOrder,
      })
      .returning();

    return NextResponse.json({
      ...result[0],
      isActive: Boolean(result[0].isActive),
    });
  } catch (error) {
    console.error("Failed to create model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing model
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, modelId, displayName, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: { modelId?: string; displayName?: string; isActive?: boolean } = {};
    if (modelId !== undefined) updateData.modelId = modelId;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .update(favoriteModels)
      .set(updateData)
      .where(eq(favoriteModels.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result[0],
      isActive: Boolean(result[0].isActive),
    });
  } catch (error) {
    console.error("Failed to update model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

// PATCH - Update sort order or toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, sortOrder, isActive, reorder } = body;

    // Handle batch reordering
    if (reorder && Array.isArray(reorder)) {
      // reorder is an array of { id, sortOrder }
      for (const item of reorder) {
        await db
          .update(favoriteModels)
          .set({ sortOrder: item.sortOrder })
          .where(eq(favoriteModels.id, item.id));
      }
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: { sortOrder?: number; isActive?: boolean } = {};
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .update(favoriteModels)
      .set(updateData)
      .where(eq(favoriteModels.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result[0],
      isActive: Boolean(result[0].isActive),
    });
  } catch (error) {
    console.error("Failed to patch model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a favorite model
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(favoriteModels).where(eq(favoriteModels.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
