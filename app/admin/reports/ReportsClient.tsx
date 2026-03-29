"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  adminBackLink,
  adminCard,
  adminErrorBox,
  adminGhostButton,
  adminHeaderRow,
  adminInput,
  adminKicker,
  adminPage,
  adminPrimaryButton,
  adminSegmentActive,
  adminSegmentInactive,
  adminStatExpenses,
  adminStatFees,
  adminSubtitle,
  adminTable,
  adminTh,
  adminTitle,
  adminTr,
} from "../components/admin-ui";

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

type DailyByFeeRow = {
  day: string;
  feeId: number | null;
  feeCode: string;
  feeName: string;
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

type MonthlyByFeeRow = {
  month: string;
  feeId: number | null;
  feeCode: string;
  feeName: string;
  feesUSD: number;
  feesCDF: number;
  expensesUSD: number;
  expensesCDF: number;
};

type DailyByFeeReportResponse = {
  items: DailyByFeeRow[];
  total: number;
  page: number;
  pageCount: number;
  totals: { feesUSD: number; feesCDF: number; expensesUSD: number; expensesCDF: number };
};

type MonthlyByFeeReportResponse = {
  items: MonthlyByFeeRow[];
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
  const [reportView, setReportView] = useState<"global" | "byFee">("global");
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
  const [dailyByFee, setDailyByFee] = useState<DailyByFeeReportResponse | null>(null);
  const [monthlyByFee, setMonthlyByFee] = useState<MonthlyByFeeReportResponse | null>(null);

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

  async function fetchDailyByFee() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/daily-by-fee?start=${encodeURIComponent(paramsStart)}&end=${encodeURIComponent(paramsEnd)}&page=${dailyPage}&take=${dailyTake}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setDailyByFee(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonthlyByFee() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reports/monthly-by-fee?start=${encodeURIComponent(paramsStart)}&end=${encodeURIComponent(paramsEnd)}`,
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setMonthlyByFee(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (reportView === "global") {
      if (mode === "daily") fetchDaily();
      else fetchMonthly();
    } else {
      if (mode === "daily") fetchDailyByFee();
      else fetchMonthlyByFee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportView, mode, paramsStart, paramsEnd, dailyPage, dailyTake]);

  function applyRange() {
    if (!isDateRangeValid) return;
    setDailyPage(1);
    setParamsStart(draftStart);
    setParamsEnd(draftEnd);
  }

  return (
    <div className={adminPage}>
      <header className={adminHeaderRow}>
        <div>
          <p className={adminKicker}>Finances</p>
          <h1 className={`mt-1 ${adminTitle}`}>Rapports</h1>
          <p className={adminSubtitle}>
            {reportView === "global"
              ? "Encaissements réels (paiements de frais saisis, selon la date de paiement) et dépenses réelles (sorties du Budget, selon la date de la dépense). Seules les dates avec au moins une opération sont listées."
              : "Détail par type de frais (code / libellé) et ligne « Dépenses Budget » pour les sorties du Budget. Une ligne par date ou par mois et par frais."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setReportView("global");
              setDailyPage(1);
            }}
            className={reportView === "global" ? adminSegmentActive : adminSegmentInactive}
          >
            Vue globale
          </button>
          <button
            type="button"
            onClick={() => {
              setReportView("byFee");
              setDailyPage(1);
            }}
            className={reportView === "byFee" ? adminSegmentActive : adminSegmentInactive}
          >
            Par frais
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("daily");
              setDailyPage(1);
            }}
            className={mode === "daily" ? adminSegmentActive : adminSegmentInactive}
          >
            Journaliers
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("monthly");
              setDailyPage(1);
            }}
            className={mode === "monthly" ? adminSegmentActive : adminSegmentInactive}
          >
            Mensuels
          </button>
          <Link href="/admin" className={adminBackLink}>
            Retour à l’admin
          </Link>
        </div>
      </header>

      <div className={`${adminCard} mt-6`}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Début</label>
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className={`mt-2 ${adminInput}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Fin</label>
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className={`mt-2 ${adminInput}`}
              />
            </div>
          </div>

          {mode === "daily" ? (
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Lignes</label>
                <select
                  value={dailyTake}
                  onChange={(e) => {
                    setDailyTake(Number(e.target.value));
                    setDailyPage(1);
                  }}
                  className={`mt-2 ${adminInput}`}
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
                className={adminPrimaryButton}
              >
                Mettre à jour
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={applyRange}
              disabled={!isDateRangeValid}
              className={adminPrimaryButton}
            >
              Mettre à jour
            </button>
          )}
        </div>
      </div>

      {error ? <div className={`${adminErrorBox} mt-4`}>{error}</div> : null}
      {loading && !error ? <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement...</div> : null}

      {reportView === "global" && mode === "daily" && daily ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.feesUSD, "USD")}</div>
            </div>
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.feesCDF, "CDF")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.expensesUSD, "USD")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(daily.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className={`${adminCard} mt-6 overflow-x-auto`}>
            <table className={adminTable}>
              <thead>
                <tr>
                  <th className={adminTh}>Date</th>
                  <th className={adminTh}>Frais USD</th>
                  <th className={adminTh}>Frais CDF</th>
                  <th className={adminTh}>Dépenses USD</th>
                  <th className={adminTh}>Dépenses CDF</th>
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
                    <tr key={r.day} className={adminTr}>
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
                  className={adminGhostButton}
                >
                  Précédent
                </button>
              ) : null}
              {daily.page < daily.pageCount ? (
                <button
                  type="button"
                  onClick={() => setDailyPage((p) => p + 1)}
                  className={adminGhostButton}
                >
                  Suivant
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {reportView === "global" && mode === "monthly" && monthly ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.feesUSD, "USD")}</div>
            </div>
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.feesCDF, "CDF")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.expensesUSD, "USD")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthly.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className={`${adminCard} mt-6 overflow-x-auto`}>
            <table className={adminTable}>
              <thead>
                <tr>
                  <th className={adminTh}>Mois</th>
                  <th className={adminTh}>Frais USD</th>
                  <th className={adminTh}>Frais CDF</th>
                  <th className={adminTh}>Dépenses USD</th>
                  <th className={adminTh}>Dépenses CDF</th>
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
                    <tr key={r.month} className={adminTr}>
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

      {reportView === "byFee" && mode === "daily" && dailyByFee ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(dailyByFee.totals.feesUSD, "USD")}</div>
            </div>
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(dailyByFee.totals.feesCDF, "CDF")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(dailyByFee.totals.expensesUSD, "USD")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(dailyByFee.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className={`${adminCard} mt-6 overflow-x-auto`}>
            <table className={adminTable}>
              <thead>
                <tr>
                  <th className={adminTh}>Date</th>
                  <th className={adminTh}>Code</th>
                  <th className={adminTh}>Frais / libellé</th>
                  <th className={adminTh}>Encaissements USD</th>
                  <th className={adminTh}>Encaissements CDF</th>
                  <th className={adminTh}>Dépenses USD</th>
                  <th className={adminTh}>Dépenses CDF</th>
                </tr>
              </thead>
              <tbody>
                {dailyByFee.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-zinc-600 dark:text-zinc-300">
                      Aucune donnée sur cette période.
                    </td>
                  </tr>
                ) : (
                  dailyByFee.items.map((r) => (
                    <tr key={`${r.day}-${r.feeId ?? "wallet"}`} className={adminTr}>
                      <td className="py-3 pr-3 whitespace-nowrap">{r.day}</td>
                      <td className="py-3 pr-3 font-mono text-sm">{r.feeCode}</td>
                      <td className="py-3 pr-3">{r.feeName}</td>
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
              Page {dailyByFee.page} sur {dailyByFee.pageCount} ({dailyByFee.total} lignes)
            </div>
            <div className="flex items-center gap-2">
              {dailyByFee.page > 1 ? (
                <button
                  type="button"
                  onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
                  className={adminGhostButton}
                >
                  Précédent
                </button>
              ) : null}
              {dailyByFee.page < dailyByFee.pageCount ? (
                <button
                  type="button"
                  onClick={() => setDailyPage((p) => p + 1)}
                  className={adminGhostButton}
                >
                  Suivant
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {reportView === "byFee" && mode === "monthly" && monthlyByFee ? (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyByFee.totals.feesUSD, "USD")}</div>
            </div>
            <div className={adminStatFees}>
              <div className="text-sm font-medium opacity-95">Frais (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyByFee.totals.feesCDF, "CDF")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (USD) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyByFee.totals.expensesUSD, "USD")}</div>
            </div>
            <div className={adminStatExpenses}>
              <div className="text-sm font-medium opacity-95">Dépenses (CDF) - total</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyByFee.totals.expensesCDF, "CDF")}</div>
            </div>
          </div>

          <div className={`${adminCard} mt-6 overflow-x-auto`}>
            <table className={adminTable}>
              <thead>
                <tr>
                  <th className={adminTh}>Mois</th>
                  <th className={adminTh}>Code</th>
                  <th className={adminTh}>Frais / libellé</th>
                  <th className={adminTh}>Encaissements USD</th>
                  <th className={adminTh}>Encaissements CDF</th>
                  <th className={adminTh}>Dépenses USD</th>
                  <th className={adminTh}>Dépenses CDF</th>
                </tr>
              </thead>
              <tbody>
                {monthlyByFee.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-zinc-600 dark:text-zinc-300">
                      Aucune donnée sur cette période.
                    </td>
                  </tr>
                ) : (
                  monthlyByFee.items.map((r) => (
                    <tr key={`${r.month}-${r.feeId ?? "wallet"}`} className={adminTr}>
                      <td className="py-3 pr-3 whitespace-nowrap">{formatMonthFR(r.month)}</td>
                      <td className="py-3 pr-3 font-mono text-sm">{r.feeCode}</td>
                      <td className="py-3 pr-3">{r.feeName}</td>
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

