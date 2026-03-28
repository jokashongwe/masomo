"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type School = { id: number; name: string };
type Section = {
  id: number;
  codeSection: string;
  nameSection: string;
  schoolId: number;
  school?: { name: string } | null;
};

export default function SectionCrud({
  initialSchools,
  initialSections,
}: {
  initialSchools: School[];
  initialSections: Section[];
}) {
  const router = useRouter();
  const [schools] = useState(initialSchools);
  const [sections] = useState(initialSections);

  const [create, setCreate] = useState({
    codeSection: "",
    nameSection: "",
    schoolId: initialSchools[0]?.id ?? 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => sections.find((s) => s.id === editingId) ?? null, [sections, editingId]);

  const [update, setUpdate] = useState({
    codeSection: "",
    nameSection: "",
    schoolId: initialSchools[0]?.id ?? 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(target: Section) {
    setUpdate({
      codeSection: target.codeSection,
      nameSection: target.nameSection,
      schoolId: target.schoolId,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeSection: create.codeSection,
          nameSection: create.nameSection,
          schoolId: create.schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({
        codeSection: "",
        nameSection: "",
        schoolId: initialSchools[0]?.id ?? 0,
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
      const res = await fetch(`/api/admin/sections/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeSection: update.codeSection,
          nameSection: update.nameSection,
          schoolId: update.schoolId,
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
    const ok = window.confirm("Supprimer cette section ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/sections/${id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Créer une section</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code section"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.codeSection}
            onChange={(e) => setCreate((c) => ({ ...c, codeSection: e.target.value }))}
          />
          <input
            required
            placeholder="Nom de la section"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.nameSection}
            onChange={(e) => setCreate((c) => ({ ...c, nameSection: e.target.value }))}
          />
          <select
            required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.schoolId}
            onChange={(e) => setCreate((c) => ({ ...c, schoolId: Number(e.target.value) }))}
          >
            {schools.length === 0 ? <option value={0}>Aucune école</option> : null}
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            disabled={submitting || schools.length === 0}
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Sections existantes</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">École</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune section.
                  </td>
                </tr>
              ) : (
                sections.map((s) => {
                  const schoolName = schools.find((x) => x.id === s.schoolId)?.name ?? s.school?.name ?? "-";
                  return (
                    <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-3 pr-3 font-medium">{s.codeSection}</td>
                      <td className="py-3 pr-3">{s.nameSection}</td>
                      <td className="py-3 pr-3">{schoolName}</td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(s.id);
                              resetUpdateFromEditing(s);
                            }}
                            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDelete(s.id)}
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
            <h3 className="font-semibold text-black dark:text-white">Modifier : {editing.codeSection}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code section"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.codeSection}
                onChange={(e) => setUpdate((u) => ({ ...u, codeSection: e.target.value }))}
              />
              <input
                required
                placeholder="Nom de la section"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.nameSection}
                onChange={(e) => setUpdate((u) => ({ ...u, nameSection: e.target.value }))}
              />
              <select
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.schoolId}
                onChange={(e) => setUpdate((u) => ({ ...u, schoolId: Number(e.target.value) }))}
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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

