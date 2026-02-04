import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]).optional(),
  assignedTo: z.string().max(100).optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data = PatchSchema.parse(body);

    const updated = await prisma.enquiry.update({
      where: { id: params.id },
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

