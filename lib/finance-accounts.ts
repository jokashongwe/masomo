import "server-only";

import type { Currency, Prisma } from "@/generated/prisma/client";

export type FinanceAccountWithdrawDestination =
  | { type: "EXTERNAL" }
  | { type: "ACCOUNT"; targetAccountId: number }
  | { type: "WALLET"; academicYearId: number };

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

async function creditFinanceAccountManual(
  tx: Prisma.TransactionClient,
  input: {
    accountId: number;
    currency: Currency;
    amount: number;
    note?: string;
    createdById?: number;
  },
) {
  if (input.amount <= 0) throw new Error("Le montant doit être > 0");

  const account = await tx.financeAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, academicYearId: true, name: true },
  });
  if (!account) throw new Error("Compte destinataire introuvable");

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
      createdById: input.createdById ?? null,
      note: input.note,
    },
  });

  return account;
}

async function creditWalletFromAccount(
  tx: Prisma.TransactionClient,
  input: {
    currency: Currency;
    amount: number;
    academicYearId: number;
    note?: string;
  },
) {
  const wallet = await tx.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!wallet) throw new Error("Caution (wallet) introuvable");

  if (input.currency === "USD") {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceUSD: { increment: input.amount } },
    });
  } else {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceCDF: { increment: input.amount } },
    });
  }

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "DEPOSIT",
      currency: input.currency,
      amount: input.amount,
      academicYearId: input.academicYearId,
      note: input.note,
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
    destination?: FinanceAccountWithdrawDestination;
  },
) {
  if (input.amount <= 0) throw new Error("Le montant doit être > 0");

  const account = await tx.financeAccount.findUnique({
    where: { id: input.accountId },
    select: { id: true, name: true, academicYearId: true, balanceUSD: true, balanceCDF: true },
  });
  if (!account) throw new Error("Compte introuvable");

  const balance = input.currency === "USD" ? Number(account.balanceUSD) : Number(account.balanceCDF);
  if (balance + 0.00001 < input.amount) {
    throw new Error("Solde insuffisant sur ce compte");
  }

  const destination = input.destination ?? { type: "EXTERNAL" as const };
  let withdrawalNote = input.note;

  if (destination.type === "ACCOUNT") {
    if (destination.targetAccountId === input.accountId) {
      throw new Error("Le compte source et le compte destinataire doivent être différents");
    }
    const target = await tx.financeAccount.findUnique({
      where: { id: destination.targetAccountId },
      select: { id: true, name: true, academicYearId: true },
    });
    if (!target) throw new Error("Compte destinataire introuvable");
    if (target.academicYearId !== account.academicYearId) {
      throw new Error("Les deux comptes doivent appartenir à la même année scolaire");
    }
    withdrawalNote = [
      input.note,
      `Transfert vers le compte « ${target.name} »`,
    ]
      .filter(Boolean)
      .join(" — ");
  } else if (destination.type === "WALLET") {
    if (destination.academicYearId !== account.academicYearId) {
      throw new Error("L'année scolaire du transfert doit correspondre à celle du compte");
    }
    withdrawalNote = [input.note, "Transfert vers la caution (wallet)"].filter(Boolean).join(" — ");
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
      note: withdrawalNote,
    },
  });

  if (destination.type === "ACCOUNT") {
    const target = await tx.financeAccount.findUnique({
      where: { id: destination.targetAccountId },
      select: { id: true, name: true },
    });
    if (!target) throw new Error("Compte destinataire introuvable");
    await creditFinanceAccountManual(tx, {
      accountId: destination.targetAccountId,
      currency: input.currency,
      amount: input.amount,
      createdById: input.createdById,
      note: [`Transfert depuis le compte « ${account.name} »`, input.note].filter(Boolean).join(" — "),
    });
  } else if (destination.type === "WALLET") {
    await creditWalletFromAccount(tx, {
      currency: input.currency,
      amount: input.amount,
      academicYearId: destination.academicYearId,
      note: [`Transfert depuis le compte « ${account.name} »`, input.note].filter(Boolean).join(" — "),
    });
  }
}
