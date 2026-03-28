"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCardGrid,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminLabel,
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

type Level = {
  id: number;
  codeLevel: string;
  name: string;
  nextLevel: string | null;
  optionId: number;
  option?: { codeOption: string; nameOption: string; section?: { codeSection: string; nameSection: string; school?: { name: string } | null } | null } | null;
};

type SchoolClass = { id: number; codeClass: string; levelId: number };

type LevelOption = { id: number; label: string };

export default function ClassCrud({
  initialLevels,
  pagedClasses,
  levelOptions,
  listTotal,
  listPage,
  listPageCount,
  listQ,
  listLevelIdStr,
  listTake,
}: {
  initialLevels: Level[];
  pagedClasses: SchoolClass[];
  levelOptions: LevelOption[];
  listTotal: number;
  listPage: number;
  listPageCount: number;
  listQ: string;
  listLevelIdStr: string;
  listTake: number;
}) {
  const router = useRouter();
  const [levels] = useState(initialLevels);

  const [create, setCreate] = useState({
    codeClass: "",
    levelId: initialLevels[0]?.id ?? 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(
    () => pagedClasses.find((c) => c.id === editingId) ?? null,
    [pagedClasses, editingId],
  );

  const [update, setUpdate] = useState({
    codeClass: "",
    levelId: initialLevels[0]?.id ?? 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingId !== null && !pagedClasses.some((c) => c.id === editingId)) {
      setEditingId(null);
    }
  }, [pagedClasses, editingId]);

  function buildListQuery(nextPage: number) {
    const params = new URLSearchParams();
    if (listQ) params.set("q", listQ);
    if (listLevelIdStr) params.set("levelId", listLevelIdStr);
    params.set("page", String(nextPage));
    params.set("take", String(listTake));
    return `/admin/classes?${params.toString()}`;
  }

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
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer une classe</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code classe"
            className={adminInput}
            value={create.codeClass}
            onChange={(e) => setCreate((c) => ({ ...c, codeClass: e.target.value }))}
          />
          <select
            required
            className={adminInput}
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
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Classes existantes</h2>

        <form method="GET" action="/admin/classes" className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-4">
          <input type="hidden" name="page" value="1" />
          <div className="md:col-span-2">
            <label className={`block ${adminLabel}`}>Recherche</label>
            <input
              name="q"
              defaultValue={listQ}
              className={`mt-2 ${adminInput}`}
              placeholder="Code classe, niveau, option, section, école…"
            />
          </div>
          <div>
            <label className={`block ${adminLabel}`}>Niveau</label>
            <select name="levelId" defaultValue={listLevelIdStr} className={`mt-2 ${adminInput}`}>
              <option value="">Tous les niveaux</option>
              {levelOptions.map((lo) => (
                <option key={lo.id} value={lo.id}>
                  {lo.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block ${adminLabel}`}>Par page</label>
            <select name="take" defaultValue={String(listTake)} className={`mt-2 ${adminInput}`}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className={adminPrimaryButton}>
              Filtrer
            </button>
            <Link href="/admin/classes" className={`${adminGhostButton} ml-3 text-sm`}>
              Réinitialiser
            </Link>
          </div>
        </form>

        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Niveau</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedClasses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune classe ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                pagedClasses.map((c) => (
                  <tr key={c.id} className={adminTr}>
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
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(c.id)}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Page {listPage} sur {listPageCount} ({listTotal} au total).
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {listPage > 1 ? (
              <Link href={buildListQuery(listPage - 1)} className={adminGhostButton}>
                Précédent
              </Link>
            ) : null}
            {listPage < listPageCount ? (
              <Link href={buildListQuery(listPage + 1)} className={adminGhostButton}>
                Suivant
              </Link>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className={adminNestedCard}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.codeClass}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code classe"
                className={adminInput}
                value={update.codeClass}
                onChange={(e) => setUpdate((u) => ({ ...u, codeClass: e.target.value }))}
              />
              <select
                required
                className={adminInput}
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
                <button type="submit" disabled={submitting} className={adminPrimaryButton}>
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
