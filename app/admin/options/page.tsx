import { prisma } from "@/lib/prisma";
import OptionCrud from "./OptionCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminOptionsPage() {
  await requireRoles((role) => canManageSchool(role));
  const [sections, options] = await Promise.all([
    prisma.section.findMany({
      orderBy: { id: "asc" },
      select: { id: true, codeSection: true, nameSection: true, school: { select: { name: true } } },
    }),
    prisma.option.findMany({ orderBy: { id: "asc" }, include: { section: { include: { school: true } } } }),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader kicker="Structure" title="Options" subtitle="Gérer les options des sections." />
      <div className="mt-6">
        <OptionCrud initialSections={sections} initialOptions={options} />
      </div>
    </div>
  );
}
