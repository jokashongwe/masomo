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

type ModuleTranche = {
  id: number;
  codeTranche: string;
  moduleId: number;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
};
type BillingModule = {
  id: number;
  name: string;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
  tranches: ModuleTranche[];
};

function fmtDM(day: number, month: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export default function ModulesCrud({ initialModules }: { initialModules: BillingModule[] }) {
  const router = useRouter();
  const [modules] = useState(initialModules);

  const [create, setCreate] = useState({
    name: "",
    startDay: 1,
    startMonth: 1,
    endDay: 1,
    endMonth: 1,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => modules.find((m) => m.id === editingId) ?? null, [modules, editingId]);

  const [update, setUpdate] = useState({
    name: "",
    startDay: 1,
    startMonth: 1,
    endDay: 1,
    endMonth: 1,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(target: BillingModule) {
    setUpdate({
      name: target.name,
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
      const res = await fetch("/api/admin/finance/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({ name: "", startDay: 1, startMonth: 1, endDay: 1, endMonth: 1 });
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
      const res = await fetch(`/api/admin/finance/modules/${editing.id}`, {
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
    const ok = window.confirm("Supprimer ce module ? (cela supprimera aussi ses tranches)");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/modules/${id}`, { method: "DELETE" });
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
        <h2 className={adminSectionTitle}>Créer un module</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Nom du module"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-zinc-600 dark:text-zinc-300">Début (JJ/MM)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={adminInput}
                  value={create.startDay}
                  onChange={(e) => setCreate((c) => ({ ...c, startDay: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={adminInput}
                  value={create.startMonth}
                  onChange={(e) => setCreate((c) => ({ ...c, startMonth: Number(e.target.value) }))}
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
                  value={create.endDay}
                  onChange={(e) => setCreate((c) => ({ ...c, endDay: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={adminInput}
                  value={create.endMonth}
                  onChange={(e) => setCreate((c) => ({ ...c, endMonth: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <button
            disabled={submitting}
            type="submit"
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Modules existants</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Période</th>
                <th className={adminTh}>Tranches</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucun module.
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr key={m.id} className={adminTr}>
                    <td className="py-3 pr-3 font-medium">{m.name}</td>
                    <td className="py-3 pr-3">
                      {fmtDM(m.startDay, m.startMonth)} → {fmtDM(m.endDay, m.endMonth)}
                    </td>
                    <td className="py-3 pr-3">
                      {m.tranches.length > 0
                        ? m.tranches
                            .map((t) => `${t.codeTranche} (${fmtDM(t.startDay, t.startMonth)}→${fmtDM(t.endDay, t.endMonth)})`)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            resetUpdateFromEditing(m);
                          }}
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(m.id)}
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.name}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Nom du module"
                className={adminInput}
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Début (JJ/MM)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className={adminInput}
                      value={update.startDay}
                      onChange={(e) => setUpdate((u) => ({ ...u, startDay: Number(e.target.value) }))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={adminInput}
                      value={update.startMonth}
                      onChange={(e) => setUpdate((u) => ({ ...u, startMonth: Number(e.target.value) }))}
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
                      value={update.endDay}
                      onChange={(e) => setUpdate((u) => ({ ...u, endDay: Number(e.target.value) }))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={adminInput}
                      value={update.endMonth}
                      onChange={(e) => setUpdate((u) => ({ ...u, endMonth: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

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

