import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance } from "@/lib/auth";
import ReportsClient from "./ReportsClient";
import { adminCard, adminPage } from "../components/admin-ui";

export default async function AdminReportsPage() {
  await requireRoles((role) => canReadFinance(role));

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { startDate: true, endDate: true },
  });

  if (!currentYear) {
    return (
      <div className={adminPage}>
        <div className={adminCard}>
          Aucune année scolaire en cours. Veuillez la configurer via l’administrateur système.
        </div>
      </div>
    );
  }

  const initialStart = new Date(currentYear.startDate).toISOString().slice(0, 10);
  const initialEnd = new Date(currentYear.endDate).toISOString().slice(0, 10);

  return <ReportsClient initialStart={initialStart} initialEnd={initialEnd} />;
}
