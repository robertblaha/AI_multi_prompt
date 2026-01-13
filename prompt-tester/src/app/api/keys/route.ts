import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt, maskApiKey, isEncrypted } from "@/lib/encryption";

export async function GET() {
  try {
    const keys = await db.select().from(apiKeys).all();
    // Mask the actual API key for security (decrypt first if encrypted)
    const maskedKeys = keys.map((k) => {
      const decryptedKey = isEncrypted(k.key) ? decrypt(k.key) : k.key;
      return {
        ...k,
        key: maskApiKey(decryptedKey),
        isDefault: Boolean(k.isDefault),
      };
    });
    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, key, isDefault } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: "Name and key are required" },
        { status: 400 }
      );
    }

    // If this key is set as default, unset all other defaults
    if (isDefault) {
      await db.update(apiKeys).set({ isDefault: false });
    }

    // Encrypt the API key before storing
    const encryptedKey = encrypt(key);

    const result = await db
      .insert(apiKeys)
      .values({
        name,
        key: encryptedKey,
        isDefault: isDefault || false,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Return with masked key
    return NextResponse.json({
      ...result[0],
      key: maskApiKey(key),
      isDefault: Boolean(result[0].isDefault),
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isDefault, name, key } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // If setting as default, unset all other defaults first
    if (isDefault) {
      await db.update(apiKeys).set({ isDefault: false });
    }

    const updateData: { isDefault?: boolean; name?: string; key?: string } = {};
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (name !== undefined) updateData.name = name;
    if (key !== undefined) updateData.key = encrypt(key); // Encrypt new key if provided

    const result = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    // Return with masked key
    const decryptedKey = isEncrypted(result[0].key) ? decrypt(result[0].key) : result[0].key;
    return NextResponse.json({
      ...result[0],
      key: maskApiKey(decryptedKey),
      isDefault: Boolean(result[0].isDefault),
    });
  } catch (error) {
    console.error("Failed to update API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}
