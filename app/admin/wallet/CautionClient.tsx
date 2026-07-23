"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCrudLayout,
  adminErrorBox,
  adminFormGrid,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSectionTitle,
  adminTable,
  adminTableEmpty,
  adminTableWrap,
  adminTd,
  adminTdSm,
  adminTdStrong,
  adminThead,
  adminTr,
} from "../components/admin-ui";
import { useClientSort } from "../components/useClientSort";
import { SortableTh } from "../components/SortableTh";

type Currency = "USD" | "CDF";
type TxType = "DEPOSIT" | "WITHDRAWAL" | "EXPENSE" | "FEE_PAYMENT";

type TxRow = {
  id: number;
  type: TxType;
  currency: Currency;
  amount: string;
  note: string | null;
  createdAt: string;
  academicYearName: string;
};

function typeLabel(t: TxType) {
  switch (t) {
    case "DEPOSIT":
      return "Dépôt";
    case "WITHDRAWAL":
      return "Retrait";
    case "EXPENSE":
      return "Dépense";
    case "FEE_PAYMENT":
      return "Paiement frais";
    default:
      return t;
  }
}

function MovementForm({
  mode,
  canWrite,
  academicYears,
  defaultAcademicYearId,
}: {
  mode: "deposit" | "withdraw";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAcademicYearId(defaultAcademicYearId);
  }, [defaultAcademicYearId]);

  const isDeposit = mode === "deposit";
  const title = isDeposit ? "Dépôt" : "Retrait";
  const subtitle = isDeposit
    ? "Ajouter de l’argent au compte de caution."
    : "Retirer de l’argent du compte de caution.";
  const endpoint = isDeposit ? "/api/admin/wallet/deposit" : "/api/admin/wallet/withdraw";
  const submitLabel = isDeposit ? "Déposer" : "Retirer";
  const submittingLabel = isDeposit ? "Dépôt en cours…" : "Retrait en cours…";

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
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, amount: parsedAmount, note, academicYearId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : data?.error?.message ?? `Échec du ${title.toLowerCase()}`);
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
          <div className={adminSectionTitle}>{title}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">{subtitle}</div>
        </div>
        {!canWrite ? <div className="text-sm text-zinc-600 dark:text-zinc-300">Lecture seule</div> : null}
      </div>

      <div className={`mt-4 ${adminFormGrid}`}>
        <div>
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
            {academicYears.length === 0 ? <option value="">—</option> : null}
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </div>
        <div>
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
        <div>
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
        <div>
          <label className={`block ${adminLabel}`}>Note (optionnel)</label>
          <input
            className={`mt-2 ${adminInput}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isDeposit ? "ex. Dépôt" : "ex. Retrait caisse"}
            disabled={!canWrite}
          />
        </div>
      </div>

      {error ? <div className={`${adminErrorBox} mt-3`}>{error}</div> : null}

      <button
        type="submit"
        disabled={!canWrite || submitting || academicYearId == null}
        className={`${adminPrimaryButton} mt-4`}
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}

export default function CautionClient({
  canWrite,
  academicYears,
  defaultAcademicYearId,
  transactions,
}: {
  canWrite: boolean;
  academicYears: { id: number; name: string }[];
  defaultAcademicYearId: number | null;
  transactions: TxRow[];
}) {
  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(transactions, {
    defaultKey: "createdAt",
    defaultDir: "desc",
    getters: {
      createdAt: (r) => r.createdAt,
      type: (r) => typeLabel(r.type),
      year: (r) => r.academicYearName,
      amount: (r) => Number(r.amount),
      note: (r) => r.note,
    },
  });

  return (
    <div className={`${adminCrudLayout} mt-6`}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MovementForm
          mode="deposit"
          canWrite={canWrite}
          academicYears={academicYears}
          defaultAcademicYearId={defaultAcademicYearId}
        />
        <MovementForm
          mode="withdraw"
          canWrite={canWrite}
          academicYears={academicYears}
          defaultAcademicYearId={defaultAcademicYearId}
        />
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Mouvements récents</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Dépôts, retraits, dépenses et paiements liés à la caution.
        </p>
        <div className={`${adminTableWrap} mt-4`}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <SortableTh column="createdAt" label="Date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="type" label="Type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="year" label="Année" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="amount" label="Montant" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="note" label="Note" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={adminTableEmpty}>
                    Aucun mouvement.
                  </td>
                </tr>
              ) : (
                sortedRows.map((t) => (
                  <tr key={t.id} className={adminTr}>
                    <td className={adminTdSm}>{t.createdAt.slice(0, 19).replace("T", " ")}</td>
                    <td className={adminTd}>{typeLabel(t.type)}</td>
                    <td className={adminTdSm}>{t.academicYearName}</td>
                    <td className={adminTdStrong}>
                      {t.type === "DEPOSIT" || t.type === "FEE_PAYMENT" ? "+" : "−"}
                      {t.amount} {t.currency}
                    </td>
                    <td className={adminTd}>{t.note ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
