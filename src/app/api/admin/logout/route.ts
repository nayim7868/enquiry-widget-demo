import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";

export const runtime = "nodejs";

function clearSessionCookie() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: sessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST() {
  return clearSessionCookie();
}

export async function GET(req: Request) {
  // For GET, clear cookie and redirect to login page
  const url = new URL(req.url);
  const loginUrl = new URL("/admin/login", url.origin);
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set({
    name: sessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}