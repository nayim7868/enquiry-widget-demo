import { NextResponse } from "next/server";
import { getRawEnv, getAdminPasswordHash } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  // Get raw env values (no sanitization needed for boolean checks)
  const adminEmail = getRawEnv("ADMIN_EMAIL").trim();
  const authSecret = getRawEnv("AUTH_SECRET").trim();
  
  // Check for base64-encoded hash
  const rawHashB64 = getRawEnv("ADMIN_PASSWORD_HASH_B64").trim();
  const hasAdminHashB64 = !!rawHashB64;
  const rawHashB64Len = rawHashB64.length;
  
  // Get raw legacy hash length (before parsing - trimmed only)
  const rawHash = getRawEnv("ADMIN_PASSWORD_HASH").trim();
  const rawHashLen = rawHash.length;
  
  // Get parsed hash for metadata (decoded from base64 or parsed from legacy)
  const adminHash = getAdminPasswordHash();
  
  // Only return safe metadata - never return full hash or secret
  return NextResponse.json({
    ok: true,
    hasAdminEmail: !!adminEmail,
    hasAdminHash: !!adminHash,
    hasAuthSecret: !!authSecret,
    hasAdminHashB64, // Whether ADMIN_PASSWORD_HASH_B64 exists
    rawHashB64Len, // Length of raw base64 value (trimmed)
    rawHashLen, // Length of raw legacy env string (trimmed, before parsing)
    hashLen: adminHash.length, // Length after decoding/parsing via getAdminPasswordHash()
    hashPrefix: adminHash.slice(0, 4), // First 4 chars after decoding/parsing (e.g., "$2b$")
  });
}

