import "server-only";

import { prisma } from "@/lib/prisma";

/** Compte d’encaissement principal affiché sur le tableau de bord. */
export const MAIN_FINANCE_ACCOUNT_NAME = "Encaissement École";

function sumsFromAgg(rows: { currency: string; _sum: { amount: unknown } }[]) {
  let usd = 0;
  let cdf = 0;
  for (const r of rows) {
    const n = r._sum.amount != null ? Number(r._sum.amount) : 0;
    if (r.currency === "USD") usd += n;
    if (r.currency === "CDF") cdf += n;
  }
  return { usd, cdf };
}

export type AdminDashboardStats = {
  totalEncaisse: { usd: number; cdf: number };
  mainAccount: {
    id: number;
    name: string;
    balanceUSD: number;
    balanceCDF: number;
  } | null;
  mainAccountWithdrawals: { usd: number; cdf: number };
  walletBalance: { usd: number; cdf: number } | null;
  walletExpenses: { usd: number; cdf: number };
  studentTotal: number;
};

export async function getAdminDashboardStats(input: {
  academicYearId: number;
  yearStart: Date;
  yearEndExclusive: Date;
  includeStudents?: boolean;
}): Promise<AdminDashboardStats> {
  const { academicYearId, yearStart, yearEndExclusive, includeStudents = true } = input;

  const [paymentsYearAgg, wallet, mainAccountByName, mainAccountFallback, studentTotal] = await Promise.all([
    prisma.feePayment.groupBy({
      by: ["currency"],
      _sum: { amount: true },
      where: { academicYearId },
    }),
    prisma.wallet.findFirst({
      orderBy: { id: "asc" },
      select: { id: true, balanceUSD: true, balanceCDF: true },
    }),
    prisma.financeAccount.findUnique({
      where: {
        academicYearId_name: { academicYearId, name: MAIN_FINANCE_ACCOUNT_NAME },
      },
      select: { id: true, name: true, balanceUSD: true, balanceCDF: true },
    }),
    prisma.financeAccount.findFirst({
      where: { academicYearId },
      orderBy: { id: "asc" },
      select: { id: true, name: true, balanceUSD: true, balanceCDF: true },
    }),
    includeStudents
      ? prisma.student.count({ where: { academicYearId } })
      : Promise.resolve(0),
  ]);

  const mainAccountRow = mainAccountByName ?? mainAccountFallback;

  const [withdrawalAgg, expenseAgg] = await Promise.all([
    mainAccountRow
      ? prisma.financeAccountTransaction.groupBy({
          by: ["currency"],
          _sum: { amount: true },
          where: {
            accountId: mainAccountRow.id,
            type: "WITHDRAWAL",
            createdAt: { gte: yearStart, lt: yearEndExclusive },
          },
        })
      : Promise.resolve([]),
    wallet
      ? prisma.expense.groupBy({
          by: ["currency"],
          _sum: { amount: true },
          where: {
            walletId: wallet.id,
            academicYearId,
            occurredAt: { gte: yearStart, lt: yearEndExclusive },
          },
        })
      : Promise.resolve([]),
  ]);

  const mainAccount = mainAccountRow
    ? {
        id: mainAccountRow.id,
        name: mainAccountRow.name,
        balanceUSD: Number(mainAccountRow.balanceUSD),
        balanceCDF: Number(mainAccountRow.balanceCDF),
      }
    : null;

  return {
    totalEncaisse: sumsFromAgg(paymentsYearAgg),
    mainAccount,
    mainAccountWithdrawals: sumsFromAgg(withdrawalAgg),
    walletBalance: wallet
      ? { usd: Number(wallet.balanceUSD), cdf: Number(wallet.balanceCDF) }
      : null,
    walletExpenses: sumsFromAgg(expenseAgg),
    studentTotal,
  };
}
