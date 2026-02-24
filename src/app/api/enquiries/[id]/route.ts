import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireSession, canMutate } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]).optional(),
  assignedTo: z.string().max(100).optional().nullable(),
  queue: z.enum(["GENERAL", "FLEET", "VALUATIONS"]).optional(),
});

type Params = { id: string };
type Ctx = { params: Params | Promise<Params> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const authResult = await requireSession(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    const { session } = authResult;

    // Enforce RBAC: only ADMIN and ANALYST can mutate
    if (!canMutate(session.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Works whether params is an object or a Promise (Next 15+ quirks)
    const { id } = await Promise.resolve(ctx.params);

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing enquiry id in route params." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const data = PatchSchema.parse(body);

    // Extract IP and user agent
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent") || null;

    let result;

    // If request body contains status, use the Postgres function
    if (data.status) {
      try {
        const functionResult = await prisma.$queryRaw<
          Array<{
            id: string;
            createdAt: Date;
            mode: string;
            type: string;
            status: string;
            priority: string;
            slaDueAt: Date | null;
            firstRespondedAt: Date | null;
            queue: string;
            name: string;
            email: string | null;
            phone: string | null;
            message: string;
            companyName: string | null;
            fleetSizeBand: string | null;
            timeframe: string | null;
            assignedTo: string | null;
          }>
        >(
          Prisma.sql`
            SELECT * FROM set_enquiry_status(
              ${id}::text,
              ${data.status}::text,
              ${session.email}::text,
              ${session.role}::text,
              ${userAgent}::text,
              ${ip}::text
            )
          `
        );

        // If no row returned, return 404
        if (!functionResult || functionResult.length === 0) {
          return NextResponse.json({ ok: false, error: "Enquiry not found" }, { status: 404 });
        }

        result = functionResult[0];
      } catch (sqlError: unknown) {
        // Log SQL errors clearly server-side
        console.error("Error calling set_enquiry_status function:", {
          enquiryId: id,
          status: data.status,
          error: sqlError instanceof Error ? sqlError.message : String(sqlError),
          stack: sqlError instanceof Error ? sqlError.stack : undefined,
        });
        // Re-throw to be caught by outer catch block (returns 400)
        throw sqlError;
      }
    } else {
      // If no status update, just fetch current for later updates
      const current = await prisma.enquiry.findUnique({
        where: { id },
      });

      if (!current) {
        return NextResponse.json({ ok: false, error: "Enquiry not found" }, { status: 404 });
      }

      result = current;
    }

    // If body also contains queue / assignedTo, update those fields using Prisma
    if (data.queue !== undefined || data.assignedTo !== undefined) {
      const updateData: Prisma.EnquiryUpdateInput = {};

      if (data.queue !== undefined) {
        updateData.queue = data.queue;
      }
      if (data.assignedTo !== undefined) {
        updateData.assignedTo = data.assignedTo;
      }

      // Capture "before" state for audit log (only queue/assignedTo since status was handled by function)
      const before = {
        queue: result.queue,
        assignedTo: result.assignedTo,
      };

      // Perform update and audit log creation in a transaction
      const updated = await prisma.$transaction(async (tx) => {
        const enquiry = await tx.enquiry.update({
          where: { id },
          data: updateData,
        });

        // Capture "after" state
        const after = {
          queue: enquiry.queue,
          assignedTo: enquiry.assignedTo,
        };

        // Create audit log for queue/assignedTo changes only
        // @ts-expect-error - Prisma transaction type inference issue, but auditLog exists at runtime
        await tx.auditLog.create({
          data: {
            actorEmail: session.email,
            actorRole: session.role,
            action: "ENQUIRY_UPDATE",
            entityType: "Enquiry",
            entityId: id,
            changes: { before, after },
            ip,
            userAgent,
          },
        });

        return enquiry;
      });

      result = updated;
    }

    return NextResponse.json({ ok: true, enquiry: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}


