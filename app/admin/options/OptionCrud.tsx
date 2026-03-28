"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Créer une option</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code option"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.codeOption}
            onChange={(e) => setCreate((c) => ({ ...c, codeOption: e.target.value }))}
          />
          <input
            required
            placeholder="Nom de l’option"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.nameOption}
            onChange={(e) => setCreate((c) => ({ ...c, nameOption: e.target.value }))}
          />
          <select
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
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
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Options existantes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Section</th>
                <th className="py-2 pr-3">Actions</th>
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
                    <tr key={o.id} className="border-t border-zinc-200 dark:border-zinc-800">
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
                            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDelete(o.id)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
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
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-black dark:text-white">Modifier : {editing.codeOption}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code option"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.codeOption}
                onChange={(e) => setUpdate((u) => ({ ...u, codeOption: e.target.value }))}
              />
              <input
                required
                placeholder="Nom de l’option"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.nameOption}
                onChange={(e) => setUpdate((u) => ({ ...u, nameOption: e.target.value }))}
              />
              <select
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
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
                  className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div> : null}
      </div>
    </div>
  );
}

