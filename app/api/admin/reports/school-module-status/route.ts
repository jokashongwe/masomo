import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi } from "@/lib/rbac";
import { getSchoolModulePaymentStatusReport } from "@/lib/school-module-payment-status";

const querySchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  moduleId: z.coerce.number().int().positive(),
  trancheId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  optionId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const raw: Record<string, string | undefined> = {
    currency: url.searchParams.get("currency") ?? undefined,
    moduleId: url.searchParams.get("moduleId") ?? undefined,
    trancheId: url.searchParams.get("trancheId") ?? undefined,
    sectionId: url.searchParams.get("sectionId") ?? undefined,
    optionId: url.searchParams.get("optionId") ?? undefined,
    classId: url.searchParams.get("classId") ?? undefined,
  };
  for (const k of Object.keys(raw)) {
    if (raw[k] === "") delete raw[k];
  }

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { currency, moduleId, trancheId, sectionId, optionId, classId } = parsed.data;

  if (trancheId != null) {
    const tr = await prisma.moduleTranche.findUnique({
      where: { id: trancheId },
      select: { moduleId: true },
    });
    if (!tr || tr.moduleId !== moduleId) {
      return NextResponse.json(
        { error: "La tranche ne correspond pas au module sélectionné" },
        { status: 400 },
      );
    }
  }

  try {
    const report = await getSchoolModulePaymentStatusReport({
      currency,
      moduleId,
      trancheId: trancheId ?? null,
      sectionId: sectionId ?? null,
      optionId: optionId ?? null,
      classId: classId ?? null,
    });
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to compute report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
