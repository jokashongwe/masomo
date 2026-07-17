"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isMainFinanceAccountName } from "@/lib/finance-account-labels";
import {
  adminCard,
  adminCrudLayout,
  adminDangerButton,
  adminErrorBox,
  adminFormGrid,
  adminGhostButton,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSectionTitle,
  adminStatFees,
  adminStatWalletCDF,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
  adminThead,
  adminTd,
  adminTdSm,
  adminTableEmpty,
} from "../../components/admin-ui";
import { useClientSort } from "../../components/useClientSort";
import { SortableTh } from "../../components/SortableTh";

type AcademicYearOpt = { id: number; name: string; isCurrent: boolean };

type AccountRow = {
  id: number;
  name: string;
  description: string | null;
  academicYearId: number;
  balanceUSD: string;
  balanceCDF: string;
  academicYear: AcademicYearOpt;
  _count: { fees: number; transactions: number };
};

export default function AccountsCrud({
  initialAccounts,
  academicYears,
  defaultAcademicYearId,
  canWrite,
}: {
  initialAccounts: AccountRow[];
  academicYears: AcademicYearOpt[];
  defaultAcademicYearId: number | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [yearFilter, setYearFilter] = useState<string>(
    defaultAcademicYearId != null ? String(defaultAcademicYearId) : "",
  );
  const [create, setCreate] = useState({
    name: "",
    description: "",
    academicYearId: defaultAcademicYearId != null ? String(defaultAcademicYearId) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!yearFilter) return initialAccounts;
    return initialAccounts.filter((a) => String(a.academicYearId) === yearFilter);
  }, [initialAccounts, yearFilter]);

  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(filtered, {
    defaultKey: "name",
    getters: {
      name: (r) => r.name,
      year: (r) => r.academicYear.name,
      balanceUSD: (r) => Number(r.balanceUSD),
      balanceCDF: (r) => Number(r.balanceCDF),
      fees: (r) => r._count.fees,
      transactions: (r) => r._count.transactions,
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: create.name,
          description: create.description,
          academicYearId: Number(create.academicYearId),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de création");
        return;
      }
      setCreate({
        name: "",
        description: "",
        academicYearId: create.academicYearId,
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!canWrite) return;
    setError(null);
    if (!window.confirm("Supprimer ce compte ?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/accounts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de suppression");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCrudLayout}>
      {canWrite ? (
        <div className={adminCard}>
          <h2 className={adminSectionTitle}>Créer un compte</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Un compte par année scolaire (ex. Encaissement École, Encaissement État). Les paiements de frais liés
            créditent automatiquement le compte.
          </p>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className={adminFormGrid}>
              <div>
                <label className={adminLabel}>Nom</label>
                <input
                  required
                  placeholder="Nom du compte"
                  className={`mt-2 ${adminInput}`}
                  value={create.name}
                  onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={adminLabel}>Année scolaire</label>
                <select
                  required
                  className={`mt-2 ${adminInput}`}
                  value={create.academicYearId}
                  onChange={(e) => setCreate((c) => ({ ...c, academicYearId: e.target.value }))}
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.isCurrent ? " (en cours)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={adminLabel}>Description (optionnel)</label>
                <input
                  placeholder="Description"
                  className={`mt-2 ${adminInput}`}
                  value={create.description}
                  onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))}
                />
              </div>
            </div>
            <button disabled={submitting} type="submit" className={adminPrimaryButton}>
              {submitting ? "Enregistrement…" : "Créer le compte"}
            </button>
          </form>
        </div>
      ) : null}

      <div className={adminCard}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={adminSectionTitle}>Comptes d'encaissement</h2>
          <select
            className={adminInput}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Filtrer par année"
          >
            <option value="">Toutes les années</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isCurrent ? " (en cours)" : ""}
              </option>
            ))}
          </select>
        </div>

        {error ? <div className={`${adminErrorBox} mt-3`}>{error}</div> : null}

        <div className={`${adminTableWrap} mt-4`}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <SortableTh column="name" label="Nom" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="year" label="Année" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="balanceUSD" label="Solde USD" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="balanceCDF" label="Solde CDF" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="fees" label="Frais liés" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="transactions" label="Mouvements" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={adminTableEmpty}>
                    Aucun compte pour cette sélection.
                  </td>
                </tr>
              ) : (
                sortedRows.map((a) => (
                  <tr key={a.id} className={adminTr}>
                    <td className={adminTd}>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{a.name}</div>
                        {isMainFinanceAccountName(a.name) ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      {a.description ? (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{a.description}</div>
                      ) : null}
                    </td>
                    <td className={adminTdSm}>{a.academicYear.name}</td>
                    <td className={adminTd}>{a.balanceUSD} USD</td>
                    <td className={adminTd}>{a.balanceCDF} CDF</td>
                    <td className={adminTd}>{a._count.fees}</td>
                    <td className={adminTd}>{a._count.transactions}</td>
                    <td className={adminTd}>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/finance/accounts/${a.id}`} className={adminGhostButton}>
                          Détail
                        </Link>
                        {canWrite ? (
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleDelete(a.id)}
                            className={adminDangerButton}
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </div>
                    </td>
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

export function AccountBalanceCards({ balanceUSD, balanceCDF }: { balanceUSD: string; balanceCDF: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className={adminStatFees}>
        <div className="text-sm font-medium opacity-95">Solde USD</div>
        <div className="mt-2 text-2xl font-bold">{balanceUSD} USD</div>
      </div>
      <div className={adminStatWalletCDF}>
        <div className="text-sm font-medium opacity-95">Solde CDF</div>
        <div className="mt-2 text-2xl font-bold">{balanceCDF} CDF</div>
      </div>
    </div>
  );
}
