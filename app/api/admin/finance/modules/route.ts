import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const moduleSchema = z.object({
  name: z.string().min(1),
  startDay: z.coerce.number().int().min(1).max(31),
  startMonth: z.coerce.number().int().min(1).max(12),
  endDay: z.coerce.number().int().min(1).max(31),
  endMonth: z.coerce.number().int().min(1).max(12),
});

export async function GET() {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;
  const modules = await prisma.billingModule.findMany({
    orderBy: { id: "asc" },
    include: { tranches: { orderBy: { id: "asc" } } },
  });
  return NextResponse.json({ modules });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.billingModule.create({ data: parsed.data });
    return NextResponse.json({ module: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}

