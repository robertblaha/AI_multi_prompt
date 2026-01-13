import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get or generate encryption key
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (envKey && envKey.length >= 32) {
    // Use provided key (must be at least 32 characters)
    return Buffer.from(envKey.slice(0, 32), "utf-8");
  }
  
  // Fallback to a derived key from a default phrase
  // In production, ENCRYPTION_KEY should always be set in .env.local
  const defaultPhrase = "prompt-tester-default-key-change-me";
  return scryptSync(defaultPhrase, "salt", KEY_LENGTH);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns: salt:iv:authTag:encryptedData (all base64 encoded)
 */
export function encrypt(text: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = scryptSync(getEncryptionKey(), salt, KEY_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag();
  
  // Combine: salt:iv:authTag:encryptedData
  return [
    salt.toString("base64"),
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted,
  ].join(":");
}

/**
 * Decrypts a string encrypted with encrypt()
 * Input: salt:iv:authTag:encryptedData (all base64 encoded)
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    
    if (parts.length !== 4) {
      // Not encrypted or wrong format - return as-is
      // This handles migration from unencrypted to encrypted keys
      return encryptedText;
    }
    
    const [saltB64, ivB64, authTagB64, encryptedData] = parts;
    
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const key = scryptSync(getEncryptionKey(), salt, KEY_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    // If decryption fails, the data might be unencrypted (migration case)
    console.error("Decryption failed, returning original:", error);
    return encryptedText;
  }
}

/**
 * Check if a string looks like it's encrypted
 */
export function isEncrypted(text: string): boolean {
  const parts = text.split(":");
  if (parts.length !== 4) return false;
  
  // Check if all parts look like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every((part) => base64Regex.test(part));
}

/**
 * Masks an API key for display (shows first 8 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return "****" + key.slice(-4);
  }
  return key.slice(0, 8) + "..." + key.slice(-4);
}
