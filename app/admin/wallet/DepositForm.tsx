"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminErrorBox,
  adminInput,
  adminLabel,
  adminPrimaryButtonBlock,
  adminSectionTitle,
} from "../components/admin-ui";

type Currency = "USD" | "CDF";

export default function DepositForm({
  canWrite,
  academicYears,
  defaultAcademicYearId,
}: {
  canWrite: boolean;
  academicYears: { id: number; name: string }[];
  defaultAcademicYearId: number | null;
}) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [academicYearId, setAcademicYearId] = useState<number | null>(defaultAcademicYearId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAcademicYearId(defaultAcademicYearId);
  }, [defaultAcademicYearId]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canWrite) return;
    if (academicYearId == null) {
      setError("Sélectionnez une année scolaire.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Le montant doit être > 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, amount: parsedAmount, note, academicYearId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec du dépôt");
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={adminCard}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={adminSectionTitle}>Dépôt</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Ajouter de l’argent au portefeuille.</div>
        </div>
        {!canWrite ? <div className="text-sm text-zinc-600 dark:text-zinc-300">Lecture seule</div> : null}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sm:col-span-1">
          <label className={`block ${adminLabel}`}>Année scolaire</label>
          <select
            className={`mt-2 ${adminInput}`}
            value={academicYearId ?? ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              setAcademicYearId(Number.isFinite(v) && v > 0 ? v : null);
            }}
            disabled={!canWrite || academicYears.length === 0}
            required
          >
            {academicYears.length === 0 ? (
              <option value="">—</option>
            ) : null}
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className={`block ${adminLabel}`}>Devise</label>
          <select
            className={`mt-2 ${adminInput}`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            disabled={!canWrite}
          >
            <option value="USD">USD</option>
            <option value="CDF">CDF</option>
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className={`block ${adminLabel}`}>Montant</label>
          <input
            className={`mt-2 ${adminInput}`}
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
          <label className={`block ${adminLabel}`}>Note (optionnel)</label>
          <input
            className={`mt-2 ${adminInput}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: Dépôt"
            disabled={!canWrite}
          />
        </div>
      </div>

      {error ? <div className={`${adminErrorBox} mt-3`}>{error}</div> : null}

      <button
        type="submit"
        disabled={!canWrite || submitting || academicYearId == null}
        className={`${adminPrimaryButtonBlock} mt-4`}
      >
        {submitting ? "Dépôt en cours..." : "Déposer"}
      </button>
    </form>
  );
}

