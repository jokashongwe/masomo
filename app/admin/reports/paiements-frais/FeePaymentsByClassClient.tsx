"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  adminSecondaryButton,
  adminSubtitle,
  adminTable,
  adminTitle,
  adminTr,
  adminThead,
  adminTd,
  adminTdMuted,
  adminTableWrap,
} from "../../components/admin-ui";
import { SortableTh } from "../../components/SortableTh";
import { useClientSort } from "../../components/useClientSort";

type ModuleRow = {
  id: number;
  name: string;
  tranches: { id: number; codeTranche: string }[];
};

type FeeOption = { id: number; code: string; name: string };

type FlatRow = {
  studentId: number;
  displayName: string;
  classId: number;
  classLabel: string;
  paid: number;
};

type ReportResponse = {
  academicYearName: string | null;
  rows: FlatRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function formatCurrency(n: number, currency: "USD" | "CDF") {
  try {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ` ${currency}`;
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FeePaymentsByClassClient() {
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [feeId, setFeeId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [trancheId, setTrancheId] = useState<string>("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [fees, setFees] = useState<FeeOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const selectedModule = useMemo(() => {
    const id = Number(moduleId);
    return Number.isFinite(id) && id > 0 ? modules.find((m) => m.id === id) : undefined;
  }, [moduleId, modules]);

  const trancheOptions = selectedModule?.tranches ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMeta(true);
      setMetaError(null);
      try {
        const [modRes, feeRes] = await Promise.all([
          fetch("/api/admin/finance/modules"),
          fetch("/api/admin/finance/fees"),
        ]);
        const modData = await modRes.json().catch(() => null);
        const feeData = await feeRes.json().catch(() => null);
        if (!modRes.ok) throw new Error(modData?.error ?? "Impossible de charger les modules");
        if (!feeRes.ok) throw new Error(feeData?.error ?? "Impossible de charger les frais");
        if (!cancelled) {
          setModules(Array.isArray(modData?.modules) ? modData.modules : []);
          const rawFees = Array.isArray(feeData?.fees) ? feeData.fees : [];
          setFees(
            rawFees.map((f: { id: number; code: string; name: string }) => ({
              id: f.id,
              code: f.code,
              name: f.name,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) setMetaError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!moduleId) setTrancheId("");
    else {
      const tid = Number(trancheId);
      const ok = trancheOptions.some((t) => t.id === tid);
      if (!ok) setTrancheId("");
    }
  }, [moduleId, trancheId, trancheOptions]);

  useEffect(() => {
    setPage(1);
  }, [currency, feeId, moduleId, trancheId, pageSize]);

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      params.set("currency", currency);
      if (feeId) params.set("feeId", feeId);
      if (trancheId) params.set("trancheId", trancheId);
      else if (moduleId) params.set("moduleId", moduleId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/reports/fee-payments-by-class?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setReport(data);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Erreur inconnue");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [currency, feeId, moduleId, trancheId, page, pageSize]);

  useEffect(() => {
    if (loadingMeta) return;
    fetchReport();
  }, [loadingMeta, fetchReport]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(report?.rows ?? [], {
    defaultKey: "displayName",
    getters: {
      displayName: (r) => r.displayName,
      classLabel: (r) => r.classLabel,
      paid: (r) => r.paid,
    },
  });

  async function exportCsv() {
    setReportError(null);
    try {
      const params = new URLSearchParams();
      params.set("currency", currency);
      params.set("all", "1");
      if (feeId) params.set("feeId", feeId);
      if (trancheId) params.set("trancheId", trancheId);
      else if (moduleId) params.set("moduleId", moduleId);

      const res = await fetch(`/api/admin/reports/fee-payments-by-class?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Export impossible");
      const rows = data?.rows as FlatRow[] | undefined;
      const cur = currency;
      if (!rows?.length) {
        setReportError("Aucune ligne à exporter.");
        return;
      }
      const sep = ";";
      const head = ["Nom de l'élève", "Classe", `Montant payé (${cur})`];
      const lines = [
        head.join(sep),
        ...rows.map((r) =>
          [
            `"${r.displayName.replace(/"/g, '""')}"`,
            `"${r.classLabel.replace(/"/g, '""')}"`,
            String(r.paid).replace(".", ","),
          ].join(sep),
        ),
      ];
      downloadCsv(`paiements-par-classe-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\r\n"));
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Erreur d’export");
    }
  }

  return (
    <div className={adminPage}>
      <header className={adminHeaderRow}>
        <div>
          <p className={adminKicker}>Finances</p>
          <h1 className={`mt-1 ${adminTitle}`}>Paiements des frais par classe</h1>
          <p className={adminSubtitle}>
            Montants imputés aux modules et tranches (lignes de répartition des paiements), pour l’année scolaire en cours.
            Filtre optionnel par type de frais. Table paginée ; l’export CSV inclut toutes les lignes correspondant aux filtres.
          </p>
        </div>
        <Link href="/admin/reports" className={adminBackLink}>
          Rapports — synthèse
        </Link>
      </header>

      <div className={`${adminCard} mt-6`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Devise</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "CDF")}
              className={`mt-2 ${adminInput}`}
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Type de frais</label>
            <select
              value={feeId}
              onChange={(e) => setFeeId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
            >
              <option value="">Tous les frais</option>
              {fees.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.code} — {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Module</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
            >
              <option value="">Tous les modules</option>
              {modules.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tranche</label>
            <select
              value={trancheId}
              onChange={(e) => setTrancheId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta || !moduleId || trancheOptions.length === 0}
            >
              <option value="">
                {!moduleId ? "— Choisir un module —" : trancheOptions.length === 0 ? "Aucune tranche" : "Toutes les tranches du module"}
              </option>
              {trancheOptions.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.codeTranche}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Lignes / page</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`mt-2 ${adminInput}`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fetchReport()} disabled={loadingMeta} className={adminPrimaryButton}>
            Actualiser
          </button>
          <button type="button" onClick={() => exportCsv()} className={adminSecondaryButton}>
            Exporter CSV (tout)
          </button>
        </div>
        {metaError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{metaError}</p> : null}
      </div>

      {reportError ? <div className={`${adminErrorBox} mt-4`}>{reportError}</div> : null}
      {loadingReport && !reportError ? (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement...</div>
      ) : null}

      {report && !report.academicYearName ? (
        <div className={`${adminCard} mt-6`}>Aucune année scolaire en cours.</div>
      ) : null}

      {report?.academicYearName ? (
        <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">Année : {report.academicYearName}</p>
      ) : null}

      {report && (report.total ?? 0) > 0 ? (
        <>
          <div className={`${adminCard} mt-6`}>
            <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead className={adminThead}>
                <tr>
                  <SortableTh column="displayName" label="Élève" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh column="classLabel" label="Classe" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh column="paid" label={`Montant payé (${currency})`} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={`${r.classId}-${r.studentId}`} className={adminTr}>
                    <td className={adminTd}>{r.displayName}</td>
                    <td className={adminTdMuted}>{r.classLabel}</td>
                    <td className={adminTd}>{formatCurrency(r.paid, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Page {report.page} sur {report.pageCount} ({report.total} ligne{report.total > 1 ? "s" : ""})
            </div>
            <div className="flex items-center gap-2">
              {report.page > 1 ? (
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className={adminGhostButton}>
                  Précédent
                </button>
              ) : null}
              {report.page < report.pageCount ? (
                <button type="button" onClick={() => setPage((p) => p + 1)} className={adminGhostButton}>
                  Suivant
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {report && report.academicYearName && (report.total ?? 0) === 0 && !loadingReport ? (
        <div className={`${adminCard} mt-6`}>Aucune ligne sur cette période / ces filtres.</div>
      ) : null}
    </div>
  );
}
