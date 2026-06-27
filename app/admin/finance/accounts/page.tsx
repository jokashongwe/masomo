import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, requireRoles } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";
import AccountsCrud from "./AccountsCrud";

export default async function AdminFinanceAccountsPage() {
  const user = await requireRoles((role) => canReadFinance(role));
  const canWrite = canWriteFinance(user.role);

  const academicYears = await prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { id: true, name: true, isCurrent: true },
  });
  const defaultAcademicYearId =
    academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? null;

  const accounts = await prisma.financeAccount.findMany({
    orderBy: [{ academicYearId: "desc" }, { name: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      _count: { select: { fees: true, transactions: true } },
    },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Comptes"
        subtitle="Comptes d’encaissement par année scolaire. Crédités par les paiements de frais liés ; retraits réservés à l’administrateur système."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <AccountsCrud
          initialAccounts={accounts.map((a) => ({
            ...a,
            balanceUSD: a.balanceUSD.toString(),
            balanceCDF: a.balanceCDF.toString(),
          }))}
          academicYears={academicYears}
          defaultAcademicYearId={defaultAcademicYearId}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
