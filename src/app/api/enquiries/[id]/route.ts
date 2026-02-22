import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireSession, canMutate } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

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
   
    const current = await prisma.enquiry.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ ok: false, error: "Enquiry not found" }, { status: 404 });
    }

    const statusChanging = data.status && data.status !== current.status;

    const firstRespondedAt =
      statusChanging &&
      data.status === "CONTACTED" &&
      !(current as { firstRespondedAt?: Date | null }).firstRespondedAt
        ? new Date()
        : undefined;

    // Capture "before" state (only relevant fields)
    const before = {
      status: current.status,
      queue: current.queue,
      assignedTo: current.assignedTo,
      firstRespondedAt: current.firstRespondedAt,
    };

    // Prepare update data
    const updateData = {
      ...(data.status ? { status: data.status } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(firstRespondedAt ? { firstRespondedAt } : {}),
      ...(data.queue ? { queue: data.queue } : {}),
    };

    // Extract IP and user agent
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent") || null;

    // Perform update and audit log creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.enquiry.update({
        where: { id },
        data: updateData,
      });

      // Capture "after" state (only relevant fields)
      const after = {
        status: updated.status,
        queue: updated.queue,
        assignedTo: updated.assignedTo,
        firstRespondedAt: updated.firstRespondedAt,
      };

      // Create audit log
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

      return updated;
    });

    return NextResponse.json({ ok: true, enquiry: result });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}


