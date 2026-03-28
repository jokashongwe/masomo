import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma/client";

const listQuerySchema = z.object({
  q: z.string().optional(),
  currency: z.enum(["USD", "CDF"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
  academicYearId: z.coerce.number().int().positive().optional(),
});

const expenseCreateSchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  amount: z.coerce.number().positive(),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  occurredAt: z.coerce.date().optional(),
  academicYearId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsedQuery = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
    academicYearId: url.searchParams.get("academicYearId") ?? undefined,
  });

  const q = parsedQuery.success ? parsedQuery.data.q : undefined;
  const currency = parsedQuery.success ? parsedQuery.data.currency : undefined;
  const page = parsedQuery.success && parsedQuery.data.page ? parsedQuery.data.page : 1;
  const take = parsedQuery.success && parsedQuery.data.take ? parsedQuery.data.take : 10;
  const queryYearId = parsedQuery.success ? parsedQuery.data.academicYearId : undefined;

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const filterYearId =
    queryYearId ??
    (await prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } }))?.id;

  const where: Prisma.ExpenseWhereInput = { walletId: wallet.id };
  if (filterYearId) {
    where.academicYearId = filterYearId;
  }
  if (q && q.trim()) {
    where.OR = [{ description: { contains: q, mode: "insensitive" } }];
  }
  if (currency) where.currency = currency;

  const total = await prisma.expense.count({ where });
  const items = await prisma.expense.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    skip: (page - 1) * take,
    take,
  });

  const pageCount = Math.max(1, Math.ceil(total / take));

  return NextResponse.json({ items, total, page, pageCount });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = expenseCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const { currency, amount, description, occurredAt } = parsed.data;

  const academicYearId =
    parsed.data.academicYearId ??
    (
      await prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { id: true },
      })
    )?.id;

  if (!academicYearId) {
    return NextResponse.json(
      { error: "Aucune année scolaire : indiquez academicYearId ou définissez une année en cours." },
      { status: 400 },
    );
  }

  const yearOk = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
    select: { id: true },
  });
  if (!yearOk) {
    return NextResponse.json({ error: "Année scolaire introuvable" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Ensure enough balance
      const walletRow = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balanceUSD: true, balanceCDF: true },
      });
      if (!walletRow) throw new Error("Wallet missing");

      const balanceUSD = Number(walletRow.balanceUSD);
      const balanceCDF = Number(walletRow.balanceCDF);

      if (currency === "USD") {
        if (balanceUSD < amount) throw new Error("Insufficient USD balance");
        await tx.wallet.update({ where: { id: wallet.id }, data: { balanceUSD: { decrement: amount } } });
      } else {
        if (balanceCDF < amount) throw new Error("Insufficient CDF balance");
        await tx.wallet.update({ where: { id: wallet.id }, data: { balanceCDF: { decrement: amount } } });
      }

      const createdExpense = await tx.expense.create({
        data: {
          walletId: wallet.id,
          currency,
          amount,
          description,
          occurredAt: occurredAt ?? new Date(),
          academicYearId,
        },
        select: { id: true },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "EXPENSE",
          currency,
          amount,
          note: description ? `Expense: ${description}` : undefined,
          expenseId: createdExpense.id,
          academicYearId,
        },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create expense" }, { status: 409 });
  }
}

