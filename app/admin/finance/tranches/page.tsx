import { prisma } from "@/lib/prisma";
import TranchesCrud from "./TranchesCrud";
import { requireRoles, canReadFinance } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";

export default async function AdminFinanceTranchesPage() {
  await requireRoles((role) => canReadFinance(role));
  const [modules, tranches] = await Promise.all([
    prisma.billingModule.findMany({ orderBy: { id: "asc" } }),
    prisma.moduleTranche.findMany({ orderBy: { id: "asc" }, include: { module: true } }),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Tranches"
        subtitle="Les tranches appartiennent à un module, ont un code et une période (jour/mois), comme les modules."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <TranchesCrud initialModules={modules} initialTranches={tranches} />
      </div>
    </div>
  );
}
