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
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer une section</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code section"
            className={adminInput}
            value={create.codeSection}
            onChange={(e) => setCreate((c) => ({ ...c, codeSection: e.target.value }))}
          />
          <input
            required
            placeholder="Nom de la section"
            className={adminInput}
            value={create.nameSection}
            onChange={(e) => setCreate((c) => ({ ...c, nameSection: e.target.value }))}
          />
          <select
            required
            className={adminInput}
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
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Sections existantes</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>École</th>
                <th className={adminTh}>Actions</th>
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
                    <tr key={s.id} className={adminTr}>
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
                            className={adminGhostButton}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDelete(s.id)}
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.codeSection}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code section"
                className={adminInput}
                value={update.codeSection}
                onChange={(e) => setUpdate((u) => ({ ...u, codeSection: e.target.value }))}
              />
              <input
                required
                placeholder="Nom de la section"
                className={adminInput}
                value={update.nameSection}
                onChange={(e) => setUpdate((u) => ({ ...u, nameSection: e.target.value }))}
              />
              <select
                required
                className={adminInput}
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

