import "server-only";

import { prisma } from "@/lib/prisma";

export type Currency = "USD" | "CDF";

export type DailyFeesExpenseRow = {
  day: string; // YYYY-MM-DD
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

export type MonthlyFeesExpenseRow = {
  month: string; // YYYY-MM
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

/** Une ligne par (jour, frais) ou (jour, Budget pour dépenses). */
export type DailyByFeeRow = {
  day: string;
  feeId: number | null;
  feeCode: string;
  feeName: string;
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

/** Agrégation mensuelle par frais (ou Budget). */
export type MonthlyByFeeRow = {
  month: string;
  feeId: number | null;
  feeCode: string;
  feeName: string;
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcMidnight(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDayKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toMonthKeyUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/**
 * Fenêtre [gte, lt) pour les paiements d’un module (jour/mois), alignée sur l’année UTC
 * dérivée du début d’année scolaire — même logique que les rapports journaliers.
 */
export function getModulePaymentWindowUTC(
  academicYearStartDate: Date,
  module: { startDay: number; startMonth: number; endDay: number; endMonth: number },
): { gte: Date; lt: Date } {
  const academicStart = utcMidnight(new Date(academicYearStartDate));
  const year = academicStart.getUTCFullYear();
  const gte = new Date(Date.UTC(year, module.startMonth - 1, module.startDay));
  let end = new Date(Date.UTC(year, module.endMonth - 1, module.endDay));
  if (end.getTime() < gte.getTime()) {
    end = new Date(Date.UTC(year + 1, module.endMonth - 1, module.endDay));
  }
  const lt = addDaysUTC(utcMidnight(end), 1);
  return { gte, lt };
}

export function findCurrentBillingModuleForDate<
  T extends { startDay: number; startMonth: number; endDay: number; endMonth: number },
>(now: Date, academicYearStartDate: Date, modules: T[]): T | null {
  const t = now.getTime();
  for (const m of modules) {
    const { gte, lt } = getModulePaymentWindowUTC(academicYearStartDate, m);
    if (t >= gte.getTime() && t < lt.getTime()) return m;
  }
  return null;
}

function diffDaysInclusiveUTC(start: Date, end: Date) {
  const a = utcMidnight(start).getTime();
  const b = utcMidnight(end).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function getCurrentAcademicYear() {
  const current = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, startDate: true, endDate: true },
  });
  return current;
}

function parseDateOnlyToUTCMidnight(dateOnly: string) {
  // Input is expected as YYYY-MM-DD.
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  return utcMidnight(d);
}

/** Toutes les lignes journalières sur la plage (pour pagination ou agrégation mensuelle). */
async function computeAllDailyFeesExpenseRows(
  startDate: string,
  endDate: string,
): Promise<{
  rows: DailyFeesExpenseRow[];
  totals: { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number };
}> {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) throw new Error("No academic year in progress");

  const academicStart = utcMidnight(new Date(currentYear.startDate));
  const academicEnd = utcMidnight(new Date(currentYear.endDate));

  const requestedStart = parseDateOnlyToUTCMidnight(startDate);
  const requestedEnd = parseDateOnlyToUTCMidnight(endDate);

  const startDay = requestedStart.getTime() < academicStart.getTime() ? academicStart : requestedStart;
  const endDay = requestedEnd.getTime() > academicEnd.getTime() ? academicEnd : requestedEnd;
  const totalDaysInRange = diffDaysInclusiveUTC(startDay, endDay);

  if (totalDaysInRange <= 0) {
    return {
      rows: [],
      totals: { feesUSD: 0, feesCDF: 0, expensesUSD: 0, expensesCDF: 0 },
    };
  }

  const rangeStartInclusive = utcMidnight(startDay);
  const rangeEndExclusive = addDaysUTC(utcMidnight(endDay), 1);

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });

  const [feePayments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        academicYearId: currentYear.id,
        paidAt: { gte: rangeStartInclusive, lt: rangeEndExclusive },
      },
      select: { paidAt: true, currency: true, amount: true },
    }),
    wallet
      ? prisma.expense.findMany({
          where: {
            walletId: wallet.id,
            academicYearId: currentYear.id,
            occurredAt: { gte: rangeStartInclusive, lt: rangeEndExclusive },
          },
          select: { occurredAt: true, currency: true, amount: true },
        })
      : Promise.resolve([]),
  ]);

  const feesByDay = new Map<string, { USD: number; CDF: number }>();
  for (const p of feePayments) {
    const dayKey = toDayKeyUTC(utcMidnight(new Date(p.paidAt)));
    const row = feesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    row[p.currency] += Number(p.amount);
    feesByDay.set(dayKey, row);
  }

  const expensesByDay = new Map<string, { USD: number; CDF: number }>();
  for (const ex of expenses) {
    const dayKey = toDayKeyUTC(utcMidnight(new Date(ex.occurredAt)));
    const row = expensesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    row[ex.currency] += Number(ex.amount);
    expensesByDay.set(dayKey, row);
  }

  const dailyRows: DailyFeesExpenseRow[] = [];
  let totalFeesUSD = 0;
  let totalFeesCDF = 0;
  let totalExpensesUSD = 0;
  let totalExpensesCDF = 0;

  for (let i = 0; i < totalDaysInRange; i++) {
    const day = addDaysUTC(startDay, i);
    const dayKey = toDayKeyUTC(day);

    const f = feesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    const e = expensesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    const row: DailyFeesExpenseRow = {
      day: dayKey,
      feesUSD: round2(f.USD),
      feesCDF: round2(f.CDF),
      expensesUSD: round2(e.USD),
      expensesCDF: round2(e.CDF),
    };

    const hasActivity =
      row.feesUSD !== 0 || row.feesCDF !== 0 || row.expensesUSD !== 0 || row.expensesCDF !== 0;
    if (!hasActivity) continue;

    dailyRows.push(row);

    totalFeesUSD += row.feesUSD;
    totalFeesCDF += row.feesCDF;
    totalExpensesUSD += row.expensesUSD;
    totalExpensesCDF += row.expensesCDF;
  }

  return {
    rows: dailyRows,
    totals: {
      feesUSD: round2(totalFeesUSD),
      feesCDF: round2(totalFeesCDF),
      expensesUSD: round2(totalExpensesUSD),
      expensesCDF: round2(totalExpensesCDF),
    },
  };
}

