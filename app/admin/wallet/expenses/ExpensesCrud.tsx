"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "USD" | "CDF";

type ExpenseRow = {
  id: number;
  currency: Currency;
  amount: string;
  description: string | null;
  occurredAt: string;
};

export default function ExpensesCrud({
  canWrite,
  initialExpenses,
  total,
  page,
  pageCount,
  q,
  currency,
  take,
}: {
  canWrite: boolean;
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
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canWrite) return;
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

  const pageLinks = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (currency) params.set("currency", currency);
    params.set("page", String(nextPage));
    params.set("take", String(take));
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xl font-semibold text-black dark:text-white">Dépenses</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Gérer les dépenses (USD/CDF) et suivre les sorties.</div>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            {total} au total
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <div className="text-lg font-semibold text-black dark:text-white">Ajouter une dépense</div>
        {!canWrite ? <div className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">Lecture seule</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
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
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.amount}
            onChange={(e) => setCreate((c) => ({ ...c, amount: e.target.value }))}
            disabled={!canWrite || submitting}
            required
          />

          <input
            type="date"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.occurredAt}
            onChange={(e) => setCreate((c) => ({ ...c, occurredAt: e.target.value }))}
            disabled={!canWrite || submitting}
          />

          <input
            placeholder="Description"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.description}
            onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))}
            disabled={!canWrite || submitting}
          />
        </div>

        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{error}</div> : null}

        <button
          type="submit"
          disabled={!canWrite || submitting}
          className="mt-4 w-full rounded-lg bg-zinc-900 text-white px-4 py-3 hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Enregistrement..." : "Enregistrer la dépense"}
        </button>
      </form>

      {editing ? (
        <form onSubmit={handleUpdate} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-black dark:text-white">Modifier la dépense #{editing.id}</div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setEditingId(null)}
              className="text-sm text-zinc-700 dark:text-zinc-200 hover:underline"
            >
              Annuler
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
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
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={update.amount}
              onChange={(e) => setUpdate((u) => ({ ...u, amount: e.target.value }))}
              disabled={!canWrite || submitting}
              required
            />

            <input
              type="date"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={update.occurredAt}
              onChange={(e) => setUpdate((u) => ({ ...u, occurredAt: e.target.value }))}
              disabled={!canWrite || submitting}
            />

            <input
              placeholder="Description"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={update.description}
              onChange={(e) => setUpdate((u) => ({ ...u, description: e.target.value }))}
              disabled={!canWrite || submitting}
            />
          </div>

          <button
            type="submit"
            disabled={!canWrite || submitting}
            className="mt-4 w-full rounded-lg bg-zinc-900 text-white px-4 py-3 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      ) : null}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-700 dark:text-zinc-300">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3">Devise</th>
              <th className="py-2 pr-3">Montant</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-zinc-600 dark:text-zinc-300">
                  Aucune dépense trouvée.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-t border-zinc-200 dark:border-zinc-800">
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
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40 disabled:opacity-50"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || submitting}
                        onClick={() => handleDelete(e.id)}
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Page {page} / {pageCount}
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <a
              href={pageLinks(page - 1)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
            >
              Précédent
            </a>
          ) : null}
          {page < pageCount ? (
            <a
              href={pageLinks(page + 1)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
            >
              Suivant
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

