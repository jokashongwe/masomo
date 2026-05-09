"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminBackLink,
  adminCard,
  adminErrorBox,
  adminHeaderRow,
  adminInput,
  adminKicker,
  adminPage,
  adminPrimaryButton,
  adminSubtitle,
  adminTable,
  adminTh,
  adminTitle,
  adminTr,
} from "../../components/admin-ui";

type ModuleRow = {
  id: number;
  name: string;
  tranches: { id: number; codeTranche: string }[];
};

type FeeOption = { id: number; code: string; name: string };

type ReportResponse = {
  academicYearName: string | null;
  classes: {
    classId: number;
    label: string;
    students: { studentId: number; displayName: string; paid: number }[];
    subtotalPaid: number;
  }[];
};

function formatCurrency(n: number, currency: "USD" | "CDF") {
  try {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ` ${currency}`;
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export default function FeePaymentsByClassClient() {
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [feeId, setFeeId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [trancheId, setTrancheId] = useState<string>("");

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

  const fetchReport = useCallback(async () => {
    setLoadingReport(true);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      params.set("currency", currency);
      if (feeId) params.set("feeId", feeId);
      if (trancheId) params.set("trancheId", trancheId);
      else if (moduleId) params.set("moduleId", moduleId);

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
  }, [currency, feeId, moduleId, trancheId]);

  useEffect(() => {
    if (loadingMeta) return;
    fetchReport();
  }, [loadingMeta, fetchReport]);

  return (
    <div className={adminPage}>
      <header className={adminHeaderRow}>
        <div>
          <p className={adminKicker}>Finances</p>
          <h1 className={`mt-1 ${adminTitle}`}>Paiements des frais par classe</h1>
          <p className={adminSubtitle}>
            Montants imputés aux modules et tranches (lignes de répartition des paiements), pour l’année scolaire en cours.
            Filtre optionnel par type de frais. Les élèves sont regroupés par classe, triés par montant payé (décroissant) dans la devise choisie.
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
          <div className="flex items-end">
            <button type="button" onClick={() => fetchReport()} className={`${adminPrimaryButton} w-full sm:w-auto`}>
              Actualiser
            </button>
          </div>
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

      {report?.classes.map((grp) => (
        <div key={grp.classId} className={`${adminCard} mt-6 overflow-x-auto`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">{grp.label}</h2>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Sous-total : {formatCurrency(grp.subtotalPaid, currency)}
            </span>
          </div>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Élève</th>
                <th className={adminTh}>Montant payé ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {grp.students.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucun élève inscrit dans cette classe pour l’année en cours.
                  </td>
                </tr>
              ) : (
                grp.students.map((s) => (
                  <tr key={s.studentId} className={adminTr}>
                    <td className="py-3 pr-3">{s.displayName}</td>
                    <td className="py-3 pr-3">{formatCurrency(s.paid, currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}

      {report && report.classes.length === 0 && report.academicYearName ? (
        <div className={`${adminCard} mt-6`}>Aucune classe avec des inscriptions pour cette année.</div>
      ) : null}
    </div>
  );
}
