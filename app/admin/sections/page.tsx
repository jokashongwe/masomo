import { prisma } from "@/lib/prisma";
import SectionCrud from "./SectionCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminSectionsPage() {
  await requireRoles((role) => canManageSchool(role));
  const [schools, sections] = await Promise.all([
    prisma.school.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } }),
    prisma.section.findMany({
      orderBy: { id: "asc" },
      include: { school: true },
    }),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Structure"
        title="Sections"
        subtitle="Gérer les sections des écoles."
      />
      <div className="mt-6">
        <SectionCrud initialSchools={schools} initialSections={sections} />
      </div>
    </div>
  );
}
