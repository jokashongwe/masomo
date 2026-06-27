import "server-only";

import type { Currency, Prisma } from "@/generated/prisma/client";

export async function creditFinanceAccountOnFeePayment(
  tx: Prisma.TransactionClient,
  input: {
    accountId: number;
    academicYearId: number;
    feePaymentId: number;
    currency: Currency;
    amount: number;
    note?: string | null;
  },
) {
  const account = await tx.financeAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, academicYearId: true, balanceUSD: true, balanceCDF: true },
  });
  if (!account) throw new Error("Compte introuvable");
  if (account.academicYearId !== input.academicYearId) {
    throw new Error("Le compte n'appartient pas à l'année scolaire du paiement");
  }

  if (input.currency === "USD") {
    await tx.financeAccount.update({
      where: { id: account.id },
      data: { balanceUSD: { increment: input.amount } },
    });
  } else {
    await tx.financeAccount.update({
      where: { id: account.id },
      data: { balanceCDF: { increment: input.amount } },
    });
  }

  await tx.financeAccountTransaction.create({
    data: {
      accountId: account.id,
      type: "DEPOSIT",
      currency: input.currency,
      amount: input.amount,
      feePaymentId: input.feePaymentId,
      note: input.note ? `Paiement frais: ${input.note}` : "Paiement de frais",
    },
  });
}

export async function withdrawFromFinanceAccount(
  tx: Prisma.TransactionClient,
  input: {
    accountId: number;
    currency: Currency;
    amount: number;
    createdById: number;
    note?: string;
  },
) {
  if (input.amount <= 0) throw new Error("Le montant doit être > 0");

  const account = await tx.financeAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, balanceUSD: true, balanceCDF: true },
  });
  if (!account) throw new Error("Compte introuvable");

  const balance = input.currency === "USD" ? Number(account.balanceUSD) : Number(account.balanceCDF);
  if (balance + 0.00001 < input.amount) {
    throw new Error("Solde insuffisant sur ce compte");
  }

  if (input.currency === "USD") {
    await tx.financeAccount.update({
      where: { id: account.id },
      data: { balanceUSD: { decrement: input.amount } },
    });
  } else {
    await tx.financeAccount.update({
      where: { id: account.id },
      data: { balanceCDF: { decrement: input.amount } },
    });
  }

  await tx.financeAccountTransaction.create({
    data: {
      accountId: account.id,
      type: "WITHDRAWAL",
      currency: input.currency,
      amount: input.amount,
      createdById: input.createdById,
      note: input.note,
    },
  });
}
