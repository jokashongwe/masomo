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

function diffDaysInclusiveUTC(start: Date, end: Date) {
  const a = utcMidnight(start).getTime();
  const b = utcMidnight(end).getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / MS_PER_DAY) + 1;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function computeModuleIntervalUTC(
  year: number,
  module: { id: number; startDay: number; startMonth: number; endDay: number; endMonth: number },
) {
  const start = new Date(Date.UTC(year, module.startMonth - 1, module.startDay));
  let end = new Date(Date.UTC(year, module.endMonth - 1, module.endDay));

  // Wrap-around (e.g., Dec -> Jan)
  if (end.getTime() < start.getTime()) {
    end = new Date(Date.UTC(year + 1, module.endMonth - 1, module.endDay));
  }

  return {
    start,
    end,
    days: diffDaysInclusiveUTC(start, end),
  };
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
      items: [],
      total: 0,
      page,
      pageCount: 1,
      totals: { feesUSD: 0, feesCDF: 0, expensesUSD: 0, expensesCDF: 0 },
    };
  }

  const yearForModules = academicStart.getUTCFullYear();
  const totalDaysAcademicYear = diffDaysInclusiveUTC(academicStart, academicEnd);

  const [modules, fees, students, wallet] = await Promise.all([
    prisma.billingModule.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, startDay: true, startMonth: true, endDay: true, endMonth: true } }),
    prisma.fee.findMany({
      include: {
        feeLevels: { select: { levelId: true } },
        totalAmounts: { select: { currency: true, amount: true } },
        moduleAmounts: { select: { moduleId: true, currency: true, amount: true } },
      },
    }),
    prisma.student.findMany({
      where: { academicYearId: currentYear.id },
      select: { schoolClass: { select: { levelId: true } } },
    }),
    prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } }),
  ]);

  if (!wallet) throw new Error("Wallet not found");

  // Count students per level.
  const studentCountByLevel = new Map<number, number>();
  for (const s of students) {
    const levelId = s.schoolClass.levelId;
    studentCountByLevel.set(levelId, (studentCountByLevel.get(levelId) ?? 0) + 1);
  }

  // Compute TOTAL (distributed across the academic year) and BY_MODULE (distributed across each module duration)
  const totalYearFeesUSD = { USD: 0, CDF: 0 };
  const moduleTotals: Record<number, { USD: number; CDF: number }> = {};

  for (const fee of fees) {
    const levelIds = fee.feeLevels.map((fl) => fl.levelId);
    const studentsInLevels = levelIds.reduce((acc, levelId) => acc + (studentCountByLevel.get(levelId) ?? 0), 0);
    if (!studentsInLevels) continue;

    if (fee.chargeType === "TOTAL") {
      for (const amt of fee.totalAmounts) {
        const n = Number(amt.amount);
        totalYearFeesUSD[amt.currency] += studentsInLevels * n;
      }
    } else if (fee.chargeType === "BY_MODULE") {
      for (const mAmt of fee.moduleAmounts) {
        moduleTotals[mAmt.moduleId] ||= { USD: 0, CDF: 0 };
        const n = Number(mAmt.amount);
        moduleTotals[mAmt.moduleId][mAmt.currency] += studentsInLevels * n;
      }
    }
  }

  const basePerDayUSD = totalDaysAcademicYear > 0 ? totalYearFeesUSD.USD / totalDaysAcademicYear : 0;
  const basePerDayCDF = totalDaysAcademicYear > 0 ? totalYearFeesUSD.CDF / totalDaysAcademicYear : 0;

  const modulesIntervals = modules.map((m) => {
    const interval = computeModuleIntervalUTC(yearForModules, m);
    const totals = moduleTotals[m.id] ?? { USD: 0, CDF: 0 };
    return {
      id: m.id,
      start: interval.start,
      end: interval.end,
      days: interval.days,
      perDayUSD: interval.days > 0 ? totals.USD / interval.days : 0,
      perDayCDF: interval.days > 0 ? totals.CDF / interval.days : 0,
    };
  });

  // Aggregate expenses per day (real expenses, based on occurredAt).
  const rangeStartInclusive = utcMidnight(startDay);
  const rangeEndExclusive = addDaysUTC(utcMidnight(endDay), 1);
  const expenses = await prisma.expense.findMany({
    where: { walletId: wallet.id, occurredAt: { gte: rangeStartInclusive, lt: rangeEndExclusive } },
    select: { occurredAt: true, currency: true, amount: true },
  });

  const expensesByDay = new Map<string, { USD: number; CDF: number }>();
  for (const ex of expenses) {
    const dayKey = toDayKeyUTC(utcMidnight(new Date(ex.occurredAt)));
    const row = expensesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    row[ex.currency] += Number(ex.amount);
    expensesByDay.set(dayKey, row);
  }

  // Build daily rows in the range.
  const dailyRows: DailyFeesExpenseRow[] = [];
  let totalFeesUSD = 0;
  let totalFeesCDF = 0;
  let totalExpensesUSD = 0;
  let totalExpensesCDF = 0;

  for (let i = 0; i < totalDaysInRange; i++) {
    const day = addDaysUTC(startDay, i);
    const dayKey = toDayKeyUTC(day);

    let feesUSD = basePerDayUSD;
    let feesCDF = basePerDayCDF;

    for (const mi of modulesIntervals) {
      if (day.getTime() >= mi.start.getTime() && day.getTime() <= mi.end.getTime()) {
        feesUSD += mi.perDayUSD;
        feesCDF += mi.perDayCDF;
      }
    }

    const e = expensesByDay.get(dayKey) ?? { USD: 0, CDF: 0 };
    const row: DailyFeesExpenseRow = {
      day: dayKey,
      feesUSD: round2(feesUSD),
      feesCDF: round2(feesCDF),
      expensesUSD: round2(e.USD),
      expensesCDF: round2(e.CDF),
    };
    dailyRows.push(row);

    totalFeesUSD += row.feesUSD;
    totalFeesCDF += row.feesCDF;
    totalExpensesUSD += row.expensesUSD;
    totalExpensesCDF += row.expensesCDF;
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
    totals: {
      feesUSD: round2(totalFeesUSD),
      feesCDF: round2(totalFeesCDF),
      expensesUSD: round2(totalExpensesUSD),
      expensesCDF: round2(totalExpensesCDF),
    },
  };
}

export async function getMonthlyFeesAndExpensesReport({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  // Reuse the daily calculation (range is typically <= 1 academic year).
  const daily = await getDailyFeesAndExpensesReport({
    startDate,
    endDate,
    page: 1,
    take: 5000, // effectively "all" in the range
  });

  const monthMap = new Map<string, { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number }>();
  for (const row of daily.items) {
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
    totals: {
      feesUSD: round2(daily.totals.feesUSD),
      feesCDF: round2(daily.totals.feesCDF),
      expensesUSD: round2(daily.totals.expensesUSD),
      expensesCDF: round2(daily.totals.expensesCDF),
    },
  };
}

