import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, sessionCookieName, getRawEnv, getAdminPasswordHash, validateAuthConfig } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    // Validate auth configuration first
    const configValidation = validateAuthConfig();
    if (!configValidation.ok) {
      return NextResponse.json(
        { ok: false, error: "Server auth not configured", code: "AUTH_MISCONFIGURED" },
        { status: 500 }
      );
    }

    // Get raw env values (no sanitization for authentication)
    const adminEmail = getRawEnv("ADMIN_EMAIL").trim();
    const adminHash = getAdminPasswordHash(); // Decodes base64 or parses legacy format

    const emailMatches = email.toLowerCase() === adminEmail.toLowerCase();
    const passMatches = await bcrypt.compare(password, adminHash);

    if (!emailMatches || !passMatches) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signSession({ email: adminEmail, role: "ADMIN" });

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: sessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;
  } catch (err) {
    console.error("login error:", err);

    const msg = err instanceof Error ? err.message : "Bad request";

    return NextResponse.json(
      {
        ok: false,
        error: process.env.NODE_ENV === "development" ? msg : "Bad request",
      },
      { status: 400 }
    );
  }
}