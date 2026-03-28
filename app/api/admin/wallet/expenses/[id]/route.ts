import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const expenseUpdateSchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  amount: z.coerce.number().positive(),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  occurredAt: z.coerce.date().optional(),
  academicYearId: z.coerce.number().int().positive().optional(),
});

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await prisma.expense.findUnique({
    where: { id: parsedId.data.id },
  });
  if (!item) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  return NextResponse.json({ expense: item });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = expenseUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.academicYearId != null) {
    const yearOk = await prisma.academicYear.findUnique({
      where: { id: parsed.data.academicYearId },
      select: { id: true },
    });
    if (!yearOk) {
      return NextResponse.json({ error: "Année scolaire introuvable" }, { status: 400 });
    }
  }

  // Updating an expense requires adjusting wallet balances.
  // We also update the linked WalletTransaction when present.
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({
        where: { id: parsedId.data.id },
        select: { walletId: true, currency: true, amount: true },
      });
      if (!existing) throw new Error("Not found");

      const walletRow = await tx.wallet.findUnique({
        where: { id: existing.walletId },
        select: { balanceUSD: true, balanceCDF: true },
      });
      if (!walletRow) throw new Error("Wallet missing");

      const newCurrency = parsed.data.currency;
      const newAmount = parsed.data.amount;
      const walletBalanceUSD = Number(walletRow.balanceUSD);
      const walletBalanceCDF = Number(walletRow.balanceCDF);
      const existingAmount = Number(existing.amount);

      // Revert existing expense
      const revertUSD = existing.currency === "USD" ? existingAmount : 0;
      const revertCDF = existing.currency === "CDF" ? existingAmount : 0;

      await tx.wallet.update({
        where: { id: existing.walletId },
        data: {
          balanceUSD: { increment: revertUSD },
          balanceCDF: { increment: revertCDF },
        },
      });

      // Compute available balances after revert
      const availableUSD = walletBalanceUSD + revertUSD;
      const availableCDF = walletBalanceCDF + revertCDF;

      // Apply new expense
      if (newCurrency === "USD") {
        if (availableUSD < newAmount) throw new Error("Insufficient USD balance");
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balanceUSD: { decrement: newAmount } },
        });
      } else {
        if (availableCDF < newAmount) throw new Error("Insufficient CDF balance");
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balanceCDF: { decrement: newAmount } },
        });
      }

      await tx.expense.update({
        where: { id: parsedId.data.id },
        data: {
          currency: newCurrency,
          amount: newAmount,
          description: parsed.data.description,
          occurredAt: parsed.data.occurredAt ?? undefined,
          ...(parsed.data.academicYearId != null ? { academicYearId: parsed.data.academicYearId } : {}),
        },
      });

      // Update linked transaction if it exists
      await tx.walletTransaction.updateMany({
        where: { expenseId: parsedId.data.id },
        data: {
          currency: newCurrency,
          amount: newAmount,
          note: parsed.data.description ? `Expense: ${parsed.data.description}` : undefined,
          ...(parsed.data.academicYearId != null ? { academicYearId: parsed.data.academicYearId } : {}),
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 409 });
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({
        where: { id: parsedId.data.id },
        select: { walletId: true, currency: true, amount: true },
      });
      if (!existing) throw new Error("Not found");

      if (existing.currency === "USD") {
        await tx.wallet.update({ where: { id: existing.walletId }, data: { balanceUSD: { increment: Number(existing.amount) } } });
      } else {
        await tx.wallet.update({ where: { id: existing.walletId }, data: { balanceCDF: { increment: Number(existing.amount) } } });
      }

      // Delete the linked transaction first to keep history consistent.
      await tx.walletTransaction.deleteMany({ where: { expenseId: parsedId.data.id } });
      await tx.expense.delete({ where: { id: parsedId.data.id } });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 409 });
  }
}

