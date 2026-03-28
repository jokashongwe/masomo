"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Level = {
  id: number;
  codeLevel: string;
  name: string;
  nextLevel: string | null;
  optionId: number;
  option?: { codeOption: string; nameOption: string; section?: { codeSection: string; nameSection: string; school?: { name: string } | null } | null } | null;
};

type SchoolClass = { id: number; codeClass: string; levelId: number };

export default function ClassCrud({
  initialLevels,
  initialClasses,
}: {
  initialLevels: Level[];
  initialClasses: SchoolClass[];
}) {
  const router = useRouter();
  const [levels] = useState(initialLevels);
  const [classes] = useState(initialClasses);

  const [create, setCreate] = useState({
    codeClass: "",
    levelId: initialLevels[0]?.id ?? 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => classes.find((c) => c.id === editingId) ?? null, [classes, editingId]);

  const [update, setUpdate] = useState({
    codeClass: "",
    levelId: initialLevels[0]?.id ?? 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function levelLabel(levelId: number) {
    const l = levels.find((x) => x.id === levelId);
    if (!l) return "-";
    const opt = l.option;
    if (!opt) return `${l.codeLevel} - ${l.name}`;
    const section = opt.section;
    const schoolName = section?.school?.name ?? "";
    const sectionLabel = section ? `${section.codeSection} - ${section.nameSection}` : "";
    return `${l.codeLevel} - ${l.name} | ${opt.codeOption} - ${opt.nameOption}${sectionLabel ? ` | ${sectionLabel}` : ""}${schoolName ? ` | ${schoolName}` : ""}`.replace(/\s+\|/g, " |").trim();
  }

  function resetUpdateFromEditing(target: SchoolClass) {
    setUpdate({
      codeClass: target.codeClass,
      levelId: target.levelId,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeClass: create.codeClass,
          levelId: create.levelId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({
        codeClass: "",
        levelId: initialLevels[0]?.id ?? 0,
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
      const res = await fetch(`/api/admin/classes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeClass: update.codeClass,
          levelId: update.levelId,
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
    const ok = window.confirm("Supprimer cette classe ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/classes/${id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Créer une classe</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code classe"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.codeClass}
            onChange={(e) => setCreate((c) => ({ ...c, codeClass: e.target.value }))}
          />
          <select
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.levelId}
            onChange={(e) => setCreate((c) => ({ ...c, levelId: Number(e.target.value) }))}
          >
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codeLevel} - {l.name}
              </option>
            ))}
          </select>
          <button
            disabled={submitting || levels.length === 0}
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Classes existantes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Niveau</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune classe.
                  </td>
                </tr>
              ) : (
                classes.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-3 font-medium">{c.codeClass}</td>
                    <td className="py-3 pr-3">{levelLabel(c.levelId)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            resetUpdateFromEditing(c);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(c.id)}
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
            <h3 className="font-semibold text-black dark:text-white">Modifier : {editing.codeClass}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code classe"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.codeClass}
                onChange={(e) => setUpdate((u) => ({ ...u, codeClass: e.target.value }))}
              />
              <select
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.levelId}
                onChange={(e) => setUpdate((u) => ({ ...u, levelId: Number(e.target.value) }))}
              >
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codeLevel} - {l.name}
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

