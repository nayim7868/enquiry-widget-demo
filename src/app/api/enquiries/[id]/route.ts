import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

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

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
        ...(firstRespondedAt ? { firstRespondedAt } : {}),
        ...(data.queue ? { queue: data.queue } : {}),
      },
    });

    return NextResponse.json({ ok: true, enquiry: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}


