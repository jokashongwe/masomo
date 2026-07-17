import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";
import { normalizeReductions, validateFeeSupportReductions } from "@/lib/fee-support-admin";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const updateSchema = z.object({
  note: z.string().optional().nullable(),
  reductions: z
    .array(
      z.object({
        feeId: z.number().int().positive(),
        reductionPercent: z.coerce.number().min(0).max(100),
      }),
    )
    .min(1),
});

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
      reductions: support.feeReductions.map((r) => ({
        feeId: r.feeId,
        feeCode: r.fee.code,
        feeName: r.fee.name,
        reductionPercent: Number(r.reductionPercent),
      })),
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

  const reductions = normalizeReductions(parsed.data.reductions);
  const validation = await validateFeeSupportReductions(support.studentId, reductions);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.studentFeeSupportReduction.deleteMany({ where: { supportId: support.id } });
    await tx.studentFeeSupport.update({
      where: { id: support.id },
      data: {
        note: parsed.data.note?.trim() || null,
        feeReductions: {
          create: reductions.map((r) => ({
            feeId: r.feeId,
            reductionPercent: r.reductionPercent,
          })),
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
