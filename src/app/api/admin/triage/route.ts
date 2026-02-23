import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sessionResult = await requireSession(req);
  if (sessionResult instanceof Response) {
    return sessionResult; // 401 response
  }

  try {
    // Query the view with prisma.$queryRaw
    // Sort newest first: ORDER BY "createdAt" DESC
    // Limit 200 rows
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        mode: string;
        type: string;
        status: string;
        priority: string;
        queue: string;
        assignedTo: string | null;
        createdAt: Date;
        slaDueAt: Date | null;
        firstRespondedAt: Date | null;
        sla_breached: boolean;
        sla_minutes_remaining: number | null;
      }>
    >`
      SELECT *
      FROM enquiry_triage_view
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("Error querying triage view:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch triage data" },
      { status: 500 }
    );
  }
}
