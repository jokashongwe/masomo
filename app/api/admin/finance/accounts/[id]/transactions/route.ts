import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));

  const account = await prisma.financeAccount.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  const transactions = await prisma.financeAccountTransaction.findMany({
    where: { accountId: parsedId.data.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    include: {
      feePayment: {
        select: {
          id: true,
          receiptNumber: true,
          student: { select: { id: true, firstName: true, name: true, postnom: true } },
          fee: { select: { code: true, name: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      amount: t.amount.toString(),
    })),
  });
}
