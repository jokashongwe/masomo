import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance } from "@/lib/auth";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
  await requireRoles((role) => canReadFinance(role));

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { startDate: true, endDate: true },
  });

  if (!currentYear) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white/60 dark:bg-black/40">
          Aucune année scolaire en cours. Veuillez la configurer via l’administrateur système.
        </div>
      </div>
    );
  }

  const initialStart = new Date(currentYear.startDate).toISOString().slice(0, 10);
  const initialEnd = new Date(currentYear.endDate).toISOString().slice(0, 10);

  return <ReportsClient initialStart={initialStart} initialEnd={initialEnd} />;
}

