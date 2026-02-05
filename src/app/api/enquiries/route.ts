import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreateEnquirySchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

// Ensure we run in Node (SQLite driver doesn't work on Edge runtime)
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateEnquirySchema.parse(body);

    const email = data.email?.trim() ? data.email.trim() : null;
    const phone = data.phone?.trim() ? data.phone.trim() : null;

    // pageUrl is required in your DB schema for EnquiryContext
    const pageUrl =
      data.pageUrl ??
      req.headers.get("referer") ??
      "unknown";
    
    const isFleet = data.mode === "FLEET" || data.type === "FLEET_ENQUIRY";
    const isPartEx = data.mode === "PART_EX" || data.type === "PART_EXCHANGE";
  
     const queue = isFleet ? "FLEET" : isPartEx ? "VALUATIONS" : "GENERAL";
  
       

      const now = Date.now();

    const isHigh =
      data.type === "FLEET_ENQUIRY" || data.type === "PART_EXCHANGE" ||
      data.mode === "FLEET" || data.mode === "PART_EX";

     const priority = isHigh ? "HIGH" : "NORMAL";

// Example SLA targets (you can tweak these)
    const slaMinutes = priority === "HIGH" ? 15 : 60;
    const slaDueAt = new Date(now + slaMinutes * 60 * 1000);

    const enquiryData = {
      mode: data.mode,
      type: data.type,
      name: data.name,
      priority: priority as "HIGH" | "NORMAL",
      slaDueAt,
      queue,
      email,
      phone,
      message: data.message,
      companyName: data.companyName?.trim() || null,
      fleetSizeBand: data.fleetSizeBand?.trim() || null,
      timeframe: data.timeframe?.trim() || null,
      // Context fields for tracking page and marketing data
      context: {
        create: {
          pageUrl,
          referrer: data.referrer ?? null,
          utmSource: data.utmSource ?? null,
          utmMedium: data.utmMedium ?? null,
          utmCampaign: data.utmCampaign ?? null,
          device: data.device ?? null,
        },
      },
      partEx:
        data.mode === "PART_EX" || data.type === "PART_EXCHANGE"
          ? {
              create: {
                reg: data.reg!.trim(),
                mileage: data.mileage!,
              },
            }
          : undefined,
    };

    const created = await prisma.enquiry.create({
      data: enquiryData as Prisma.EnquiryCreateInput,
      include: { context: true, partEx: true },
    });

    


    return NextResponse.json({ ok: true, enquiry: created }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const status = searchParams.get("status");
  const queue = searchParams.get("queue");

  const enquiries = await prisma.enquiry.findMany({
    where: {
      ...(mode ? { mode: mode as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(queue ? { queue: queue as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { context: true, partEx: true },
  });

  return NextResponse.json({ ok: true, enquiries });
}



