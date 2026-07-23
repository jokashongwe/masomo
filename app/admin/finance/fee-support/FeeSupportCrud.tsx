"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCrudLayout,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminPrimaryButton,
  adminSectionTitle,
  adminTable,
  adminTableEmpty,
  adminTableWrap,
  adminTd,
  adminTdActions,
  adminTh,
  adminThead,
  adminTr,
} from "../../components/admin-ui";
import { useClientSort } from "../../components/useClientSort";
import { SortableTh } from "../../components/SortableTh";

type AcademicYearOpt = { id: number; name: string; isCurrent: boolean };
type FeeOpt = { id: number; code: string; name: string; feeLevels: { levelId: number }[] };
type StudentOpt = {
  id: number;
  label: string;
  classLabel: string;
  matricule: string | null;
  firstName: string;
  name: string;
  postnom: string;
  schoolClass: { id: number; codeClass: string; levelId: number };
};
type ReductionMode = "PERCENT" | "FIXED_AMOUNT";
type ReductionRow = {
  feeId: number;
  mode: ReductionMode;
  reductionPercent: string;
  amountToPayUSD: string;
  amountToPayCDF: string;
};
type SupportReduction = {
  feeId: number;
  feeCode: string;
  feeName: string;
  mode: ReductionMode;
  reductionPercent: number | null;
  amountToPayUSD: number | null;
  amountToPayCDF: number | null;
  label: string;
};
type SupportRow = {
  id: number;
  studentId: number;
  academicYearId: number;
  note: string | null;
  studentLabel: string;
  classLabel: string;
  matricule: string | null;
  reductions: SupportReduction[];
};

function emptyReduction(_fees?: FeeOpt[]): ReductionRow {
  return {
    feeId: 0,
    mode: "PERCENT",
    reductionPercent: "0",
    amountToPayUSD: "",
    amountToPayCDF: "",
  };
}

function toApiReduction(r: ReductionRow) {
  if (r.mode === "PERCENT") {
    return {
      feeId: r.feeId,
      mode: "PERCENT" as const,
      reductionPercent: Number(r.reductionPercent),
    };
  }
  const usd = r.amountToPayUSD.trim() === "" ? null : Number(r.amountToPayUSD);
  const cdf = r.amountToPayCDF.trim() === "" ? null : Number(r.amountToPayCDF);
  return {
    feeId: r.feeId,
    mode: "FIXED_AMOUNT" as const,
    amountToPayUSD: usd,
    amountToPayCDF: cdf,
  };
}

function fromSupportReduction(r: SupportReduction): ReductionRow {
  return {
    feeId: r.feeId,
    mode: r.mode,
    reductionPercent: String(r.reductionPercent ?? 0),
    amountToPayUSD: r.amountToPayUSD != null ? String(r.amountToPayUSD) : "",
    amountToPayCDF: r.amountToPayCDF != null ? String(r.amountToPayCDF) : "",
  };
}

function parseApiError(data: unknown): string {
  if (typeof data === "object" && data && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err) {
      const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
      const parts = [
        ...(flat.formErrors ?? []),
        ...Object.values(flat.fieldErrors ?? {}).flat(),
      ].filter(Boolean);
      if (parts.length) return parts.join(" · ");
    }
  }
  return "Erreur";
}

