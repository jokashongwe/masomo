"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCrudLayout,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminNestedCard,
  adminPrimaryButton,
  adminPrimaryButtonBlock,
  adminSecondaryButton,
  adminSectionTitle,
  adminSoftCard,
} from "../components/admin-ui";

type AcademicYear = {
  id: number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isCurrent: boolean;
};

function toInputDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type CloseResult = {
  promoted: number;
  graduated: number;
  skippedNoPayment: number;
  skippedNoClass: number;
  errors: string[];
};

export default function AcademicYearsCrud({ initialYears }: { initialYears: AcademicYear[] }) {
  const router = useRouter();

  const years = initialYears;
  const [create, setCreate] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => years.find((y) => y.id === editingId) ?? null, [years, editingId]);

  const [update, setUpdate] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const currentYear = useMemo(() => years.find((y) => y.isCurrent) ?? null, [years]);
  const [closing, setClosing] = useState(false);
  const [targetYearId, setTargetYearId] = useState("");
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(y: AcademicYear) {
    setUpdate({
      name: y.name,
      startDate: toInputDate(y.startDate),
      endDate: toInputDate(y.endDate),
      isCurrent: y.isCurrent,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: create.name,
          startDate: new Date(create.startDate),
          endDate: new Date(create.endDate),
          isCurrent: create.isCurrent,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de création de l’année scolaire");
        return;
      }
      setCreate({ name: "", startDate: "", endDate: "", isCurrent: false });
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
      const res = await fetch(`/api/admin/academic-years/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: update.name,
          startDate: new Date(update.startDate),
          endDate: new Date(update.endDate),
          isCurrent: update.isCurrent,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de mise à jour de l’année scolaire");
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
    const ok = window.confirm("Supprimer cette année scolaire ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/academic-years/${id}`, { method: "DELETE" });
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

  async function handleCloseYear(e: React.FormEvent) {
    e.preventDefault();
    if (!currentYear || !targetYearId) return;
    const target = years.find((y) => y.id === Number(targetYearId));
    const ok = window.confirm(
      `Clôturer « ${currentYear.name} » et passer à « ${target?.name ?? "année cible"} » ?\n\n` +
        `Les élèves inscrits ayant au moins un paiement de frais seront promus au niveau supérieur ` +
        `(ou diplômés s’il n’y a pas de niveau suivant) et rattachés à l’année cible.`,
    );
    if (!ok) return;

    setError(null);
    setCloseResult(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/academic-years/${currentYear.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAcademicYearId: Number(targetYearId) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de la clôture");
        return;
      }
      setCloseResult(data.result as CloseResult);
      setClosing(false);
      setTargetYearId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCrudLayout}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Nom (unique)"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              type="date"
              className={adminInput}
              value={create.startDate}
              onChange={(e) => setCreate((c) => ({ ...c, startDate: e.target.value }))}
            />
            <input
              required
              type="date"
              className={adminInput}
              value={create.endDate}
              onChange={(e) => setCreate((c) => ({ ...c, endDate: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={create.isCurrent}
              onChange={(e) => setCreate((c) => ({ ...c, isCurrent: e.target.checked }))}
            />
            Marquer comme année en cours
          </label>
          <button
            disabled={submitting}
            type="submit"
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer l’année"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Années existantes</h2>
        <div className="mt-3 space-y-3">
          {years.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Aucune année.</div>
          ) : (
            years.map((y) => (
              <div key={y.id} className={adminSoftCard}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-black dark:text-white">{y.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {toInputDate(y.startDate)} → {toInputDate(y.endDate)}
                    </div>
                    <div className="text-xs mt-1">
                      {y.isCurrent ? (
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">En cours</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5">Inactive</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {y.isCurrent ? (
                      <button
                        type="button"
                        disabled={submitting || years.length < 2}
                        onClick={() => {
                          setClosing(true);
                          setCloseResult(null);
                          setError(null);
                          const other = years.find((x) => x.id !== y.id);
                          setTargetYearId(other ? String(other.id) : "");
                        }}
                        className={adminPrimaryButton}
                      >
                        Clôturer l&apos;année
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(y.id);
                        resetUpdateFromEditing(y);
                      }}
                      className={adminGhostButton}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={y.isCurrent || submitting}
                      onClick={() => handleDelete(y.id)}
                      className={adminDangerButton}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {editing ? (
          <form onSubmit={handleUpdate} className={`${adminNestedCard} mt-4 space-y-3`}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.name}</h3>
            <input
              required
              placeholder="Nom"
              className={adminInput}
              value={update.name}
              onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                type="date"
                className={adminInput}
                value={update.startDate}
                onChange={(e) => setUpdate((u) => ({ ...u, startDate: e.target.value }))}
              />
              <input
                required
                type="date"
                className={adminInput}
                value={update.endDate}
                onChange={(e) => setUpdate((u) => ({ ...u, endDate: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={update.isCurrent}
                onChange={(e) => setUpdate((u) => ({ ...u, isCurrent: e.target.checked }))}
              />
              Marquer comme année en cours
            </label>
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
        ) : null}

        {closing && currentYear ? (
          <form onSubmit={handleCloseYear} className={`${adminNestedCard} mt-4 space-y-3`}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>
              Clôturer l&apos;année : {currentYear.name}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Les élèves inscrits avec au moins un paiement de frais passent au niveau supérieur
              (selon le champ « niveau suivant » de chaque niveau) et sont rattachés à l&apos;année
              cible, qui devient l&apos;année en cours. Sans niveau suivant, l&apos;élève est marqué
              diplômé. Les élèves sans paiement restent sur l&apos;année clôturée.
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-1">
                Année scolaire cible
              </label>
              <select
                required
                className={adminInput}
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
              >
                <option value="">Choisir…</option>
                {years
                  .filter((y) => y.id !== currentYear.id)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button type="submit" disabled={submitting || !targetYearId} className={adminPrimaryButton}>
                {submitting ? "Clôture en cours…" : "Confirmer la clôture"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setClosing(false);
                  setTargetYearId("");
                }}
                className={adminSecondaryButton}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : null}

        {closeResult ? (
          <div className={`${adminSoftCard} mt-4 text-sm space-y-1`}>
            <div className="font-medium text-zinc-900 dark:text-white">Résultat de la clôture</div>
            <div>Promus : {closeResult.promoted}</div>
            <div>Diplômés : {closeResult.graduated}</div>
            <div>Sans paiement (non déplacés) : {closeResult.skippedNoPayment}</div>
            <div>Sans classe cible : {closeResult.skippedNoClass}</div>
            {closeResult.errors.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-rose-700 dark:text-rose-300">
                {closeResult.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <div className={adminErrorBox}>{error}</div> : null}
      </div>
    </div>
  );
}

