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
  adminTh,
  adminTitle,
  adminTr,
  adminThead,
  adminTd,
  adminTdMuted,
  adminTableWrap,
} from "../../components/admin-ui";

type SectionRow = { id: number; codeSection: string; nameSection: string };
type OptionRow = { id: number; codeOption: string; nameOption: string; sectionId: number };
type ClassRow = {
  id: number;
  codeClass: string;
  optionId: number;
  sectionId: number;
  label: string;
};

type ModuleRow = {
  id: number;
  name: string;
  tranches: { id: number; codeTranche: string }[];
};

type ReportRow = {
  studentId: number;
  displayName: string;
  classLabel: string;
  paid: number;
  due: number;
  balance: number;
  status: "EN_ORDRE" | "PAS_EN_ORDRE";
  statusLabel: string;
};

type ReportResponse = {
  academicYearName: string | null;
  moduleName: string | null;
  trancheCode: string | null;
  scopeLabel: string;
  currency: "USD" | "CDF";
  rows: ReportRow[];
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

export default function EcoleReportClient() {
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [sectionId, setSectionId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [classId, setClassId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [trancheId, setTrancheId] = useState("");

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const optionChoices = useMemo(() => {
    if (!sectionId) return options;
    const sid = Number(sectionId);
    return options.filter((o) => o.sectionId === sid);
  }, [sectionId, options]);

  const classChoices = useMemo(() => {
    let list = classes;
    if (sectionId) list = list.filter((c) => c.sectionId === Number(sectionId));
    if (optionId) list = list.filter((c) => c.optionId === Number(optionId));
    return list;
  }, [classes, sectionId, optionId]);

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
        const [filtRes, modRes] = await Promise.all([
          fetch("/api/admin/reports/school-filters"),
          fetch("/api/admin/finance/modules"),
        ]);
        const filtData = await filtRes.json().catch(() => null);
        const modData = await modRes.json().catch(() => null);
        if (!filtRes.ok) throw new Error(filtData?.error ?? "Impossible de charger les filtres");
        if (!modRes.ok) throw new Error(modData?.error ?? "Impossible de charger les modules");
        if (!cancelled) {
          setSections(Array.isArray(filtData?.sections) ? filtData.sections : []);
          setOptions(Array.isArray(filtData?.options) ? filtData.options : []);
          setClasses(Array.isArray(filtData?.classes) ? filtData.classes : []);
          setModules(Array.isArray(modData?.modules) ? modData.modules : []);
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
    if (!sectionId) return;
    const sid = Number(sectionId);
    if (optionId) {
      const o = options.find((x) => x.id === Number(optionId));
      if (!o || o.sectionId !== sid) setOptionId("");
    }
  }, [sectionId, optionId, options]);

  useEffect(() => {
    if (!optionId) return;
    const oid = Number(optionId);
    if (classId) {
      const c = classes.find((x) => x.id === Number(classId));
      if (!c || c.optionId !== oid) setClassId("");
    }
  }, [optionId, classId, classes]);

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
  }, [currency, sectionId, optionId, classId, moduleId, trancheId, pageSize]);

  const fetchReport = useCallback(async () => {
    if (!moduleId) {
      setReportError("Choisissez un module de facturation.");
      setReport(null);
      return;
    }
    setLoadingReport(true);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      params.set("currency", currency);
      params.set("moduleId", moduleId);
      if (trancheId) params.set("trancheId", trancheId);
      if (sectionId) params.set("sectionId", sectionId);
      if (optionId) params.set("optionId", optionId);
      if (classId) params.set("classId", classId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/reports/school-module-status?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Erreur lors du chargement du rapport");
      setReport(data);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Erreur inconnue");
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [currency, moduleId, trancheId, sectionId, optionId, classId, page, pageSize]);

  useEffect(() => {
    if (loadingMeta || !moduleId) return;
    fetchReport();
  }, [loadingMeta, moduleId, page, pageSize, currency, trancheId, sectionId, optionId, classId, fetchReport]);

  async function exportCsv() {
    if (!moduleId) return;
    setReportError(null);
    try {
      const params = new URLSearchParams();
      params.set("currency", currency);
      params.set("moduleId", moduleId);
      params.set("all", "1");
      if (trancheId) params.set("trancheId", trancheId);
      if (sectionId) params.set("sectionId", sectionId);
      if (optionId) params.set("optionId", optionId);
      if (classId) params.set("classId", classId);

      const res = await fetch(`/api/admin/reports/school-module-status?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Export impossible");
      const rows = data?.rows as ReportRow[] | undefined;
      const cur = data?.currency as "USD" | "CDF" | undefined;
      if (!rows?.length) {
        setReportError("Aucune ligne à exporter.");
        return;
      }
      const sep = ";";
      const head = [
        "Nom de l'élève",
        "Classe",
        `Payé (${cur ?? currency})`,
        `Dû (${cur ?? currency})`,
        `Solde restant (${cur ?? currency})`,
        "Statut",
      ];
      const lines = [
        head.join(sep),
        ...rows.map((r) =>
          [
            `"${r.displayName.replace(/"/g, '""')}"`,
            `"${r.classLabel.replace(/"/g, '""')}"`,
            String(r.paid).replace(".", ","),
            String(r.due).replace(".", ","),
            String(r.balance).replace(".", ","),
            r.statusLabel,
          ].join(sep),
        ),
      ];
      const modName = (data?.moduleName as string | null) ?? "module";
      const name = `paiements-ecole-${modName}-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(name, lines.join("\r\n"));
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Erreur d’export");
    }
  }

  return (
    <div className={adminPage}>
      <header className={adminHeaderRow}>
        <div>
          <p className={adminKicker}>Finances</p>
          <h1 className={`mt-1 ${adminTitle}`}>Rapport école — modules & soldes</h1>
          <p className={adminSubtitle}>
            Vue de tous les élèves de l’année en cours, avec filtres par section, option et classe. Choisissez un module
            (et éventuellement une tranche) : le tableau compare le dû configuré pour les frais par module aux paiements
            imputés, calcule le solde et indique si l’élève est en ordre.
          </p>
        </div>
        <Link href="/admin/reports" className={adminBackLink}>
          Rapports — synthèse
        </Link>
      </header>

      <div className={`${adminCard} mt-6`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Section</label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setOptionId("");
                setClassId("");
              }}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
            >
              <option value="">Toutes</option>
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.codeSection} — {s.nameSection}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Option</label>
            <select
              value={optionId}
              onChange={(e) => {
                setOptionId(e.target.value);
                setClassId("");
              }}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
            >
              <option value="">Toutes</option>
              {optionChoices.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.codeOption} — {o.nameOption}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Classe</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
            >
              <option value="">Toutes</option>
              {classChoices.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Module *</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta}
              required
            >
              <option value="">— Sélectionner —</option>
              {modules.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tranche (optionnel)</label>
            <select
              value={trancheId}
              onChange={(e) => setTrancheId(e.target.value)}
              className={`mt-2 ${adminInput}`}
              disabled={loadingMeta || !moduleId || trancheOptions.length === 0}
            >
              <option value="">
                {!moduleId
                  ? "— Choisir un module —"
                  : trancheOptions.length === 0
                    ? "Pas de tranches"
                    : "Tout le module (toutes les tranches)"}
              </option>
              {trancheOptions.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.codeTranche}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => fetchReport()}
            disabled={loadingMeta || !moduleId}
            className={adminPrimaryButton}
          >
            Actualiser
          </button>
          <button type="button" onClick={() => exportCsv()} disabled={!moduleId} className={adminSecondaryButton}>
            Exporter CSV (tout)
          </button>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <label htmlFor="ecole-page-size">Lignes / page</label>
            <select
              id="ecole-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`${adminInput} w-auto min-w-[4.5rem] py-2`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        {metaError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{metaError}</p> : null}
      </div>

      {reportError ? <div className={`${adminErrorBox} mt-4`}>{reportError}</div> : null}
      {loadingReport && !reportError ? (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Chargement...</div>
      ) : null}

      {report && report.academicYearName ? (
        <div className="mt-4 space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
          <p>
            <span className="font-semibold">Année :</span> {report.academicYearName}
          </p>
          <p>
            <span className="font-semibold">Périmètre :</span> {report.scopeLabel}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Uniquement les frais de type « par module » (BY_MODULE). Les montants dus suivent la grille enregistrée pour la
            devise sélectionnée.
          </p>
        </div>
      ) : null}

      {report && !report.academicYearName ? (
        <div className={`${adminCard} mt-6`}>Aucune année scolaire en cours.</div>
      ) : null}

      {report && (report.total ?? 0) > 0 ? (
        <>
          <div className={`${adminCard} mt-6`}>
            <div className={adminTableWrap}>
            <table className={adminTable}>
              <thead className={adminThead}>
                <tr>
                  <th className={adminTh}>Nom de l&apos;élève</th>
                  <th className={adminTh}>Classe</th>
                  <th className={adminTh}>Payé ({report.currency})</th>
                  <th className={adminTh}>Dû</th>
                  <th className={adminTh}>Solde restant</th>
                  <th className={adminTh}>Situation</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.studentId} className={adminTr}>
                    <td className={adminTd}>{r.displayName}</td>
                    <td className={adminTdMuted}>{r.classLabel}</td>
                    <td className={adminTd}>{formatCurrency(r.paid, report.currency)}</td>
                    <td className={adminTd}>{formatCurrency(r.due, report.currency)}</td>
                    <td className={adminTd}>{formatCurrency(r.balance, report.currency)}</td>
                    <td className={adminTd}>
                      <span
                        className={
                          r.status === "EN_ORDRE"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        }
                      >
                        {r.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Page {report.page} sur {report.pageCount} ({report.total} élève{report.total > 1 ? "s" : ""})
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
        <div className={`${adminCard} mt-6`}>
          Aucun élève ne correspond aux filtres, ou aucun montant dû pour ce module dans cette devise.
        </div>
      ) : null}
    </div>
  );
}
