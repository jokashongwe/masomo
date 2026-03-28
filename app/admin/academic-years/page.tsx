import { prisma } from "@/lib/prisma";
import { requireRoles, isSystemAdmin } from "@/lib/auth";
import AcademicYearsCrud from "./AcademicYearsCrud";

export default async function AdminAcademicYearsPage() {
  await requireRoles((role) => isSystemAdmin(role));
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Années scolaires</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Gérer les années scolaires. Exactement une année doit être marquée “en cours”.
      </p>
      <div className="mt-6">
        <AcademicYearsCrud initialYears={years} />
      </div>
    </div>
  );
}

