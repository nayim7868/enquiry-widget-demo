import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<boolean> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    
    // Validate payload structure
    if (typeof payload.email !== "string") {
      return false;
    }
    if (payload.role !== "ADMIN" && payload.role !== "ANALYST" && payload.role !== "VIEWER") {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

function isPublicPath(pathname: string): boolean {
  // Always allow Next.js internals
  if (pathname.startsWith("/_next/")) {
    return true;
  }
  
  // Always allow favicon
  if (pathname === "/favicon.ico") {
    return true;
  }
  
  // Allow admin login page
  if (pathname === "/admin/login") {
    return true;
  }
  
  // Allow admin login/logout/envcheck API routes
  if (pathname === "/api/admin/login" || pathname === "/api/admin/logout" || pathname === "/api/admin/envcheck") {
    return true;
  }
  
  // Allow public POST to /api/enquiries (enquiry creation)
  // Note: We can't check the method here, so we'll handle this in the main logic
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // Special case: POST /api/enquiries is public (enquiry creation)
  if (pathname === "/api/enquiries" && request.method === "POST") {
    return NextResponse.next();
  }
  
  // Check authentication for protected routes
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  const token = sessionCookie?.value;
  
  if (!token) {
    return handleUnauthenticated(request, pathname);
  }
  
  const isValid = await verifyToken(token);
  if (!isValid) {
    return handleUnauthenticated(request, pathname);
  }
  
  // Authenticated, allow request
  return NextResponse.next();
}

function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
  // For API routes, return 401 JSON
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // For admin pages, redirect to login with next parameter
  if (pathname.startsWith("/admin")) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Fallback (shouldn't reach here with our matcher)
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/enquiries/:path*"],
};