export async function getDailyFeesAndExpensesReport({
  startDate,
  endDate,
  page,
  take,
}: {
  startDate: string;
  endDate: string;
  page: number;
  take: number;
}) {
  const { rows: dailyRows, totals } = await computeAllDailyFeesExpenseRows(startDate, endDate);

  if (dailyRows.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageCount: 1,
      totals,
    };
  }

  const pageCount = Math.max(1, Math.ceil(dailyRows.length / take));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (safePage - 1) * take;
  const items = dailyRows.slice(startIndex, startIndex + take);

  return {
    items,
    total: dailyRows.length,
    page: safePage,
    pageCount,
    totals,
  };
}

export async function getMonthlyFeesAndExpensesReport({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const { rows: allDailyRows, totals } = await computeAllDailyFeesExpenseRows(startDate, endDate);

  const monthMap = new Map<string, { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number }>();
  for (const row of allDailyRows) {
    const d = new Date(`${row.day}T00:00:00.000Z`);
    const monthKey = toMonthKeyUTC(d);
    const m = monthMap.get(monthKey) ?? { feesUSD: 0, feesCDF: 0, expensesUSD: 0, expensesCDF: 0 };
    m.feesUSD += row.feesUSD;
    m.feesCDF += row.feesCDF;
    m.expensesUSD += row.expensesUSD;
    m.expensesCDF += row.expensesCDF;
    monthMap.set(monthKey, m);
  }

  const months = Array.from(monthMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, v]) => ({
      month,
      feesUSD: round2(v.feesUSD),
      feesCDF: round2(v.feesCDF),
      expensesUSD: round2(v.expensesUSD),
      expensesCDF: round2(v.expensesCDF),
    })) satisfies MonthlyFeesExpenseRow[];

  return {
    items: months,
    totals,
  };
}

