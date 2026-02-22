import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "ANALYST" | "VIEWER";
export type SessionUser = { email: string; role: Role };

const COOKIE_NAME = "session";

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function sessionCookieName() {
  return COOKIE_NAME;
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = payload.email;
    const role = payload.role;
    if (typeof email !== "string") return null;
    if (role !== "ADMIN" && role !== "ANALYST" && role !== "VIEWER") return null;
    return { email, role };
  } catch {
    return null;
  }
}

export function canMutate(role: Role) {
  return role === "ADMIN" || role === "ANALYST";
}

/**
 * Extract session cookie value from Request headers
 */
function getSessionCookieValue(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name === COOKIE_NAME && valueParts.length > 0) {
      return valueParts.join("="); // Rejoin in case value contains =
    }
  }
  return null;
}

/**
 * Get session from Request (reads and verifies JWT cookie)
 * Returns session user or null if missing/invalid
 */
export async function getSessionFromRequest(req: Request): Promise<SessionUser | null> {
  const token = getSessionCookieValue(req);
  if (!token) return null;
  return verifySession(token);
}

/**
 * Require valid session from Request
 * Returns Response with 401 if missing/invalid, otherwise returns { session }
 */
export async function requireSession(
  req: Request
): Promise<Response | { session: SessionUser }> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return { session };
}

// Auth config helpers - never sanitize values used for authentication

/**
 * Get raw environment variable value (no sanitization)
 */
export function getRawEnv(key: string): string {
  return process.env[key] ?? "";
}

/**
 * Get admin password hash, supporting base64-encoded hash or legacy format
 * This is the value that should be used for bcrypt comparison
 * Priority:
 * 1. ADMIN_PASSWORD_HASH_B64 (base64-encoded) - decode and validate
 * 2. ADMIN_PASSWORD_HASH (legacy) - strip quotes and unescape $$ -> $
 */
export function getAdminPasswordHash(): string {
  // Try base64-encoded hash first
  const b64 = getRawEnv("ADMIN_PASSWORD_HASH_B64").trim();
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8").trim();
      // Validate decoded hash starts with $2a$ or $2b$
      if (decoded.startsWith("$2a$") || decoded.startsWith("$2b$")) {
        return decoded;
      }
      // Invalid format, fall through to legacy
    } catch {
      // Decoding failed, fall through to legacy
    }
  }
  
  // Fallback to legacy ADMIN_PASSWORD_HASH
  let raw = getRawEnv("ADMIN_PASSWORD_HASH").trim();
  
  // Strip surrounding quotes if they match (single or double)
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }
  
  // Unescape $$ to $ (for .env.local where dollars are escaped)
  raw = raw.replaceAll("$$", "$");
  
  return raw.trim();
}

/**
 * Validate auth configuration
 * Returns { ok: true } if valid, or { ok: false, reason: string } if invalid
 */
export function validateAuthConfig(): { ok: true } | { ok: false; reason: string } {
  const authSecret = getRawEnv("AUTH_SECRET").trim();
  const adminEmail = getRawEnv("ADMIN_EMAIL").trim();
  const adminHash = getAdminPasswordHash();

  if (!authSecret || authSecret.length < 32) {
    return { ok: false, reason: "AUTH_SECRET must exist and be at least 32 characters" };
  }

  if (!adminEmail) {
    return { ok: false, reason: "ADMIN_EMAIL must exist" };
  }

  if (!adminHash) {
    return { ok: false, reason: "ADMIN_PASSWORD_HASH or ADMIN_PASSWORD_HASH_B64 must exist" };
  }

  // Validate bcrypt hash format: should start with $2a$ or $2b$ and be at least 55 chars
  if (!adminHash.startsWith("$2a$") && !adminHash.startsWith("$2b$")) {
    return { ok: false, reason: "Password hash must start with $2a$ or $2b$ after decoding/parsing" };
  }

  if (adminHash.length < 55) {
    return { ok: false, reason: "Password hash must be at least 55 characters after decoding/parsing" };
  }

  return { ok: true };
}