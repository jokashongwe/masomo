import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, isSystemAdmin, requireRoles } from "@/lib/auth";
import { isMainFinanceAccountName } from "@/lib/finance-account-labels";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";
import AccountsCrud from "./AccountsCrud";

export default async function AdminFinanceAccountsPage() {
  const user = await requireRoles(canReadFinance);
  const canWrite = canWriteFinance(user.roles);
  const canSeeMainAccount = isSystemAdmin(user.roles);

  const academicYears = await prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { id: true, name: true, isCurrent: true },
  });
  const defaultAcademicYearId =
    academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? null;

  const accountsRaw = await prisma.financeAccount.findMany({
    orderBy: [{ academicYearId: "desc" }, { name: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      _count: { select: { fees: true, transactions: true } },
    },
  });

  const accounts = canSeeMainAccount
    ? accountsRaw
    : accountsRaw.filter((a) => !isMainFinanceAccountName(a.name));

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Comptes"
        subtitle={
          canSeeMainAccount
            ? "Comptes d’encaissement par année scolaire. Crédités par les paiements de frais liés ; retraits réservés à l’administrateur système."
            : "Comptes d’encaissement par année scolaire (hors compte principal). Crédités par les paiements de frais liés."
        }
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
