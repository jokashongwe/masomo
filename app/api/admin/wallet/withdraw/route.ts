import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceWriteApi } from "@/lib/rbac";

const withdrawSchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  amount: z.coerce.number().positive(),
  note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  academicYearId: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!wallet) return NextResponse.json({ error: "Compte de caution introuvable" }, { status: 404 });

  const { currency, amount } = parsed.data;
  const note = parsed.data.note;

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
      const walletRow = await tx.wallet.findUnique({
        where: { id: wallet.id },
        select: { balanceUSD: true, balanceCDF: true },
      });
      if (!walletRow) throw new Error("Wallet missing");

      const balance = currency === "USD" ? Number(walletRow.balanceUSD) : Number(walletRow.balanceCDF);
      if (balance + 0.00001 < amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      if (currency === "USD") {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceUSD: { decrement: amount } },
        });
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceCDF: { decrement: amount } },
        });
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          currency,
          amount,
          note,
          academicYearId,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Solde insuffisant sur la caution" }, { status: 400 });
    }
    return NextResponse.json({ error: "Échec du retrait" }, { status: 500 });
  }
}
