import { prisma } from "@/lib/prisma";
import LevelCrud from "./LevelCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminLevelsPage() {
  await requireRoles((role) => canManageSchool(role));
  const [options, levels] = await Promise.all([
    prisma.option.findMany({
      orderBy: { id: "asc" },
      include: { section: { include: { school: true } } },
    }),
    prisma.level.findMany({
      orderBy: { id: "asc" },
      include: { option: { include: { section: { include: { school: true } } } } },
    }),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader kicker="Structure" title="Niveaux" subtitle="Gérer les niveaux des options." />
      <div className="mt-6">
        <LevelCrud initialOptions={options} initialLevels={levels} />
      </div>
    </div>
  );
}
