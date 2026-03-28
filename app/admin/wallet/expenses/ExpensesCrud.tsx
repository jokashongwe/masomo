"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminLabel,
  adminPrimaryButtonBlock,
  adminSectionTitle,
  adminTable,
  adminTh,
  adminTr,
} from "../../components/admin-ui";

type Currency = "USD" | "CDF";

type ExpenseRow = {
  id: number;
  currency: Currency;
  amount: string;
  description: string | null;
  occurredAt: string;
  academicYearId: number;
  academicYearName: string;
};

export default function ExpensesCrud({
  canWrite,
  academicYears,
  selectedAcademicYearId,
  initialExpenses,
  total,
  page,
  pageCount,
  q,
  currency,
  take,
}: {
  canWrite: boolean;
  academicYears: { id: number; name: string }[];
  selectedAcademicYearId: number | null;
  initialExpenses: ExpenseRow[];
  total: number;
  page: number;
  pageCount: number;
  q: string;
  currency: string;
  take: number;
}) {
  const router = useRouter();
  const [expenses] = useState(initialExpenses);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [create, setCreate] = useState({
    currency: (currency === "USD" || currency === "CDF" ? currency : "USD") as Currency,
    amount: "",
    description: "",
    occurredAt: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(
    () => (editingId ? expenses.find((x) => x.id === editingId) ?? null : null),
    [editingId, expenses],
  );

  const [update, setUpdate] = useState({
    currency: "USD" as Currency,
    amount: "",
    description: "",
    occurredAt: "",
    academicYearId: 0,
  });

  function toLocalDateTimeInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function resetUpdateFromEditing(row: ExpenseRow) {
    setUpdate({
      currency: row.currency,
      amount: row.amount,
      description: row.description ?? "",
      occurredAt: toLocalDateTimeInput(row.occurredAt),
      academicYearId: row.academicYearId,
    });
  }

  function searchParamsForPage(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (currency) params.set("currency", currency);
    params.set("page", String(nextPage));
    params.set("take", String(take));
    if (selectedAcademicYearId != null) params.set("academicYearId", String(selectedAcademicYearId));
    return params.toString();
  }

  function hrefForYear(yearId: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (currency) params.set("currency", currency);
    params.set("page", "1");
    params.set("take", String(take));
    params.set("academicYearId", String(yearId));
    return `/admin/wallet/expenses?${params.toString()}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canWrite) return;
    if (selectedAcademicYearId == null) {
      setError("Sélectionnez une année scolaire.");
      return;
    }
    const amount = Number(create.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le montant doit être > 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallet/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: create.currency,
          amount,
          description: create.description || undefined,
          occurredAt: create.occurredAt ? new Date(create.occurredAt) : undefined,
          academicYearId: selectedAcademicYearId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de création de la dépense");
        return;
      }
      setCreate({ currency: "USD", amount: "", description: "", occurredAt: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !canWrite) return;
    setError(null);
    const amount = Number(update.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le montant doit être > 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/wallet/expenses/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: update.currency,
          amount,
          description: update.description || undefined,
          occurredAt: update.occurredAt ? new Date(update.occurredAt) : undefined,
          academicYearId: update.academicYearId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de mise à jour de la dépense");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!canWrite) return;
    setError(null);
    const ok = window.confirm("Supprimer cette dépense ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/wallet/expenses/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de suppression de la dépense");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={adminCard}>
        <label className={`block ${adminLabel}`}>Année scolaire (filtre)</label>
        <select
          className={`mt-2 ${adminInput} max-w-md`}
          value={selectedAcademicYearId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            if (!Number.isFinite(id) || id <= 0) return;
            router.push(hrefForYear(id));
          }}
        >
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </div>

      <div className={adminCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={`text-xl ${adminSectionTitle}`}>Dépenses</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Gérer les dépenses (USD/CDF) et suivre les sorties.</div>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            {total} au total
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className={adminCard}>
        <div className={adminSectionTitle}>Ajouter une dépense</div>
        {!canWrite ? <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">Lecture seule</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            className={adminInput}
            value={create.currency}
            onChange={(e) => setCreate((c) => ({ ...c, currency: e.target.value as Currency }))}
            disabled={!canWrite || submitting}
            required
          >
            <option value="USD">USD</option>
            <option value="CDF">CDF</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Montant"
            className={adminInput}
            value={create.amount}
            onChange={(e) => setCreate((c) => ({ ...c, amount: e.target.value }))}
            disabled={!canWrite || submitting}
            required
          />

          <input
            type="date"
            className={adminInput}
            value={create.occurredAt}
            onChange={(e) => setCreate((c) => ({ ...c, occurredAt: e.target.value }))}
            disabled={!canWrite || submitting}
          />

          <input
            placeholder="Description"
            className={adminInput}
            value={create.description}
            onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))}
            disabled={!canWrite || submitting}
          />
        </div>

        {error ? <div className={`${adminErrorBox} mt-3`}>{error}</div> : null}

        <button
          type="submit"
          disabled={!canWrite || submitting || selectedAcademicYearId == null}
          className={`${adminPrimaryButtonBlock} mt-4`}
        >
          {submitting ? "Enregistrement..." : "Enregistrer la dépense"}
        </button>
      </form>

      {editing ? (
        <form onSubmit={handleUpdate} className={adminCard}>
          <div className="flex items-center justify-between gap-3">
            <div className={adminSectionTitle}>Modifier la dépense #{editing.id}</div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setEditingId(null)}
              className="text-sm text-zinc-700 dark:text-zinc-200 hover:underline"
            >
              Annuler
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              className={adminInput}
              value={update.academicYearId}
              onChange={(e) =>
                setUpdate((u) => ({ ...u, academicYearId: Number(e.target.value) }))
              }
              disabled={!canWrite || submitting}
              required
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>

            <select
              className={adminInput}
              value={update.currency}
              onChange={(e) => setUpdate((u) => ({ ...u, currency: e.target.value as Currency }))}
              disabled={!canWrite || submitting}
              required
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Montant"
              className={adminInput}
              value={update.amount}
              onChange={(e) => setUpdate((u) => ({ ...u, amount: e.target.value }))}
              disabled={!canWrite || submitting}
              required
            />

            <input
              type="date"
              className={adminInput}
              value={update.occurredAt}
              onChange={(e) => setUpdate((u) => ({ ...u, occurredAt: e.target.value }))}
              disabled={!canWrite || submitting}
            />

            <input
              placeholder="Description"
              className={adminInput}
              value={update.description}
              onChange={(e) => setUpdate((u) => ({ ...u, description: e.target.value }))}
              disabled={!canWrite || submitting}
            />
          </div>

          <button
            type="submit"
            disabled={!canWrite || submitting}
            className={`${adminPrimaryButtonBlock} mt-4`}
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      ) : null}

      <div className={`${adminCard} overflow-x-auto`}>
        <table className={adminTable}>
          <thead>
            <tr>
              <th className={adminTh}>Année</th>
              <th className={adminTh}>Date</th>
              <th className={adminTh}>Description</th>
              <th className={adminTh}>Devise</th>
              <th className={adminTh}>Montant</th>
              <th className={adminTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-zinc-600 dark:text-zinc-300">
                  Aucune dépense trouvée.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className={adminTr}>
                  <td className="py-3 pr-3 whitespace-nowrap">{e.academicYearName}</td>
                  <td className="py-3 pr-3">{e.occurredAt.slice(0, 10)}</td>
                  <td className="py-3 pr-3">{e.description ?? "-"}</td>
                  <td className="py-3 pr-3">{e.currency}</td>
                  <td className="py-3 pr-3 font-medium">{e.amount}</td>
                  <td className="py-3 pr-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!canWrite || submitting}
                        onClick={() => {
                          setEditingId(e.id);
                          resetUpdateFromEditing(e);
                        }}
                        className={`${adminGhostButton} disabled:opacity-50`}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || submitting}
                        onClick={() => handleDelete(e.id)}
                        className={`${adminDangerButton} disabled:opacity-50`}
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Page {page} / {pageCount}
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <a
              href={`?${searchParamsForPage(page - 1)}`}
              className={adminGhostButton}
            >
              Précédent
            </a>
          ) : null}
          {page < pageCount ? (
            <a
              href={`?${searchParamsForPage(page + 1)}`}
              className={adminGhostButton}
            >
              Suivant
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

