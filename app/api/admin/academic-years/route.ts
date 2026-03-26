import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSystemAdminApi } from "@/lib/rbac";

const academicYearSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional().default(false),
});

export async function GET() {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json({ years });
}

export async function POST(req: Request) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = academicYearSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.endDate.getTime() < parsed.data.startDate.getTime()) {
    return NextResponse.json({ error: "endDate must be >= startDate" }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.isCurrent) {
        await tx.academicYear.updateMany({ data: { isCurrent: false } });
      }

      return tx.academicYear.create({
        data: {
          name: parsed.data.name,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          isCurrent: parsed.data.isCurrent,
        },
      });
    });

    return NextResponse.json({ academicYear: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create academic year (name must be unique)" }, { status: 409 });
  }
}

