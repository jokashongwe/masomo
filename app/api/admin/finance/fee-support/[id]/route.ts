import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";
import {
  normalizeReductions,
  reductionCreateData,
  validateFeeSupportReductions,
  type FeeSupportReductionInput,
} from "@/lib/fee-support-admin";
import { formatFeeSupportRule } from "@/lib/student-fee-support";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const optionalAmount = z.preprocess((v) => {
  if (v === "" || v === undefined) return null;
  return v;
}, z.coerce.number().min(0).nullable());

const reductionSchema = z.discriminatedUnion("mode", [
  z.object({
    feeId: z.number().int().positive(),
    mode: z.literal("PERCENT"),
    reductionPercent: z.coerce.number().min(0).max(100),
  }),
  z.object({
    feeId: z.number().int().positive(),
    mode: z.literal("FIXED_AMOUNT"),
    amountToPayUSD: optionalAmount.optional(),
    amountToPayCDF: optionalAmount.optional(),
  }),
]);

const updateSchema = z.object({
  note: z.string().optional().nullable(),
  reductions: z.array(reductionSchema).min(1),
});

function toInputs(
  reductions: z.infer<typeof reductionSchema>[],
): FeeSupportReductionInput[] {
  return reductions.map((r) => {
    if (r.mode === "PERCENT") {
      return { feeId: r.feeId, mode: "PERCENT", reductionPercent: r.reductionPercent };
    }
    return {
      feeId: r.feeId,
      mode: "FIXED_AMOUNT",
      amountToPayUSD: r.amountToPayUSD ?? null,
      amountToPayCDF: r.amountToPayCDF ?? null,
    };
  });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const support = await prisma.studentFeeSupport.findUnique({
    where: { id: parsedId.data.id },
    include: {
      student: {
        select: {
          id: true,
          matricule: true,
          firstName: true,
          name: true,
          postnom: true,
        },
      },
      academicYear: { select: { id: true, name: true } },
      feeReductions: {
        include: { fee: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!support) return NextResponse.json({ error: "Prise en charge introuvable" }, { status: 404 });

  return NextResponse.json({
    support: {
      id: support.id,
      studentId: support.studentId,
      academicYearId: support.academicYearId,
      note: support.note,
      student: support.student,
      academicYear: support.academicYear,
      reductions: support.feeReductions.map((r) => {
        const reductionPercent = r.reductionPercent != null ? Number(r.reductionPercent) : null;
        const amountToPayUSD = r.amountToPayUSD != null ? Number(r.amountToPayUSD) : null;
        const amountToPayCDF = r.amountToPayCDF != null ? Number(r.amountToPayCDF) : null;
        return {
          feeId: r.feeId,
          feeCode: r.fee.code,
          feeName: r.fee.name,
          mode: r.mode,
          reductionPercent,
          amountToPayUSD,
          amountToPayCDF,
          label: formatFeeSupportRule({
            mode: r.mode,
            reductionPercent,
            amountToPayUSD,
            amountToPayCDF,
          }),
        };
      }),
    },
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const support = await prisma.studentFeeSupport.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true, studentId: true },
  });
  if (!support) return NextResponse.json({ error: "Prise en charge introuvable" }, { status: 404 });

  const reductions = normalizeReductions(toInputs(parsed.data.reductions));
  const validation = await validateFeeSupportReductions(support.studentId, reductions);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.studentFeeSupportReduction.deleteMany({ where: { supportId: support.id } });
    await tx.studentFeeSupport.update({
      where: { id: support.id },
      data: {
        note: parsed.data.note?.trim() || null,
        feeReductions: {
          create: reductions.map(reductionCreateData),
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  try {
    await prisma.studentFeeSupport.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 409 });
  }
}
