import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]).optional(),
  assignedTo: z.string().max(100).optional().nullable(),
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

    const updated = await prisma.enquiry.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
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


