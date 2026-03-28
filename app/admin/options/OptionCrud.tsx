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
} from "../components/admin-ui";

type Section = { id: number; codeSection: string; nameSection: string; school?: { name: string } | null };
type Option = { id: number; codeOption: string; nameOption: string; sectionId: number; section?: { codeSection: string; nameSection: string } | null };

export default function OptionCrud({
  initialSections,
  initialOptions,
}: {
  initialSections: Section[];
  initialOptions: Option[];
}) {
  const router = useRouter();
  const [sections] = useState(initialSections);
  const [options] = useState(initialOptions);

  const [create, setCreate] = useState({
    codeOption: "",
    nameOption: "",
    sectionId: initialSections[0]?.id ?? 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => options.find((o) => o.id === editingId) ?? null, [options, editingId]);

  const [update, setUpdate] = useState({
    codeOption: "",
    nameOption: "",
    sectionId: initialSections[0]?.id ?? 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(target: Option) {
    setUpdate({
      codeOption: target.codeOption,
      nameOption: target.nameOption,
      sectionId: target.sectionId,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeOption: create.codeOption,
          nameOption: create.nameOption,
          sectionId: create.sectionId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({
        codeOption: "",
        nameOption: "",
        sectionId: initialSections[0]?.id ?? 0,
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
      const res = await fetch(`/api/admin/options/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeOption: update.codeOption,
          nameOption: update.nameOption,
          sectionId: update.sectionId,
        }),
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
    const ok = window.confirm("Supprimer cette option ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/options/${id}`, { method: "DELETE" });
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
        <h2 className={adminSectionTitle}>Créer une option</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code option"
            className={adminInput}
            value={create.codeOption}
            onChange={(e) => setCreate((c) => ({ ...c, codeOption: e.target.value }))}
          />
          <input
            required
            placeholder="Nom de l’option"
            className={adminInput}
            value={create.nameOption}
            onChange={(e) => setCreate((c) => ({ ...c, nameOption: e.target.value }))}
          />
          <select
            required
            className={adminInput}
            value={create.sectionId}
            onChange={(e) => setCreate((c) => ({ ...c, sectionId: Number(e.target.value) }))}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codeSection} - {s.nameSection}
              </option>
            ))}
          </select>
          <button
            disabled={submitting || sections.length === 0}
            type="submit"
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Options existantes</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Section</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {options.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune option.
                  </td>
                </tr>
              ) : (
                options.map((o) => {
                  const sectionLabel = sections.find((s) => s.id === o.sectionId);
                  const label = sectionLabel ? `${sectionLabel.codeSection} - ${sectionLabel.nameSection}` : "-";
                  return (
                    <tr key={o.id} className={adminTr}>
                      <td className="py-3 pr-3 font-medium">{o.codeOption}</td>
                      <td className="py-3 pr-3">{o.nameOption}</td>
                      <td className="py-3 pr-3">{label}</td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(o.id);
                              resetUpdateFromEditing(o);
                            }}
                            className={adminGhostButton}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDelete(o.id)}
                            className={adminDangerButton}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {editing ? (
          <div className={adminNestedCard}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.codeOption}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code option"
                className={adminInput}
                value={update.codeOption}
                onChange={(e) => setUpdate((u) => ({ ...u, codeOption: e.target.value }))}
              />
              <input
                required
                placeholder="Nom de l’option"
                className={adminInput}
                value={update.nameOption}
                onChange={(e) => setUpdate((u) => ({ ...u, nameOption: e.target.value }))}
              />
              <select
                required
                className={adminInput}
                value={update.sectionId}
                onChange={(e) => setUpdate((u) => ({ ...u, sectionId: Number(e.target.value) }))}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codeSection} - {s.nameSection}
                  </option>
                ))}
              </select>

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

