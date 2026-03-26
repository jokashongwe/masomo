"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "USD" | "CDF";

export default function DepositForm({ canWrite }: { canWrite: boolean }) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canWrite) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be > 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, amount: parsedAmount, note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Deposit failed");
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-black dark:text-white">Deposit</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Add money to the wallet.</div>
        </div>
        {!canWrite ? <div className="text-sm text-zinc-600 dark:text-zinc-300">Read-only</div> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-black dark:text-white">Currency</label>
          <select
            className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            disabled={!canWrite}
          >
            <option value="USD">USD</option>
            <option value="CDF">CDF</option>
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-black dark:text-white">Amount</label>
          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0"
            disabled={!canWrite}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-black dark:text-white">Note (optional)</label>
          <input
            className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Deposit"
            disabled={!canWrite}
          />
        </div>
      </div>

      {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{error}</div> : null}

      <button
        type="submit"
        disabled={!canWrite || submitting}
        className="mt-4 w-full rounded-lg bg-zinc-900 text-white px-4 py-3 hover:bg-zinc-800 disabled:opacity-50"
      >
        {submitting ? "Depositing..." : "Deposit"}
      </button>
    </form>
  );
}

