"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminErrorBox,
  adminInput,
  adminPrimaryButton,
  adminSectionTitle,
  adminSoftCard,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
  adminThead,
  adminTd,
  adminTdStrong,
  adminTdSm,
  adminTableEmpty,
} from "../../../components/admin-ui";
import { AccountBalanceCards } from "../AccountsCrud";

type TransactionRow = {
  id: number;
  type: "DEPOSIT" | "WITHDRAWAL";
  currency: "USD" | "CDF";
  amount: string;
  note: string | null;
  createdAt: string;
  feePayment: {
    id: number;
    receiptNumber: string;
    student: { id: number; firstName: string; name: string; postnom: string };
    fee: { code: string; name: string };
  } | null;
  createdBy: { id: number; name: string } | null;
};

type FeeLink = { id: number; code: string; name: string };

export default function AccountDetailClient({
  account,
  initialTransactions,
  canWithdraw,
}: {
  account: {
    id: number;
    name: string;
    description: string | null;
    balanceUSD: string;
    balanceCDF: string;
    academicYear: { id: number; name: string; isCurrent: boolean };
    fees: FeeLink[];
  };
  initialTransactions: TransactionRow[];
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [withdraw, setWithdraw] = useState({ currency: "USD" as "USD" | "CDF", amount: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!canWithdraw) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/accounts/${account.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: withdraw.currency,
          amount: Number(withdraw.amount),
          note: withdraw.note,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec du retrait");
        return;
      }
      setWithdraw({ currency: withdraw.currency, amount: "", note: "" });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function typeLabel(t: TransactionRow["type"]) {
    return t === "DEPOSIT" ? "Dépôt (paiement)" : "Retrait";
  }

  function movementDetail(t: TransactionRow) {
    if (t.type === "DEPOSIT" && t.feePayment) {
      const s = t.feePayment.student;
      return `${t.feePayment.receiptNumber} — ${s.firstName} ${s.name} ${s.postnom} (${t.feePayment.fee.name})`;
    }
    if (t.type === "WITHDRAWAL" && t.createdBy) {
      return `Par ${t.createdBy.name}`;
    }
    return t.note ?? "—";
  }

  return (
    <div className="mt-6 space-y-6">
      <AccountBalanceCards balanceUSD={account.balanceUSD} balanceCDF={account.balanceCDF} />

      {account.description ? (
        <div className={adminSoftCard}>{account.description}</div>
      ) : null}

      {account.fees.length > 0 ? (
        <div className={adminCard}>
          <div className={adminSectionTitle}>Frais rattachés à ce compte</div>
          <ul className="mt-3 list-inside list-disc text-sm text-zinc-700 dark:text-zinc-200">
            {account.fees.map((f) => (
              <li key={f.id}>
                {f.code} — {f.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={adminSoftCard}>
          Aucun frais n’est encore lié à ce compte. Associez des frais depuis la page{" "}
          <strong>Frais</strong> pour que les paiements créditent ce compte.
        </div>
      )}

      {canWithdraw ? (
        <div className={adminCard}>
          <div className={adminSectionTitle}>Retrait (administrateur système)</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Les dépôts sont créés automatiquement lors des paiements de frais liés. Seul l’administrateur système peut
            effectuer un retrait manuel.
          </p>
          <form onSubmit={handleWithdraw} className="mt-4 grid max-w-md gap-3">
            <select
              className={adminInput}
              value={withdraw.currency}
              onChange={(e) => setWithdraw((w) => ({ ...w, currency: e.target.value as "USD" | "CDF" }))}
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Montant"
              className={adminInput}
              value={withdraw.amount}
              onChange={(e) => setWithdraw((w) => ({ ...w, amount: e.target.value }))}
            />
            <input
              placeholder="Motif (optionnel)"
              className={adminInput}
              value={withdraw.note}
              onChange={(e) => setWithdraw((w) => ({ ...w, note: e.target.value }))}
            />
            {error ? <div className={adminErrorBox}>{error}</div> : null}
            <button type="submit" disabled={submitting} className={adminPrimaryButton}>
              {submitting ? "Retrait…" : "Enregistrer le retrait"}
            </button>
          </form>
        </div>
      ) : null}

      <div className={adminCard}>
        <div className={adminSectionTitle}>Historique des mouvements</div>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <th className={adminTh}>Date</th>
                <th className={adminTh}>Type</th>
                <th className={adminTh}>Montant</th>
                <th className={adminTh}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {initialTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className={adminTableEmpty}>
                    Aucun mouvement pour l’instant.
                  </td>
                </tr>
              ) : (
                initialTransactions.map((t) => (
                  <tr key={t.id} className={adminTr}>
                    <td className={adminTdSm}>
                      {new Date(t.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className={adminTd}>{typeLabel(t.type)}</td>
                    <td className={adminTdStrong}>
                      {t.type === "WITHDRAWAL" ? "−" : "+"}
                      {t.amount} {t.currency}
                    </td>
                    <td className={adminTdSm}>{movementDetail(t)}</td>
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
