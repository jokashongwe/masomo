import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance, canWriteFinance } from "@/lib/auth";
import CautionClient from "./CautionClient";
import AdminPageHeader from "../components/AdminPageHeader";
import {
  adminCard,
  adminPage,
  adminSecondaryButton,
  adminStatFees,
  adminStatWalletCDF,
} from "../components/admin-ui";

export default async function AdminWalletPage() {
  const user = await requireRoles(canReadFinance);
  const canWrite = canWriteFinance(user.roles);

  const academicYears = await prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { id: true, name: true, isCurrent: true },
  });
  const defaultAcademicYearId =
    academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? null;

  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, balanceUSD: true, balanceCDF: true },
  });

  const transactions = wallet
    ? await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          type: true,
          currency: true,
          amount: true,
          note: true,
          createdAt: true,
          academicYear: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Trésorerie"
        title="Caution"
        subtitle="Dépôts et retraits sur le compte de caution (soldes USD / CDF)."
        actions={
          <Link href="/admin/wallet/expenses" className={adminSecondaryButton}>
            Dépenses
          </Link>
        }
        backLabel="Retour à l’admin"
      />

      {wallet ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={adminStatFees}>
            <div className="text-sm font-medium opacity-95">Solde USD</div>
            <div className="mt-2 text-2xl font-bold">{wallet.balanceUSD.toString()} USD</div>
          </div>
          <div className={adminStatWalletCDF}>
            <div className="text-sm font-medium opacity-95">Solde CDF</div>
            <div className="mt-2 text-2xl font-bold">{wallet.balanceCDF.toString()} CDF</div>
          </div>
        </div>
      ) : (
        <div className={`${adminCard} mt-6`}>
          Compte de caution introuvable. Lancez le seed ou créez-en un via l’administrateur système.
        </div>
      )}

      {wallet ? (
        <CautionClient
          canWrite={canWrite}
          academicYears={academicYears.map(({ id, name }) => ({ id, name }))}
          defaultAcademicYearId={defaultAcademicYearId}
          transactions={transactions.map((t) => ({
            id: t.id,
            type: t.type,
            currency: t.currency,
            amount: t.amount.toString(),
            note: t.note,
            createdAt: t.createdAt.toISOString(),
            academicYearName: t.academicYear.name,
          }))}
        />
      ) : null}
    </div>
  );
}
