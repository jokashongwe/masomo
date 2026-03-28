"use client";

import { useEffect, useMemo, useState } from "react";

type DailyRow = {
  day: string; // YYYY-MM-DD
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

type MonthlyRow = {
  month: string; // YYYY-MM
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

type DailyReportResponse = {
  items: DailyRow[];
  total: number;
  page: number;
  pageCount: number;
  totals: { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number };
};

type MonthlyReportResponse = {
  items: MonthlyRow[];
  totals: { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number };
};

function formatCurrency(n: number, currency: "USD" | "CDF") {
  try {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ` ${currency}`;
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function formatMonthFR(monthKey: string) {
  // monthKey is YYYY-MM
  const d = new Date(`${monthKey}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "long" }).format(d);
}

export default function ReportsClient({ initialStart, initialEnd }: { initialStart: string; initialEnd: string }) {
  const [mode, setMode] = useState<"daily" | "monthly">("daily");

  const [draftStart, setDraftStart] = useState(initialStart);
  const [draftEnd, setDraftEnd] = useState(initialEnd);

  const [paramsStart, setParamsStart] = useState(initialStart);
  const [paramsEnd, setParamsEnd] = useState(initialEnd);

  const [dailyPage, setDailyPage] = useState(1);
  const [dailyTake, setDailyTake] = useState(20);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [daily, setDaily] = useState<DailyReportResponse | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReportResponse | null>(null);

  const isDateRangeValid = useMemo(() => {
    if (!draftStart || !draftEnd) return false;
    const a = new Date(`${draftStart}T00:00:00.000Z`);
    const b = new Date(`${draftEnd}T00:00:00.000Z`);
    return b.getTime() >= a.getTime();
  }, [draftStart, draftEnd]);

  async function fetchDaily() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/daily?start=${encodeURIComponent(paramsStart)}&end=${encodeURIComponent(paramsEnd)}&page=${dailyPage}&take=${dailyTake}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setDaily(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonthly() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/monthly?start=${encodeURIComponent(paramsStart)}&end=${encodeURIComponent(paramsEnd)}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setMonthly(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial load + reloads when parameters change.
    if (mode === "daily") fetchDaily();
    else fetchMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paramsStart, paramsEnd, dailyPage, dailyTake]);

  function applyRange() {
    if (!isDateRangeValid) return;
    setDailyPage(1);
    setParamsStart(draftStart);
    setParamsEnd(draftEnd);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Rapports</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Paiements de frais (estimés à partir des frais configurés et des élèves inscrits) et dépenses (réelles).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setMode("daily");
              setDailyPage(1);
            }}
            className={
              "rounded-lg px-4 py-2 text-sm border " +
              (mode === "daily" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white/60 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100")
            }
          >
            Journaliers
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("monthly");
              setDailyPage(1);
            }}
            className={
              "rounded-lg px-4 py-2 text-sm border " +
              (mode === "monthly" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white/60 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100")
            }
          >
            Mensuels
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="block text-sm font-medium text-black dark:text-white">Début</label>
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-white">Fin</label>
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              />
            </div>
          </div>

          {mode === "daily" ? (
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">Lignes</label>
                <select
                  value={dailyTake}
                  onChange={(e) => {
                    setDailyTake(Number(e.target.value));
                    setDailyPage(1);
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <button
                type="button"
                onClick={applyRange}
                disabled={!isDateRangeValid}
                className="mt-0 rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
              >
                Mettre à jour
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={applyRange}
              disabled={!isDateRangeValid}
              className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
            >
              Mettre à jour
            </button>
          )}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div> : null}
      {loading && !error ? <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement...</div> : null}

      {mode === "daily" && daily ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.feesUSD, "USD")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.feesCDF, "CDF")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.expensesUSD, "USD")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-700 dark:text-zinc-300">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Frais USD</th>
                  <th className="py-2 pr-3">Frais CDF</th>
                  <th className="py-2 pr-3">Dépenses USD</th>
                  <th className="py-2 pr-3">Dépenses CDF</th>
                </tr>
              </thead>
              <tbody>
                {daily.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-zinc-600 dark:text-zinc-300">
                      Aucune donnée sur cette période.
                    </td>
                  </tr>
                ) : (
                  daily.items.map((r) => (
                    <tr key={r.day} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-3 pr-3">{r.day}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.feesUSD, "USD")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.feesCDF, "CDF")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.expensesUSD, "USD")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.expensesCDF, "CDF")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Page {daily.page} sur {daily.pageCount} ({daily.total} jours)
            </div>
            <div className="flex items-center gap-2">
              {daily.page > 1 ? (
                <button
                  type="button"
                  onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
                >
                  Précédent
                </button>
              ) : null}
              {daily.page < daily.pageCount ? (
                <button
                  type="button"
                  onClick={() => setDailyPage((p) => p + 1)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
                >
                  Suivant
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {mode === "monthly" && monthly ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.feesUSD, "USD")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.feesCDF, "CDF")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.expensesUSD, "USD")}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 text-white p-5 shadow">
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-700 dark:text-zinc-300">
                  <th className="py-2 pr-3">Mois</th>
                  <th className="py-2 pr-3">Frais USD</th>
                  <th className="py-2 pr-3">Frais CDF</th>
                  <th className="py-2 pr-3">Dépenses USD</th>
                  <th className="py-2 pr-3">Dépenses CDF</th>
                </tr>
              </thead>
              <tbody>
                {monthly.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-zinc-600 dark:text-zinc-300">
                      Aucune donnée sur cette période.
                    </td>
                  </tr>
                ) : (
                  monthly.items.map((r) => (
                    <tr key={r.month} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-3 pr-3">{formatMonthFR(r.month)}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.feesUSD, "USD")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.feesCDF, "CDF")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.expensesUSD, "USD")}</td>
                      <td className="py-3 pr-3">{formatCurrency(r.expensesCDF, "CDF")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

