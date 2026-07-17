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

type AcademicYearOpt = { id: number; name: string; isCurrent: boolean };
type FeeOpt = { id: number; code: string; name: string; feeLevels: { levelId: number }[] };
type StudentOpt = {
  id: number;
  label: string;
  matricule: string | null;
  schoolClass: { codeClass: string; levelId: number };
};
type ReductionRow = { feeId: number; reductionPercent: string };
type SupportRow = {
  id: number;
  studentId: number;
  academicYearId: number;
  note: string | null;
  studentLabel: string;
  matricule: string | null;
  reductions: { feeId: number; feeCode: string; feeName: string; reductionPercent: number }[];
};

function emptyReduction(fees: FeeOpt[]): ReductionRow {
  return { feeId: fees[0]?.id ?? 0, reductionPercent: "0" };
}

function parseApiError(data: unknown): string {
  if (typeof data === "object" && data && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string") return err;
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
    studentId: students[0]?.id ? String(students[0].id) : "",
    note: "",
    reductions: [emptyReduction(fees)] as ReductionRow[],
  });

  const [editForm, setEditForm] = useState({
    note: "",
    reductions: [] as ReductionRow[],
  });

  const filtered = useMemo(() => {
    if (!yearFilter) return initialSupports;
    return initialSupports.filter((s) => String(s.academicYearId) === yearFilter);
  }, [initialSupports, yearFilter]);

  const supportedStudentIds = useMemo(
    () => new Set(filtered.map((s) => s.studentId)),
    [filtered],
  );

  const availableStudents = useMemo(
    () => students.filter((s) => !supportedStudentIds.has(s.id)),
    [students, supportedStudentIds],
  );

  function feesForStudent(levelId: number) {
    return fees.filter((f) => f.feeLevels.some((fl) => fl.levelId === levelId));
  }

  function startEdit(row: SupportRow) {
    setEditingId(row.id);
    setEditForm({
      note: row.note ?? "",
      reductions: row.reductions.map((r) => ({
        feeId: r.feeId,
        reductionPercent: String(r.reductionPercent),
      })),
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
    setSubmitting(true);
    try {
      const reductions = createForm.reductions
        .filter((r) => r.feeId > 0)
        .map((r) => ({ feeId: r.feeId, reductionPercent: Number(r.reductionPercent) }));
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
        studentId: availableStudents[0]?.id ? String(availableStudents[0].id) : "",
        note: "",
        reductions: [emptyReduction(fees)],
      });
      await reloadYear();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!canWrite) return;
    setError(null);
    setSubmitting(true);
    try {
      const reductions = editForm.reductions
        .filter((r) => r.feeId > 0)
        .map((r) => ({ feeId: r.feeId, reductionPercent: Number(r.reductionPercent) }));
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
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1">
              <span className="mb-1 block text-xs text-zinc-500">Frais</span>
              <select
                className={adminInput}
                value={row.feeId}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...next[idx], feeId: Number(e.target.value) };
                  setRows(next);
                }}
              >
                {applicableFees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} — {f.name}
                  </option>
                ))}
              </select>
            </label>
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
          onClick={() => setRows([...rows, { feeId: applicableFees[0]?.id ?? 0, reductionPercent: "0" }])}
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
                <th className={adminTh}>Élève</th>
                <th className={adminTh}>Réductions</th>
                <th className={adminTh}>Note</th>
                {canWrite ? <th className={adminTh}>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 4 : 3} className={adminTableEmpty}>
                    Aucune prise en charge pour cette année.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <Fragment key={row.id}>
                    <tr className={adminTr}>
                      <td className={adminTd}>
                        <div className="font-medium">{row.studentLabel}</div>
                        {row.matricule ? (
                          <div className="text-xs text-zinc-500">{row.matricule}</div>
                        ) : null}
                      </td>
                      <td className={adminTd}>
                        <ul className="space-y-0.5 text-sm">
                          {row.reductions.map((r) => (
                            <li key={r.feeId}>
                              <span className="font-mono text-xs">{r.feeCode}</span> — {r.reductionPercent}%
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
                        <td colSpan={canWrite ? 4 : 3} className={adminTd}>
                          <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                            <div className={adminSectionTitle}>Modifier — {row.studentLabel}</div>
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
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Élève</span>
              <select
                className={adminInput}
                value={createForm.studentId}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    studentId: e.target.value,
                    reductions: [emptyReduction(fees)],
                  }))
                }
                required
              >
                {availableStudents.length === 0 ? (
                  <option value="">Aucun élève disponible</option>
                ) : (
                  availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))
                )}
              </select>
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
              disabled={submitting || !availableStudents.length || !yearFilter}
            >
              {submitting ? "Enregistrement…" : "Ajouter"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
