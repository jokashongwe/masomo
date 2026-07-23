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

const reductionSchema = z.discriminatedUnion("mode", [
  z.object({
    feeId: z.number().int().positive(),
    mode: z.literal("PERCENT"),
    reductionPercent: z.coerce.number().min(0).max(100),
  }),
  z.object({
    feeId: z.number().int().positive(),
    mode: z.literal("FIXED_AMOUNT"),
    amountToPayUSD: z.coerce.number().min(0).nullable().optional(),
    amountToPayCDF: z.coerce.number().min(0).nullable().optional(),
  }),
]);

const createSchema = z.object({
  studentId: z.number().int().positive(),
  academicYearId: z.number().int().positive(),
  note: z.string().optional().nullable(),
  reductions: z.array(reductionSchema).min(1),
});

function mapReduction(r: {
  id?: number;
  feeId: number;
  mode: string;
  reductionPercent: unknown;
  amountToPayUSD: unknown;
  amountToPayCDF: unknown;
  fee: { code: string; name: string };
}) {
  const reductionPercent = r.reductionPercent != null ? Number(r.reductionPercent) : null;
  const amountToPayUSD = r.amountToPayUSD != null ? Number(r.amountToPayUSD) : null;
  const amountToPayCDF = r.amountToPayCDF != null ? Number(r.amountToPayCDF) : null;
  return {
    id: r.id,
    feeId: r.feeId,
    feeCode: r.fee.code,
    feeName: r.fee.name,
    mode: r.mode as "PERCENT" | "FIXED_AMOUNT",
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
}

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

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const academicYearIdRaw = url.searchParams.get("academicYearId");
  const academicYearId = academicYearIdRaw ? Number(academicYearIdRaw) : null;

  const supports = await prisma.studentFeeSupport.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: [{ academicYearId: "desc" }, { id: "desc" }],
    include: {
      student: {
        select: {
          id: true,
          matricule: true,
          firstName: true,
          name: true,
          postnom: true,
          schoolClass: { select: { codeClass: true } },
        },
      },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      feeReductions: {
        include: { fee: { select: { id: true, code: true, name: true } } },
        orderBy: { feeId: "asc" },
      },
    },
  });

  return NextResponse.json({
    supports: supports.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      academicYearId: s.academicYearId,
      note: s.note,
      student: s.student,
      academicYear: s.academicYear,
      reductions: s.feeReductions.map(mapReduction),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, academicYearId: true },
  });
  if (!student) return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });
  if (student.academicYearId !== parsed.data.academicYearId) {
    return NextResponse.json({ error: "L'élève n'appartient pas à cette année scolaire" }, { status: 400 });
  }

  const existing = await prisma.studentFeeSupport.findUnique({
    where: {
      studentId_academicYearId: {
        studentId: parsed.data.studentId,
        academicYearId: parsed.data.academicYearId,
      },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Cet élève a déjà une prise en charge pour cette année" }, { status: 409 });
  }

  const reductions = normalizeReductions(toInputs(parsed.data.reductions));
  const validation = await validateFeeSupportReductions(parsed.data.studentId, reductions);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  const created = await prisma.studentFeeSupport.create({
    data: {
      studentId: parsed.data.studentId,
      academicYearId: parsed.data.academicYearId,
      note: parsed.data.note?.trim() || null,
      feeReductions: {
        create: reductions.map(reductionCreateData),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
