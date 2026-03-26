import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const feeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  chargeType: z.enum(["TOTAL", "BY_MODULE"]),
  levelIds: z.array(z.number().int().positive()).default([]),
});

export async function GET() {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;
  const fees = await prisma.fee.findMany({
    orderBy: { id: "asc" },
    include: {
      feeLevels: { include: { level: true } },
      totalAmounts: true,
      moduleAmounts: true,
      trancheAmounts: true,
    },
  });
  return NextResponse.json({ fees });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = feeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.fee.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        chargeType: parsed.data.chargeType,
        feeLevels: {
          create: parsed.data.levelIds.map((levelId) => ({ levelId })),
        },
      },
    });
    return NextResponse.json({ fee: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create fee" }, { status: 500 });
  }
}