export default function FeeSupportCrud({
  canWrite,
  academicYears,
  defaultAcademicYearId,
  selectedAcademicYearId,
  fees,
  students,
  initialSupports,
}: {
  canWrite: boolean;
  academicYears: AcademicYearOpt[];
  defaultAcademicYearId: number | null;
  selectedAcademicYearId: number | null;
  fees: FeeOpt[];
  students: StudentOpt[];
  initialSupports: SupportRow[];
}) {
  const router = useRouter();
  const [yearFilter, setYearFilter] = useState(
    selectedAcademicYearId != null
      ? String(selectedAcademicYearId)
      : defaultAcademicYearId != null
        ? String(defaultAcademicYearId)
        : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [createForm, setCreateForm] = useState({
    studentId: "",
    note: "",
    reductions: [emptyReduction()] as ReductionRow[],
  });

  const [editForm, setEditForm] = useState({
    note: "",
    reductions: [] as ReductionRow[],
  });

  const [studentQuery, setStudentQuery] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("");

  const filtered = useMemo(() => {
    if (!yearFilter) return initialSupports;
    return initialSupports.filter((s) => String(s.academicYearId) === yearFilter);
  }, [initialSupports, yearFilter]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(filtered, {
    defaultKey: "student",
    getters: {
      student: (r) => r.studentLabel,
      classLabel: (r) => r.classLabel,
      reductions: (r) => r.reductions.map((x) => `${x.feeCode} ${x.label}`).join(", "),
      note: (r) => r.note,
    },
  });

  const supportedStudentIds = useMemo(
    () => new Set(filtered.map((s) => s.studentId)),
    [filtered],
  );

  const classOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of students) {
      map.set(s.schoolClass.id, s.classLabel);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [students]);

  const availableStudents = useMemo(() => {
    const q = studentQuery.trim().toLocaleLowerCase("fr");
    return students.filter((s) => {
      if (supportedStudentIds.has(s.id)) return false;
      if (studentClassFilter && String(s.schoolClass.id) !== studentClassFilter) return false;
      if (!q) return true;
      const hay = [s.firstName, s.name, s.postnom, s.matricule ?? "", s.label, s.classLabel]
        .join(" ")
        .toLocaleLowerCase("fr");
      return hay.includes(q);
    });
  }, [students, supportedStudentIds, studentQuery, studentClassFilter]);

  function feesForStudent(levelId: number) {
    return fees.filter((f) => f.feeLevels.some((fl) => fl.levelId === levelId));
  }

  function selectStudent(studentId: string) {
    const student = students.find((s) => String(s.id) === studentId);
    const applicable = student ? feesForStudent(student.schoolClass.levelId) : [];
    setCreateForm({
      studentId,
      note: createForm.note,
      reductions: [
        {
          ...emptyReduction(),
          feeId: applicable[0]?.id ?? 0,
        },
      ],
    });
  }

  function startEdit(row: SupportRow) {
    setEditingId(row.id);
    setEditForm({
      note: row.note ?? "",
      reductions: row.reductions.map(fromSupportReduction),
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ note: "", reductions: [] });
  }

  async function reloadYear() {
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !yearFilter) return;
    setError(null);
    if (!createForm.studentId) {
      setError("Sélectionnez un élève");
      return;
    }
    const reductions = createForm.reductions.filter((r) => r.feeId > 0).map(toApiReduction);
    if (!reductions.length) {
      setError("Sélectionnez au moins un frais");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fee-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(createForm.studentId),
          academicYearId: Number(yearFilter),
          note: createForm.note,
          reductions,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(parseApiError(data));
        return;
      }
      setCreateForm({
        studentId: "",
        note: "",
        reductions: [emptyReduction()],
      });
      setStudentQuery("");
      setStudentClassFilter("");
      await reloadYear();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!canWrite) return;
    setError(null);
    const reductions = editForm.reductions.filter((r) => r.feeId > 0).map(toApiReduction);
    if (!reductions.length) {
      setError("Sélectionnez au moins un frais");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/fee-support/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: editForm.note, reductions }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(parseApiError(data));
        return;
      }
      cancelEdit();
      await reloadYear();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!canWrite) return;
    if (!window.confirm("Supprimer cette prise en charge ?")) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/fee-support/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(parseApiError(data));
        return;
      }
      if (editingId === id) cancelEdit();
      await reloadYear();
    } finally {
      setSubmitting(false);
    }
  }

  function renderReductionFields(
    rows: ReductionRow[],
    setRows: (rows: ReductionRow[]) => void,
    levelId: number | null,
  ) {
    const applicableFees = levelId != null ? feesForStudent(levelId) : fees;
    return (
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-xl border border-sky-100/80 bg-sky-50/40 p-3 dark:border-zinc-700 dark:bg-zinc-900/40"
          >
            <label className="min-w-[12rem] flex-1">
              <span className="mb-1 block text-xs text-zinc-500">Frais</span>
              <select
                className={adminInput}
                value={row.feeId || ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...next[idx], feeId: Number(e.target.value) || 0 };
                  setRows(next);
                }}
              >
                <option value="">Choisir un frais…</option>
                {applicableFees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[10rem]">
              <span className="mb-1 block text-xs text-zinc-500">Mode</span>
              <select
                className={adminInput}
                value={row.mode}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...next[idx], mode: e.target.value as ReductionMode };
                  setRows(next);
                }}
              >
                <option value="PERCENT">Pourcentage</option>
                <option value="FIXED_AMOUNT">Montant à payer</option>
              </select>
            </label>
            {row.mode === "PERCENT" ? (
              <label className="w-28">
                <span className="mb-1 block text-xs text-zinc-500">Réduction %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={adminInput}
                  value={row.reductionPercent}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], reductionPercent: e.target.value };
                    setRows(next);
                  }}
                />
              </label>
            ) : (
              <>
                <label className="w-32">
                  <span className="mb-1 block text-xs text-zinc-500">À payer USD</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInput}
                    value={row.amountToPayUSD}
                    placeholder="—"
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], amountToPayUSD: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <label className="w-32">
                  <span className="mb-1 block text-xs text-zinc-500">À payer CDF</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={adminInput}
                    value={row.amountToPayCDF}
                    placeholder="—"
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], amountToPayCDF: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
              </>
            )}
            {rows.length > 1 ? (
              <button
                type="button"
                className={adminGhostButton}
                onClick={() => setRows(rows.filter((_, i) => i !== idx))}
              >
                Retirer
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className={adminGhostButton}
          onClick={() => setRows([...rows, emptyReduction()])}
          disabled={!applicableFees.length}
        >
          + Frais
        </button>
      </div>
    );
  }

  const createStudent = students.find((s) => String(s.id) === createForm.studentId);
  const createLevelId = createStudent?.schoolClass.levelId ?? null;

  return (
    <div className={adminCrudLayout}>
      <div className={`${adminCard} space-y-4`}>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="mb-1 block text-xs text-zinc-500">Année scolaire</span>
            <select
              className={adminInput}
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                router.push(`/admin/finance/fee-support?year=${e.target.value}`);
              }}
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.isCurrent ? " (en cours)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <div className={adminErrorBox}>{error}</div> : null}

        <div className={adminSectionTitle}>Élèves en prise en charge</div>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <SortableTh column="student" label="Élève" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="classLabel" label="Classe" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="reductions" label="Réductions" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="note" label="Note" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                {canWrite ? <th className={adminTh}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 5 : 4} className={adminTableEmpty}>
                    Aucune prise en charge pour cette année.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <Fragment key={row.id}>
                    <tr className={adminTr}>
                      <td className={adminTd}>
                        <div className="font-medium">{row.studentLabel}</div>
                        {row.matricule ? (
                          <div className="text-xs text-zinc-500">{row.matricule}</div>
                        ) : null}
                      </td>
                      <td className={adminTd}>{row.classLabel}</td>
                      <td className={adminTd}>
                        <ul className="space-y-0.5 text-sm">
                          {row.reductions.map((r) => (
                            <li key={r.feeId}>
                              <span className="font-mono text-xs">{r.feeCode}</span> — {r.label}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className={adminTd}>{row.note ?? "—"}</td>
                      {canWrite ? (
                        <td className={adminTdActions}>
                          <button type="button" className={adminGhostButton} onClick={() => startEdit(row)}>
                            Modifier
                          </button>
                          <button
                            type="button"
                            className={adminDangerButton}
                            disabled={submitting}
                            onClick={() => handleDelete(row.id)}
                          >
                            Supprimer
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {editingId === row.id ? (
                      <tr className={adminTr}>
                        <td colSpan={canWrite ? 5 : 4} className={adminTd}>
                          <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                            <div className={adminSectionTitle}>
                              Modifier — {row.studentLabel}
                              <span className="mt-1 block text-sm font-normal text-zinc-600 dark:text-zinc-300">
                                Classe : {row.classLabel}
                              </span>
                            </div>
                            <label className="block">
                              <span className="mb-1 block text-xs text-zinc-500">Note</span>
                              <input
                                className={adminInput}
                                value={editForm.note}
                                onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                              />
                            </label>
                            {renderReductionFields(
                              editForm.reductions,
                              (reductions) => setEditForm((f) => ({ ...f, reductions })),
                              students.find((s) => s.id === row.studentId)?.schoolClass.levelId ?? null,
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={adminPrimaryButton}
                                disabled={submitting}
                                onClick={() => handleUpdate(row.id)}
                              >
                                Enregistrer
                              </button>
                              <button type="button" className={adminGhostButton} onClick={cancelEdit}>
                                Annuler
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canWrite ? (
        <div className={adminCard}>
          <div className={adminSectionTitle}>Nouvelle prise en charge</div>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">Rechercher (nom / matricule)</span>
                <input
                  className={adminInput}
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Ex. Dupont, MAT-…"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">Filtrer par classe</span>
                <select
                  className={adminInput}
                  value={studentClassFilter}
                  onChange={(e) => setStudentClassFilter(e.target.value)}
                >
                  <option value="">Toutes les classes</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Élève</span>
              <select
                className={adminInput}
                value={createForm.studentId}
                onChange={(e) => selectStudent(e.target.value)}
                required
              >
                <option value="">Choisir un élève…</option>
                {availableStudents.length === 0 ? (
                  <option value="" disabled>
                    Aucun élève trouvé
                  </option>
                ) : (
                  availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))
                )}
              </select>
              <span className="mt-1 block text-xs text-zinc-500">
                {availableStudents.length} élève{availableStudents.length > 1 ? "s" : ""} disponible
                {availableStudents.length > 1 ? "s" : ""}
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Note (optionnel)</span>
              <input
                className={adminInput}
                value={createForm.note}
                onChange={(e) => setCreateForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
            {renderReductionFields(
              createForm.reductions,
              (reductions) => setCreateForm((f) => ({ ...f, reductions })),
              createLevelId,
            )}
            <button
              type="submit"
              className={adminPrimaryButton}
              disabled={submitting || !createForm.studentId || !yearFilter}
            >
              {submitting ? "Enregistrement…" : "Ajouter"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
