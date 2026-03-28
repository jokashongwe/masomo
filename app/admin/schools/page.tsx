import { prisma } from "@/lib/prisma";
import SchoolCrud from "./SchoolCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminSchoolsPage() {
  await requireRoles((role) => canManageSchool(role));
  const schools = await prisma.school.findMany({ orderBy: { id: "asc" } });
  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Structure"
        title="Écoles"
        subtitle="Créer, modifier et supprimer des écoles."
      />
      <div className="mt-6">
        <SchoolCrud initialSchools={schools} />
      </div>
    </div>
  );
}
