import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance, canWriteFinance } from "@/lib/auth";
import DepositForm from "./DepositForm";
import AdminPageHeader from "../components/AdminPageHeader";
import {
  adminCard,
  adminPage,
  adminSecondaryButton,
  adminStatFees,
  adminStatWalletCDF,
} from "../components/admin-ui";

export default async function AdminWalletPage() {
  const user = await requireRoles((role) => canReadFinance(role));
  const canWrite = canWriteFinance(user.role);

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

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Trésorerie"
        title="Budget"
        subtitle="Gérer les soldes USD/CDF et les dépenses."
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
            <div className="text-sm font-medium opacity-95">Balance USD</div>
            <div className="mt-2 text-2xl font-bold">{wallet.balanceUSD.toString()} USD</div>
          </div>
          <div className={adminStatWalletCDF}>
            <div className="text-sm font-medium opacity-95">Balance CDF</div>
            <div className="mt-2 text-2xl font-bold">{wallet.balanceCDF.toString()} CDF</div>
          </div>
        </div>
      ) : (
        <div className={`${adminCard} mt-6`}>
          Budget introuvable. Lancez le seed ou créez-en un via l’administrateur système.
        </div>
      )}

      <div className="mt-6">
        <DepositForm
          canWrite={canWrite}
          academicYears={academicYears.map(({ id, name }) => ({ id, name }))}
          defaultAcademicYearId={defaultAcademicYearId}
        />
      </div>
    </div>
  );
}