const WALLET_ROW_CODE = "Budget";
const WALLET_ROW_NAME = "Dépenses Budget";

async function computeAllDailyByFeeRows(
  startDate: string,
  endDate: string,
): Promise<{
  rows: DailyByFeeRow[];
  totals: { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number };
}> {
  const currentYear = await getCurrentAcademicYear();
  if (!currentYear) throw new Error("No academic year in progress");

  const academicStart = utcMidnight(new Date(currentYear.startDate));
  const academicEnd = utcMidnight(new Date(currentYear.endDate));

  const requestedStart = parseDateOnlyToUTCMidnight(startDate);
  const requestedEnd = parseDateOnlyToUTCMidnight(endDate);

  const startDay = requestedStart.getTime() < academicStart.getTime() ? academicStart : requestedStart;
  const endDay = requestedEnd.getTime() > academicEnd.getTime() ? academicEnd : requestedEnd;
  const totalDaysInRange = diffDaysInclusiveUTC(startDay, endDay);

  if (totalDaysInRange <= 0) {
    return {
      rows: [],
      totals: { feesUSD: 0, feesCDF: 0, expensesUSD: 0, expensesCDF: 0 },
    };
  }

  const rangeStartInclusive = utcMidnight(startDay);
  const rangeEndExclusive = addDaysUTC(utcMidnight(endDay), 1);

  const wallet = await prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } });

  const [feePayments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: {
        academicYearId: currentYear.id,
        paidAt: { gte: rangeStartInclusive, lt: rangeEndExclusive },
      },
      select: {
        paidAt: true,
        currency: true,
        amount: true,
        fee: { select: { id: true, code: true, name: true } },
      },
    }),
    wallet
      ? prisma.expense.findMany({
          where: {
            walletId: wallet.id,
            academicYearId: currentYear.id,
            occurredAt: { gte: rangeStartInclusive, lt: rangeEndExclusive },
          },
          select: { occurredAt: true, currency: true, amount: true },
        })
      : Promise.resolve([]),
  ]);

  type FeeAgg = { feeId: number; feeCode: string; feeName: string; USD: number; CDF: number };
  const byDayFee = new Map<string, FeeAgg>();

  for (const p of feePayments) {
    const dayKey = toDayKeyUTC(utcMidnight(new Date(p.paidAt)));
    const mapKey = `${dayKey}\0${p.fee.id}`;
    const cur = byDayFee.get(mapKey) ?? {
      feeId: p.fee.id,
      feeCode: p.fee.code,
      feeName: p.fee.name,
      USD: 0,
      CDF: 0,
    };
    cur[p.currency] += Number(p.amount);
    byDayFee.set(mapKey, cur);
  }

  const expensesByDay = new Map<string, { USD: number; CDF: number }>();
  for (const ex of expenses) {
    const dayKey = toDayKeyUTC(utcMidnight(new Date(ex.occurredAt)));
    const row = expensesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    row[ex.currency] += Number(ex.amount);
    expensesByDay.set(dayKey, row);
  }

  const rows: DailyByFeeRow[] = [];

  for (const [mapKey, agg] of byDayFee) {
    const dayKey = mapKey.split("\0")[0]!;
    const feesUSD = round2(agg.USD);
    const feesCDF = round2(agg.CDF);
    if (feesUSD === 0 && feesCDF === 0) continue;
    rows.push({
      day: dayKey,
      feeId: agg.feeId,
      feeCode: agg.feeCode,
      feeName: agg.feeName,
      feesUSD,
      feesCDF,
      expensesUSD: 0,
      expensesCDF: 0,
    });
  }

  for (const [dayKey, e] of expensesByDay) {
    const expensesUSD = round2(e.USD);
    const expensesCDF = round2(e.CDF);
    if (expensesUSD === 0 && expensesCDF === 0) continue;
    rows.push({
      day: dayKey,
      feeId: null,
      feeCode: WALLET_ROW_CODE,
      feeName: WALLET_ROW_NAME,
      feesUSD: 0,
      feesCDF: 0,
      expensesUSD,
      expensesCDF,
    });
  }

  rows.sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    const sortA = a.feeId === null ? "\uffff" : a.feeCode;
    const sortB = b.feeId === null ? "\uffff" : b.feeCode;
    if (sortA !== sortB) return sortA < sortB ? -1 : 1;
    return 0;
  });

  let totalFeesUSD = 0;
  let totalFeesCDF = 0;
  let totalExpensesUSD = 0;
  let totalExpensesCDF = 0;
  for (const r of rows) {
    totalFeesUSD += r.feesUSD;
    totalFeesCDF += r.feesCDF;
    totalExpensesUSD += r.expensesUSD;
    totalExpensesCDF += r.expensesCDF;
  }

  return {
    rows,
    totals: {
      feesUSD: round2(totalFeesUSD),
      feesCDF: round2(totalFeesCDF),
      expensesUSD: round2(totalExpensesUSD),
      expensesCDF: round2(totalExpensesCDF),
    },
  };
}

