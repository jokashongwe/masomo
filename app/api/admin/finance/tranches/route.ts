import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const trancheSchema = z.object({
  codeTranche: z.string().min(1),
  moduleId: z.coerce.number().int().positive(),
  startDay: z.coerce.number().int().min(1).max(31),
  startMonth: z.coerce.number().int().min(1).max(12),
  endDay: z.coerce.number().int().min(1).max(31),
  endMonth: z.coerce.number().int().min(1).max(12),
});

export async function GET() {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;
  const tranches = await prisma.moduleTranche.findMany({
    orderBy: { id: "asc" },
    include: { module: true },
  });
  return NextResponse.json({ tranches });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = trancheSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.moduleTranche.create({
      data: {
        codeTranche: parsed.data.codeTranche,
        moduleId: parsed.data.moduleId,
        startDay: parsed.data.startDay,
        startMonth: parsed.data.startMonth,
        endDay: parsed.data.endDay,
        endMonth: parsed.data.endMonth,
      },
    });
    return NextResponse.json({ tranche: created }, { status: 201 });
  } catch (error) {
    console.log("Failed to create tranche", error);
    return NextResponse.json({ error: "Failed to create tranche" }, { status: 500 });
  }
}

