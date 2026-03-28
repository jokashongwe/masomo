"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: number; codeOption: string; nameOption: string; section?: { codeSection: string; nameSection: string; school?: { name: string } | null } | null };
type Level = { id: number; codeLevel: string; name: string; nextLevel: string | null; optionId: number };

export default function LevelCrud({
  initialOptions,
  initialLevels,
}: {
  initialOptions: Option[];
  initialLevels: Level[];
}) {
  const router = useRouter();
  const [options] = useState(initialOptions);
  const [levels] = useState(initialLevels);

  const [create, setCreate] = useState({
    codeLevel: "",
    name: "",
    nextLevel: "",
    optionId: initialOptions[0]?.id ?? 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => levels.find((l) => l.id === editingId) ?? null, [levels, editingId]);

  const [update, setUpdate] = useState({
    codeLevel: "",
    name: "",
    nextLevel: "",
    optionId: initialOptions[0]?.id ?? 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function optionLabel(optionId: number) {
    const o = options.find((x) => x.id === optionId);
    if (!o) return "-";
    const section = o.section;
    if (!section) return `${o.codeOption} - ${o.nameOption}`;
    return `${o.codeOption} - ${o.nameOption} | ${section.codeSection} - ${section.nameSection} | ${section.school?.name ?? ""}`.replace(/\s+\|/, " |").trim();
  }

  function resetUpdateFromEditing(target: Level) {
    setUpdate({
      codeLevel: target.codeLevel,
      name: target.name,
      nextLevel: target.nextLevel ?? "",
      optionId: target.optionId,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeLevel: create.codeLevel,
          name: create.name,
          nextLevel: create.nextLevel || "",
          optionId: create.optionId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({
        codeLevel: "",
        name: "",
        nextLevel: "",
        optionId: initialOptions[0]?.id ?? 0,
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
      const res = await fetch(`/api/admin/levels/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeLevel: update.codeLevel,
          name: update.name,
          nextLevel: update.nextLevel || "",
          optionId: update.optionId,
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
    const ok = window.confirm("Supprimer ce niveau ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/levels/${id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Créer un niveau</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code niveau"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.codeLevel}
            onChange={(e) => setCreate((c) => ({ ...c, codeLevel: e.target.value }))}
          />
          <input
            required
            placeholder="Nom"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            placeholder="Niveau suivant (optionnel)"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.nextLevel}
            onChange={(e) => setCreate((c) => ({ ...c, nextLevel: e.target.value }))}
          />
          <select
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.optionId}
            onChange={(e) => setCreate((c) => ({ ...c, optionId: Number(e.target.value) }))}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codeOption} - {o.nameOption}
              </option>
            ))}
          </select>
          <button
            disabled={submitting || options.length === 0}
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Niveaux existants</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Option</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {levels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucun niveau.
                  </td>
                </tr>
              ) : (
                levels.map((l) => (
                  <tr key={l.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-3 font-medium">{l.codeLevel}</td>
                    <td className="py-3 pr-3">{l.name}</td>
                    <td className="py-3 pr-3">{optionLabel(l.optionId)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(l.id);
                            resetUpdateFromEditing(l);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(l.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
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
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-black dark:text-white">Modifier : {editing.codeLevel}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code niveau"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.codeLevel}
                onChange={(e) => setUpdate((u) => ({ ...u, codeLevel: e.target.value }))}
              />
              <input
                required
                placeholder="Nom"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <input
                placeholder="Niveau suivant (optionnel)"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.nextLevel}
                onChange={(e) => setUpdate((u) => ({ ...u, nextLevel: e.target.value }))}
              />
              <select
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.optionId}
                onChange={(e) => setUpdate((u) => ({ ...u, optionId: Number(e.target.value) }))}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.codeOption} - {o.nameOption}
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

