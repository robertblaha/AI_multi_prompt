import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt, isEncrypted } from "@/lib/encryption";

/**
 * Get the raw (decrypted) API key by ID
 * This is used internally for API calls
 * Returns only the decrypted key, not the full record
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, parseInt(id)))
      .all();

    if (result.length === 0) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const storedKey = result[0].key;
    const decryptedKey = isEncrypted(storedKey) ? decrypt(storedKey) : storedKey;

    return NextResponse.json({ key: decryptedKey });
  } catch (error) {
    console.error("Failed to get raw API key:", error);
    return NextResponse.json(
      { error: "Failed to get API key" },
      { status: 500 }
    );
  }
}
