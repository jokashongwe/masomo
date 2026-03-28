"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCardGrid,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminNestedCard,
  adminPrimaryButton,
  adminPrimaryButtonBlock,
  adminSecondaryButton,
  adminSectionTitle,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
} from "../../components/admin-ui";

type BillingModule = { id: number; name: string; startDay: number; startMonth: number; endDay: number; endMonth: number };
type ModuleTranche = {
  id: number;
  codeTranche: string;
  moduleId: number;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
};

type TrancheFormState = {
  codeTranche: string;
  moduleId: number;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
};

function fmtDM(day: number, month: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function datesFromModule(m: BillingModule | undefined) {
  if (!m) return { startDay: 1, startMonth: 1, endDay: 1, endMonth: 1 };
  return {
    startDay: m.startDay,
    startMonth: m.startMonth,
    endDay: m.endDay,
    endMonth: m.endMonth,
  };
}

function ModuleAndPeriodFields({
  modules,
  values,
  setValues,
  moduleLabel,
}: {
  modules: BillingModule[];
  values: Pick<TrancheFormState, "moduleId" | "startDay" | "startMonth" | "endDay" | "endMonth">;
  setValues: React.Dispatch<React.SetStateAction<TrancheFormState>>;
  moduleLabel: (moduleId: number) => string;
}) {
  return (
    <>
      <select
        required
        className={adminInput}
        value={values.moduleId}
        onChange={(e) => {
          const id = Number(e.target.value);
          const m = modules.find((x) => x.id === id);
          setValues((prev) => ({ ...prev, moduleId: id, ...datesFromModule(m) }));
        }}
      >
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {moduleLabel(m.id)}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Début (JJ/MM)</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={31}
              className={adminInput}
              value={values.startDay}
              onChange={(e) => setValues((p) => ({ ...p, startDay: Number(e.target.value) }))}
            />
            <input
              type="number"
              min={1}
              max={12}
              className={adminInput}
              value={values.startMonth}
              onChange={(e) => setValues((p) => ({ ...p, startMonth: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Fin (JJ/MM)</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              max={31}
              className={adminInput}
              value={values.endDay}
              onChange={(e) => setValues((p) => ({ ...p, endDay: Number(e.target.value) }))}
            />
            <input
              type="number"
              min={1}
              max={12}
              className={adminInput}
              value={values.endMonth}
              onChange={(e) => setValues((p) => ({ ...p, endMonth: Number(e.target.value) }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function TranchesCrud({
  initialModules,
  initialTranches,
}: {
  initialModules: BillingModule[];
  initialTranches: (ModuleTranche & { module?: BillingModule | null })[];
}) {
  const router = useRouter();
  const [modules] = useState(initialModules);
  const [tranches] = useState(initialTranches);

  const firstMod = initialModules[0];
  const [create, setCreate] = useState<TrancheFormState>({
    codeTranche: "",
    moduleId: firstMod?.id ?? 0,
    ...datesFromModule(firstMod),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => tranches.find((t) => t.id === editingId) ?? null, [tranches, editingId]);

  const [update, setUpdate] = useState<TrancheFormState>({
    codeTranche: "",
    moduleId: firstMod?.id ?? 0,
    startDay: 1,
    startMonth: 1,
    endDay: 1,
    endMonth: 1,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function moduleLabel(moduleId: number) {
    const m = modules.find((x) => x.id === moduleId);
    if (!m) return "-";
    return `${m.name} (${fmtDM(m.startDay, m.startMonth)} → ${fmtDM(m.endDay, m.endMonth)})`;
  }

  function resetUpdateFromEditing(target: ModuleTranche) {
    setUpdate({
      codeTranche: target.codeTranche,
      moduleId: target.moduleId,
      startDay: target.startDay,
      startMonth: target.startMonth,
      endDay: target.endDay,
      endMonth: target.endMonth,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/tranches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({
        codeTranche: "",
        moduleId: firstMod?.id ?? 0,
        ...datesFromModule(firstMod),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/tranches/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de mise à jour");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    const ok = window.confirm("Supprimer cette tranche ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/tranches/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de suppression");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer une tranche</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code tranche"
            className={adminInput}
            value={create.codeTranche}
            onChange={(e) => setCreate((c) => ({ ...c, codeTranche: e.target.value }))}
          />
          <ModuleAndPeriodFields
            modules={modules}
            values={create}
            setValues={setCreate}
            moduleLabel={moduleLabel}
          />
          <button
            disabled={submitting || modules.length === 0}
            type="submit"
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Tranches existantes</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Période</th>
                <th className={adminTh}>Module</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tranches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune tranche.
                  </td>
                </tr>
              ) : (
                tranches.map((t) => (
                  <tr key={t.id} className={adminTr}>
                    <td className="py-3 pr-3 font-medium">{t.codeTranche}</td>
                    <td className="py-3 pr-3">
                      {fmtDM(t.startDay, t.startMonth)} → {fmtDM(t.endDay, t.endMonth)}
                    </td>
                    <td className="py-3 pr-3">{moduleLabel(t.moduleId)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(t.id);
                            resetUpdateFromEditing(t);
                          }}
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(t.id)}
                          className={adminDangerButton}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing ? (
          <div className={adminNestedCard}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.codeTranche}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code tranche"
                className={adminInput}
                value={update.codeTranche}
                onChange={(e) => setUpdate((u) => ({ ...u, codeTranche: e.target.value }))}
              />
              <ModuleAndPeriodFields
                modules={modules}
                values={update}
                setValues={setUpdate}
                moduleLabel={moduleLabel}
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={adminPrimaryButton}
                >
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingId(null)}
                  className={adminSecondaryButton}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? <div className={adminErrorBox}>{error}</div> : null}
      </div>
    </div>
  );
}
