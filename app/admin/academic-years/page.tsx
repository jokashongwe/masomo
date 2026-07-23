import { prisma } from "@/lib/prisma";
import { requireRoles, isSystemAdmin } from "@/lib/auth";
import AcademicYearsCrud from "./AcademicYearsCrud";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminAcademicYearsPage() {
  await requireRoles(isSystemAdmin);
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Configuration"
        title="Années scolaires"
        subtitle="Gérer les années scolaires, marquer l’année en cours, et clôturer l’année pour promouvoir les élèves."
      />
      <div className="mt-6">
        <AcademicYearsCrud initialYears={years} />
      </div>
    </div>
  );
}
