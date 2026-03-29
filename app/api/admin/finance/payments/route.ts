import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";
import { createFeePayment } from "@/lib/fee-payments";
import type { Prisma } from "@/generated/prisma/client";

const createSchema = z
  .object({
    studentId: z.coerce.number().int().positive(),
    feeId: z.coerce.number().int().positive(),
    currency: z.enum(["USD", "CDF"]),
    amount: z.coerce.number().positive(),
    paidAt: z.coerce.date().optional(),
    source: z.enum(["BANK_SLIP", "MANUAL", "IMPORT"]).default("MANUAL"),
    bankSlipReference: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    allocationMode: z
      .enum(["AUTO", "MODULE", "TRANCHE", "TOTAL_DIRECT", "TRANSHES_MULTI"])
      .default("AUTO"),
    moduleId: z.coerce.number().int().positive().optional(),
    trancheId: z.coerce.number().int().positive().optional(),
    tranchePayments: z
      .array(
        z.object({
          trancheId: z.coerce.number().int().positive(),
          amount: z.coerce.number().positive(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.allocationMode === "TRANCHE" && (data.trancheId == null || data.trancheId <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionnez une tranche.",
        path: ["trancheId"],
      });
    }
    if (data.allocationMode === "MODULE" && (data.moduleId == null || data.moduleId <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionnez un module.",
        path: ["moduleId"],
      });
    }
    const refRequired =
      data.source === "BANK_SLIP" &&
      (data.allocationMode === "TRANCHE" || data.allocationMode === "TRANSHES_MULTI");
    if (refRequired) {
      const ref = data.bankSlipReference?.trim();
      if (!ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "La référence du bordereau bancaire est obligatoire pour ce type de paiement à la banque.",
          path: ["bankSlipReference"],
        });
      }
    }
    if (data.allocationMode === "TRANSHES_MULTI") {
      const lines = data.tranchePayments ?? [];
      if (lines.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ajoutez au moins une ligne (tranche et montant).",
          path: ["tranchePayments"],
        });
      }
      const sum = lines.reduce((s, x) => s + x.amount, 0);
      if (lines.length > 0 && Math.abs(sum - data.amount) > 0.00001) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le montant total doit égaler la somme des montants indiqués pour chaque tranche.",
          path: ["amount"],
        });
      }
    }
  });

const listQuerySchema = z.object({
  studentId: z.coerce.number().int().positive().optional(),
  feeId: z.coerce.number().int().positive().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    studentId: url.searchParams.get("studentId") ?? undefined,
    feeId: url.searchParams.get("feeId") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { studentId, feeId, q, page, take } = parsed.data;

  const where: Prisma.FeePaymentWhereInput = {};
  if (studentId) where.studentId = studentId;
  if (feeId) where.feeId = feeId;
  if (q && q.trim()) {
    where.OR = [
      { receiptNumber: { contains: q, mode: "insensitive" } },
      { bankSlipReference: { contains: q, mode: "insensitive" } },
      { student: { name: { contains: q, mode: "insensitive" } } },
      { student: { postnom: { contains: q, mode: "insensitive" } } },
      { student: { firstName: { contains: q, mode: "insensitive" } } },
      { fee: { code: { contains: q, mode: "insensitive" } } },
      { fee: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.feePayment.count({ where });
  const items = await prisma.feePayment.findMany({
    where,
    orderBy: [{ paidAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * take,
    take,
    include: {
      student: { select: { id: true, name: true, postnom: true, firstName: true } },
      fee: { select: { id: true, code: true, name: true, chargeType: true } },
      allocations: { include: { module: true, tranche: true } },
    },
  });

  return NextResponse.json({
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / take)),
  });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const payload = { ...parsed.data };
    if (payload.allocationMode === "TRANSHES_MULTI" && payload.tranchePayments?.length) {
      const merged = new Map<number, number>();
      for (const l of payload.tranchePayments) {
        merged.set(l.trancheId, (merged.get(l.trancheId) ?? 0) + l.amount);
      }
      payload.tranchePayments = Array.from(merged.entries()).map(([trancheId, amount]) => ({
        trancheId,
        amount,
      }));
      const sum = payload.tranchePayments.reduce((s, x) => s + x.amount, 0);
      payload.amount = sum;
    }
    const created = await createFeePayment(payload);
    return NextResponse.json({ payment: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to create payment" }, { status: 409 });
  }
}

