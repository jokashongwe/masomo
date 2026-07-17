"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminErrorBox,
  adminFormGrid,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSectionTitle,
  adminSoftCard,
  adminTable,
  adminTableWrap,
  adminTr,
  adminThead,
  adminTd,
  adminTdStrong,
  adminTdSm,
  adminTableEmpty,
} from "../../../components/admin-ui";
import { useClientSort } from "../../../components/useClientSort";
import { SortableTh } from "../../../components/SortableTh";
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
type AccountOpt = { id: number; name: string };

type WithdrawDestination = "EXTERNAL" | "ACCOUNT" | "WALLET";

function typeLabel(t: TransactionRow["type"]) {
  return t === "DEPOSIT" ? "Crédit" : "Retrait / transfert";
}

function movementDetail(t: TransactionRow) {
  if (t.type === "DEPOSIT" && t.feePayment) {
    const s = t.feePayment.student;
    return `${t.feePayment.receiptNumber} — ${s.firstName} ${s.name} ${s.postnom} (${t.feePayment.fee.name})`;
  }
  if (t.note) return t.note;
  if (t.type === "WITHDRAWAL" && t.createdBy) {
    return `Par ${t.createdBy.name}`;
  }
  return "—";
}

export default function AccountDetailClient({
  account,
  otherAccounts,
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
  otherAccounts: AccountOpt[];
  initialTransactions: TransactionRow[];
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const [withdraw, setWithdraw] = useState({
    currency: "USD" as "USD" | "CDF",
    amount: "",
    note: "",
    destinationType: "WALLET" as WithdrawDestination,
    targetAccountId: otherAccounts[0]?.id ? String(otherAccounts[0].id) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(initialTransactions, {
    defaultKey: "createdAt",
    defaultDir: "desc",
    getters: {
      createdAt: (r) => r.createdAt,
      type: (r) => typeLabel(r.type),
      amount: (r) => Number(r.amount),
      detail: (r) => movementDetail(r),
    },
  });

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!canWithdraw) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        currency: withdraw.currency,
        amount: Number(withdraw.amount),
        note: withdraw.note,
        destinationType: withdraw.destinationType,
      };
      if (withdraw.destinationType === "ACCOUNT") {
        body.targetAccountId = Number(withdraw.targetAccountId);
      }
      if (withdraw.destinationType === "WALLET") {
        body.academicYearId = account.academicYear.id;
      }

      const res = await fetch(`/api/admin/finance/accounts/${account.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec du retrait");
        return;
      }
      setWithdraw((w) => ({ ...w, amount: "", note: "" }));
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const destinationHelp: Record<WithdrawDestination, string> = {
    EXTERNAL: "Sortie du système (aucun crédit sur un autre compte ou la caution).",
    ACCOUNT: "Transfert vers un autre compte de la même année scolaire.",
    WALLET: "Transfert vers la caution (wallet) pour l'année de ce compte.",
  };

  return (
    <div className="mt-6 space-y-6">
      <AccountBalanceCards balanceUSD={account.balanceUSD} balanceCDF={account.balanceCDF} />

      {account.description ? (
        <div className={adminSoftCard}>{account.description}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={adminCard}>
          <div className={adminSectionTitle}>Frais rattachés</div>
          {account.fees.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
              {account.fees.map((f) => (
                <li key={f.id}>
                  <span className="font-mono text-xs">{f.code}</span> — {f.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              Aucun frais lié. Associez des frais depuis la page <strong>Frais</strong> pour créditer ce compte
              automatiquement.
            </p>
          )}
        </div>

        {canWithdraw ? (
          <div className={adminCard}>
            <div className={adminSectionTitle}>Retrait / transfert</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Réservé à l&apos;administrateur système. Les crédits proviennent des paiements de frais liés.
            </p>
            <form onSubmit={handleWithdraw} className="mt-4 space-y-4">
              <div>
                <label className={adminLabel}>Destination</label>
                <select
                  className={`mt-2 ${adminInput}`}
                  value={withdraw.destinationType}
                  onChange={(e) =>
                    setWithdraw((w) => ({
                      ...w,
                      destinationType: e.target.value as WithdrawDestination,
                    }))
                  }
                >
                  <option value="WALLET">Vers la caution (wallet)</option>
                  <option value="ACCOUNT">Vers un autre compte</option>
                  <option value="EXTERNAL">Sortie (hors système)</option>
                </select>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {destinationHelp[withdraw.destinationType]}
                </p>
              </div>

              {withdraw.destinationType === "ACCOUNT" ? (
                <div>
                  <label className={adminLabel}>Compte destinataire</label>
                  <select
                    required
                    className={`mt-2 ${adminInput}`}
                    value={withdraw.targetAccountId}
                    onChange={(e) => setWithdraw((w) => ({ ...w, targetAccountId: e.target.value }))}
                  >
                    {otherAccounts.length === 0 ? (
                      <option value="">Aucun autre compte pour cette année</option>
                    ) : (
                      otherAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : null}

              <div className={adminFormGrid}>
                <div>
                  <label className={adminLabel}>Devise</label>
                  <select
                    className={`mt-2 ${adminInput}`}
                    value={withdraw.currency}
                    onChange={(e) => setWithdraw((w) => ({ ...w, currency: e.target.value as "USD" | "CDF" }))}
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </div>
                <div>
                  <label className={adminLabel}>Montant</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className={`mt-2 ${adminInput}`}
                    value={withdraw.amount}
                    onChange={(e) => setWithdraw((w) => ({ ...w, amount: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={adminLabel}>Motif (optionnel)</label>
                  <input
                    placeholder="ex. Versement caution"
                    className={`mt-2 ${adminInput}`}
                    value={withdraw.note}
                    onChange={(e) => setWithdraw((w) => ({ ...w, note: e.target.value }))}
                  />
                </div>
              </div>

              {error ? <div className={adminErrorBox}>{error}</div> : null}
              <button
                type="submit"
                disabled={
                  submitting ||
                  (withdraw.destinationType === "ACCOUNT" && otherAccounts.length === 0)
                }
                className={adminPrimaryButton}
              >
                {submitting ? "Traitement…" : "Confirmer le retrait"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className={adminCard}>
        <div className={adminSectionTitle}>Historique des mouvements</div>
        <div className={`${adminTableWrap} mt-4`}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <SortableTh column="createdAt" label="Date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="type" label="Type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="amount" label="Montant" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="detail" label="Détail" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className={adminTableEmpty}>
                    Aucun mouvement pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                sortedRows.map((t) => (
                  <tr key={t.id} className={adminTr}>
                    <td className={adminTdSm}>{new Date(t.createdAt).toLocaleString("fr-FR")}</td>
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
