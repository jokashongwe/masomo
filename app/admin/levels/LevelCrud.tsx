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

type Option = { id: number; codeOption: string; nameOption: string; section?: { codeSection: string; nameSection: string; school?: { name: string } | null } | null };
type Level = {
  id: number;
  codeLevel: string;
  name: string;
  nextLevel: string | null;
  optionId: number;
  option: { nameOption: string };
};

/** Valeur du select : id du niveau suivant, ou "" pour aucun. */
function nextLevelToSelectValue(nextLevel: string | null, selfOptionId: number, allLevels: Level[]): string {
  if (!nextLevel) return "";
  if (/^\d+$/.test(nextLevel)) {
    const byId = allLevels.find((l) => String(l.id) === nextLevel);
    if (byId) return String(byId.id);
  }
  const legacy = allLevels.find((l) => l.optionId === selfOptionId && l.codeLevel === nextLevel);
  return legacy ? String(legacy.id) : "";
}

function levelNextDropdownLabel(l: Level) {
  return `${l.name} - ${l.option.nameOption}`;
}

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
      nextLevel: nextLevelToSelectValue(target.nextLevel, target.optionId, levels),
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
          nextLevel: create.nextLevel || null,
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
          nextLevel: update.nextLevel || null,
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
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer un niveau</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code niveau"
            className={adminInput}
            value={create.codeLevel}
            onChange={(e) => setCreate((c) => ({ ...c, codeLevel: e.target.value }))}
          />
          <input
            required
            placeholder="Nom"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Niveau suivant (optionnel)</label>
            <select
              className={adminInput}
              value={create.nextLevel}
              onChange={(e) => setCreate((c) => ({ ...c, nextLevel: e.target.value }))}
            >
              <option value="">— Aucun —</option>
              {levels.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {levelNextDropdownLabel(l)}
                </option>
              ))}
            </select>
          </div>
          <select
            required
            className={adminInput}
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
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Niveaux existants</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Option</th>
                <th className={adminTh}>Actions</th>
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
                  <tr key={l.id} className={adminTr}>
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
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(l.id)}
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.codeLevel}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code niveau"
                className={adminInput}
                value={update.codeLevel}
                onChange={(e) => setUpdate((u) => ({ ...u, codeLevel: e.target.value }))}
              />
              <input
                required
                placeholder="Nom"
                className={adminInput}
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Niveau suivant (optionnel)</label>
                <select
                  className={adminInput}
                  value={update.nextLevel}
                  onChange={(e) => setUpdate((u) => ({ ...u, nextLevel: e.target.value }))}
                >
                  <option value="">— Aucun —</option>
                  {levels
                    .filter((l) => l.id !== editingId)
                    .map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {levelNextDropdownLabel(l)}
                      </option>
                    ))}
                </select>
              </div>
              <select
                required
                className={adminInput}
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

