import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sessionCookieName,
  canMutate,
  validateAuthConfig,
  getAdminPasswordHash,
  signSession,
  verifySession,
} from "./auth";

describe("sessionCookieName", () => {
  it("returns expected cookie name", () => {
    const name = sessionCookieName();
    expect(name).toBe("session");
    expect(typeof name).toBe("string");
    expect(name.length).toBeGreaterThan(0);
  });
});

describe("canMutate", () => {
  it("returns true for ADMIN role", () => {
    expect(canMutate("ADMIN")).toBe(true);
  });

  it("returns true for ANALYST role", () => {
    expect(canMutate("ANALYST")).toBe(true);
  });

  it("returns false for VIEWER role", () => {
    expect(canMutate("VIEWER")).toBe(false);
  });
});

describe("validateAuthConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = originalEnv;
  });

  it("returns error when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH_B64;

    const result = validateAuthConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("AUTH_SECRET");
    }
  });

  it("returns error when AUTH_SECRET is too short", () => {
    process.env.AUTH_SECRET = "short";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH_B64 = Buffer.from("$2b$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890").toString("base64");

    const result = validateAuthConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("AUTH_SECRET");
      expect(result.reason).toContain("32");
    }
  });

  it("returns error when ADMIN_EMAIL is missing", () => {
    process.env.AUTH_SECRET = "a".repeat(32);
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH_B64;

    const result = validateAuthConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("ADMIN_EMAIL");
    }
  });

  it("returns error when password hash is missing", () => {
    process.env.AUTH_SECRET = "a".repeat(32);
    process.env.ADMIN_EMAIL = "admin@example.com";
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH_B64;

    const result = validateAuthConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("ADMIN_PASSWORD_HASH");
    }
  });

  it("returns ok when all required env vars are set with base64 hash", () => {
    const validHash = "$2b$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.AUTH_SECRET = "a".repeat(32);
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH_B64 = Buffer.from(validHash).toString("base64");

    const result = validateAuthConfig();
    expect(result.ok).toBe(true);
  });

  it("returns ok when all required env vars are set with legacy hash", () => {
    const validHash = "$2b$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.AUTH_SECRET = "a".repeat(32);
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD_HASH = validHash;

    const result = validateAuthConfig();
    expect(result.ok).toBe(true);
  });
});

describe("getAdminPasswordHash", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("decodes base64 hash when ADMIN_PASSWORD_HASH_B64 is set", () => {
    const hash = "$2b$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.ADMIN_PASSWORD_HASH_B64 = Buffer.from(hash).toString("base64");

    const result = getAdminPasswordHash();
    expect(result).toBe(hash);
    expect(result.startsWith("$2b$")).toBe(true);
  });

  it("falls back to legacy hash when base64 is not set", () => {
    const hash = "$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.ADMIN_PASSWORD_HASH = hash;

    const result = getAdminPasswordHash();
    expect(result).toBe(hash);
  });

  it("strips quotes from legacy hash", () => {
    const hash = "$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.ADMIN_PASSWORD_HASH = `"${hash}"`;

    const result = getAdminPasswordHash();
    expect(result).toBe(hash);
  });

  it("unescapes $$ to $ in legacy hash", () => {
    const hash = "$2a$10$abcdefghijklmnopqrstuvwxyz123456789012345678901234567890";
    process.env.ADMIN_PASSWORD_HASH = hash.replace(/\$/g, "$$");

    const result = getAdminPasswordHash();
    expect(result).toBe(hash);
  });
});

describe("signSession and verifySession", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AUTH_SECRET = "a".repeat(32); // Minimum 32 chars
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("signs and verifies a session round-trip", async () => {
    const user = { email: "admin@example.com", role: "ADMIN" as const };
    const token = await signSession(user);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);

    const verified = await verifySession(token);
    expect(verified).not.toBeNull();
    if (verified) {
      expect(verified.email).toBe(user.email);
      expect(verified.role).toBe(user.role);
    }
  });

  it("verifies different roles correctly", async () => {
    const roles = ["ADMIN", "ANALYST", "VIEWER"] as const;
    for (const role of roles) {
      const user = { email: "user@example.com", role };
      const token = await signSession(user);
      const verified = await verifySession(token);
      expect(verified).not.toBeNull();
      if (verified) {
        expect(verified.role).toBe(role);
      }
    }
  });

  it("returns null for invalid token", async () => {
    const result = await verifySession("invalid.token.here");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await verifySession("");
    expect(result).toBeNull();
  });

  it("returns null for token signed with different secret", async () => {
    const user = { email: "admin@example.com", role: "ADMIN" as const };
    const token = await signSession(user);

    // Change secret
    process.env.AUTH_SECRET = "b".repeat(32);
    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("throws error when AUTH_SECRET is not set during sign", async () => {
    delete process.env.AUTH_SECRET;
    const user = { email: "admin@example.com", role: "ADMIN" as const };
    await expect(signSession(user)).rejects.toThrow("AUTH_SECRET is not set");
  });
});