export async function getDailyReportByFee({
  startDate,
  endDate,
  page,
  take,
}: {
  startDate: string;
  endDate: string;
  page: number;
  take: number;
}) {
  const { rows, totals } = await computeAllDailyByFeeRows(startDate, endDate);

  if (rows.length === 0) {
    return {
      items: [],
      total: 0,
      page,
      pageCount: 1,
      totals,
    };
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / take));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const startIndex = (safePage - 1) * take;
  const items = rows.slice(startIndex, startIndex + take);

  return {
    items,
    total: rows.length,
    page: safePage,
    pageCount,
    totals,
  };
}

export async function getMonthlyReportByFee({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const { rows: dailyRows, totals } = await computeAllDailyByFeeRows(startDate, endDate);

  const keyForRow = (r: DailyByFeeRow) =>
    `${toMonthKeyUTC(new Date(`${r.day}T00:00:00.000Z`))}\0${r.feeId === null ? "w" : String(r.feeId)}`;

  const monthFeeMap = new Map<
    string,
    {
      month: string;
      feeId: number | null;
      feeCode: string;
      feeName: string;
      feesUSD: number;
      feesCDF: number;
      expensesUSD: number;
      expensesCDF: number;
    }
  >();

  for (const r of dailyRows) {
    const k = keyForRow(r);
    const monthKey = toMonthKeyUTC(new Date(`${r.day}T00:00:00.000Z`));
    const cur = monthFeeMap.get(k) ?? {
      month: monthKey,
      feeId: r.feeId,
      feeCode: r.feeCode,
      feeName: r.feeName,
      feesUSD: 0,
      feesCDF: 0,
      expensesUSD: 0,
      expensesCDF: 0,
    };
    cur.feesUSD += r.feesUSD;
    cur.feesCDF += r.feesCDF;
    cur.expensesUSD += r.expensesUSD;
    cur.expensesCDF += r.expensesCDF;
    monthFeeMap.set(k, cur);
  }

  const items: MonthlyByFeeRow[] = Array.from(monthFeeMap.values())
    .map((v) => ({
      month: v.month,
      feeId: v.feeId,
      feeCode: v.feeCode,
      feeName: v.feeName,
      feesUSD: round2(v.feesUSD),
      feesCDF: round2(v.feesCDF),
      expensesUSD: round2(v.expensesUSD),
      expensesCDF: round2(v.expensesCDF),
    }))
    .sort((a, b) => {
      if (a.month !== b.month) return a.month < b.month ? -1 : 1;
      const sortA = a.feeId === null ? "\uffff" : a.feeCode;
      const sortB = b.feeId === null ? "\uffff" : b.feeCode;
      if (sortA !== sortB) return sortA < sortB ? -1 : 1;
      return 0;
    });

  return { items, totals };
}
