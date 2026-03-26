import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isSystemAdmin } from "@/lib/auth";

function isDateInModule(today: Date, startDay: number, startMonth: number, endDay: number, endMonth: number) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), startMonth - 1, startDay);
  const end = new Date(today.getFullYear(), endMonth - 1, endDay);

  // Handle wrap-around (e.g., Dec -> Jan)
  if (end.getTime() < start.getTime()) {
    return t.getTime() >= start.getTime() || t.getTime() <= end.getTime();
  }
  return t.getTime() >= start.getTime() && t.getTime() <= end.getTime();
}

function formatMoney(amount: number, currency: "USD" | "CDF") {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${currency}`;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function AdminHomePage() {
  const user = await requireUser();

  if (!isSystemAdmin(user.role)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Admin dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Your role has access to specific areas. Use the left sidebar to navigate.
        </p>
      </div>
    );
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!currentYear) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-black dark:text-white">System Administrator Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          No academic year is currently in progress. Configure it first from system admin.
        </p>
      </div>
    );
  }

  const today = new Date();
  const yearStart = currentYear.startDate;
  const yearEndExclusive = new Date(currentYear.endDate.getTime() + 1);

  const [modules, fees, studentsThisYear, sexCounts, studentTotal] = await Promise.all([
    prisma.billingModule.findMany({ orderBy: { id: "asc" } }),
    prisma.fee.findMany({
      include: {
        feeLevels: { select: { levelId: true } },
        totalAmounts: { select: { currency: true, amount: true } },
        moduleAmounts: { select: { moduleId: true, currency: true, amount: true } },
      },
    }),
    prisma.student.findMany({
      where: { academicYearId: currentYear.id },
      select: { sex: true, schoolClass: { select: { levelId: true } } },
    }),
    prisma.student.groupBy({
      by: ["sex"],
      where: { academicYearId: currentYear.id },
      _count: { _all: true },
    }),
    prisma.student.count({ where: { academicYearId: currentYear.id } }),
  ]);

  const expenseAgg = await prisma.expense.groupBy({
    by: ["currency"],
    _sum: { amount: true },
    where: { occurredAt: { gte: yearStart, lt: yearEndExclusive } },
  });

  const currentModule =
    modules.find((m) => isDateInModule(today, m.startDay, m.startMonth, m.endDay, m.endMonth)) ?? null;

  // Precompute per-level amounts:
  // - totalFees[levelId][currency] for TOTAL fees
  // - byModuleAllFees[levelId][currency] = sum over all modules for BY_MODULE fees
  // - byModuleCurrentFees[levelId][moduleId][currency] = for current module
  const totalFees: Record<number, Record<"USD" | "CDF", number>> = {};
  const byModuleAllFees: Record<number, Record<"USD" | "CDF", number>> = {};
  const byModuleCurrentFees: Record<number, Record<number, Record<"USD" | "CDF", number>>> = {};

  for (const fee of fees) {
    const levelIds = fee.feeLevels.map((fl) => fl.levelId);

    if (fee.chargeType === "TOTAL") {
      for (const levelId of levelIds) {
        totalFees[levelId] ||= { USD: 0, CDF: 0 };
      }
      for (const amt of fee.totalAmounts) {
        for (const levelId of levelIds) {
          totalFees[levelId][amt.currency] += Number(amt.amount);
        }
      }
    } else if (fee.chargeType === "BY_MODULE") {
      for (const levelId of levelIds) {
        byModuleAllFees[levelId] ||= { USD: 0, CDF: 0 };
      }
      for (const mAmt of fee.moduleAmounts) {
        for (const levelId of levelIds) {
          byModuleAllFees[levelId][mAmt.currency] += Number(mAmt.amount);
          if (currentModule) {
            if (mAmt.moduleId === currentModule.id) {
              byModuleCurrentFees[levelId] ||= {};
              byModuleCurrentFees[levelId][mAmt.moduleId] ||= { USD: 0, CDF: 0 };
              byModuleCurrentFees[levelId][mAmt.moduleId][mAmt.currency] += Number(mAmt.amount);
            }
          }
        }
      }
    }
  }

  let totalPerceivedUSD = 0;
  let totalPerceivedCDF = 0;
  let moduleCurrentPerceivedUSD = 0;
  let moduleCurrentPerceivedCDF = 0;

  for (const s of studentsThisYear) {
    const levelId = s.schoolClass.levelId;
    const total = totalFees[levelId] ?? { USD: 0, CDF: 0 };
    const byAll = byModuleAllFees[levelId] ?? { USD: 0, CDF: 0 };

    totalPerceivedUSD += total.USD + byAll.USD;
    totalPerceivedCDF += total.CDF + byAll.CDF;

    if (currentModule) {
      const byCurrent = byModuleCurrentFees[levelId]?.[currentModule.id] ?? { USD: 0, CDF: 0 };
      moduleCurrentPerceivedUSD += total.USD + byCurrent.USD;
      moduleCurrentPerceivedCDF += total.CDF + byCurrent.CDF;
    }
  }

  const totalMale = sexCounts.find((x) => x.sex === "MALE")?._count._all ?? 0;
  const totalFemale = sexCounts.find((x) => x.sex === "FEMALE")?._count._all ?? 0;
  const totalOther = sexCounts.find((x) => x.sex === "OTHER")?._count._all ?? 0;

  let totalExpensesUSD = 0;
  let totalExpensesCDF = 0;
  for (const row of expenseAgg) {
    const sum = row._sum.amount ? Number(row._sum.amount) : 0;
    if (row.currency === "USD") totalExpensesUSD += sum;
    if (row.currency === "CDF") totalExpensesCDF += sum;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-black dark:text-white">System Administrator Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        {currentYear.name} overview and finance stats derived from students and configured fees.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
          <div className="text-sm font-medium opacity-95">Total perçu (année)</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatMoney(totalPerceivedUSD, "USD")}
          </div>
          <div className="text-sm opacity-90 mt-1">{formatMoney(totalPerceivedCDF, "CDF")}</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-5 shadow">
          <div className="text-sm font-medium opacity-95">Total perçu (module en cours)</div>
          <div className="mt-2 text-2xl font-semibold">
            {currentModule ? formatMoney(moduleCurrentPerceivedUSD, "USD") : "N/A"}
          </div>
          <div className="text-sm opacity-90 mt-1">{currentModule ? formatMoney(moduleCurrentPerceivedCDF, "CDF") : ""}</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white p-5 shadow">
          <div className="text-sm font-medium opacity-95">Total élèves inscrits</div>
          <div className="mt-2 text-2xl font-semibold">{studentTotal}</div>
          <div className="text-sm opacity-90 mt-1">
            This year: {studentsThisYear.length}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 text-white p-5 shadow">
          <div className="text-sm font-medium opacity-95">Total dépenses</div>
          <div className="mt-2 text-2xl font-semibold">{formatMoney(totalExpensesUSD, "USD")}</div>
          <div className="text-sm opacity-90 mt-1">{formatMoney(totalExpensesCDF, "CDF")}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-5">
          <div className="font-semibold text-black dark:text-white">Students breakdown</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">Male</span>
              <span className="font-medium">{totalMale}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">Female</span>
              <span className="font-medium">{totalFemale}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">Other</span>
              <span className="font-medium">{totalOther}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-black dark:text-white">Key shortcuts</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                Manage finance and school data from here.
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/admin/finance/fees" className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-800">
                Fees
              </Link>
              <Link href="/admin/finance/modules" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40">
                Modules
              </Link>
              <Link href="/admin/students" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40">
                Students
              </Link>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-gradient-to-r from-white/70 to-white/20 dark:from-white/10 dark:to-white/5 border border-zinc-200/70 dark:border-zinc-800/70 p-4 text-sm text-zinc-700 dark:text-zinc-200">
            Tip: “Perçu” is currently computed from students enrolled during the year and the configured fees attached to their levels (TOTAL + BY_MODULE, summed across modules or current module).
          </div>
        </div>
      </div>
    </div>
  );
}

