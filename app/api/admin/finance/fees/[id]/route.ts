import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceWriteApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const feeUpdateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  chargeType: z.enum(["TOTAL", "BY_MODULE"]),
  levelIds: z.array(z.number().int().positive()).default([]),
});

const currencySchema = z.enum(["USD", "CDF"]);

const totalAmountsSchema = z.object({
  totalAmounts: z.array(
    z.object({
      currency: currencySchema,
      amount: z.coerce.number().nonnegative(),
    }),
  ),
});

const moduleAmountsSchema = z.object({
  moduleAmounts: z.array(
    z.object({
      moduleId: z.coerce.number().int().positive(),
      currency: currencySchema,
      amount: z.coerce.number().nonnegative(),
    }),
  ),
  trancheAmounts: z.array(
    z.object({
      trancheId: z.coerce.number().int().positive(),
      currency: currencySchema,
      amount: z.coerce.number().nonnegative(),
    }),
  ),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = feeUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.fee.update({
      where: { id: parsedId.data.id },
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        chargeType: parsed.data.chargeType,
        feeLevels: {
          deleteMany: {},
          create: parsed.data.levelIds.map((levelId) => ({ levelId })),
        },
      },
    });
    return NextResponse.json({ fee: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update fee" }, { status: 500 });
  }
}

// Set TOTAL amounts (USD/CDF) for a fee
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsedTotal = totalAmountsSchema.safeParse(body);
  const parsedModule = moduleAmountsSchema.safeParse(body);
  if (!parsedTotal.success && !parsedModule.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const fee = await prisma.fee.findUnique({ where: { id: parsedId.data.id }, select: { id: true, chargeType: true } });
    if (!fee) return NextResponse.json({ error: "Fee not found" }, { status: 404 });

    if (fee.chargeType === "TOTAL") {
      if (!parsedTotal.success) return NextResponse.json({ error: "Expected totalAmounts for TOTAL fee" }, { status: 400 });

      await prisma.$transaction(async (tx) => {
        await tx.feeTotalAmount.deleteMany({ where: { feeId: fee.id } });
        if (parsedTotal.data.totalAmounts.length > 0) {
          await tx.feeTotalAmount.createMany({
            data: parsedTotal.data.totalAmounts.map((a) => ({
              feeId: fee.id,
              currency: a.currency,
              amount: a.amount,
            })),
          });
        }
      });

      return NextResponse.json({ ok: true });
    }

    // BY_MODULE
    if (!parsedModule.success) return NextResponse.json({ error: "Expected moduleAmounts/trancheAmounts for BY_MODULE fee" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.feeModuleAmount.deleteMany({ where: { feeId: fee.id } });
      await tx.feeTrancheAmount.deleteMany({ where: { feeId: fee.id } });

      if (parsedModule.data.moduleAmounts.length > 0) {
        await tx.feeModuleAmount.createMany({
          data: parsedModule.data.moduleAmounts.map((a) => ({
            feeId: fee.id,
            moduleId: a.moduleId,
            currency: a.currency,
            amount: a.amount,
          })),
        });
      }
      if (parsedModule.data.trancheAmounts.length > 0) {
        await tx.feeTrancheAmount.createMany({
          data: parsedModule.data.trancheAmounts.map((a) => ({
            feeId: fee.id,
            trancheId: a.trancheId,
            currency: a.currency,
            amount: a.amount,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update amounts" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.fee.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete fee (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

