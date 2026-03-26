import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceWriteApi } from "@/lib/rbac";

const depositSchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  amount: z.coerce.number().positive(),
  note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  const { currency, amount } = parsed.data;
  const note = parsed.data.note;

  try {
    await prisma.$transaction(async (tx) => {
      const walletRow = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balanceUSD: true, balanceCDF: true } });
      if (!walletRow) throw new Error("Wallet missing");

      if (currency === "USD") {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balanceUSD: { increment: amount } } });
      } else {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balanceCDF: { increment: amount } } });
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          currency,
          amount,
          note,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to deposit" }, { status: 500 });
  }
}

