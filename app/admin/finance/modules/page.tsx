import { prisma } from "@/lib/prisma";
import ModulesCrud from "./ModulesCrud";
import { requireRoles, canReadFinance } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";

export default async function AdminFinanceModulesPage() {
  await requireRoles((role) => canReadFinance(role));
  const modules = await prisma.billingModule.findMany({
    orderBy: { id: "asc" },
    include: { tranches: { orderBy: { id: "asc" } } },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Modules de facturation"
        subtitle="Chaque module a un début/fin (jour/mois) et des tranches."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <ModulesCrud initialModules={modules} />
      </div>
    </div>
  );
}
