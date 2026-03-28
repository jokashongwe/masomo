import { prisma } from "@/lib/prisma";
import { requireRoles, isSystemAdmin } from "@/lib/auth";
import UsersCrud from "./UsersCrud";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

export default async function AdminUsersPage() {
  await requireRoles((role) => isSystemAdmin(role));
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Sécurité"
        title="Utilisateurs"
        subtitle="Réservé à l’administrateur système."
      />
      <div className="mt-6">
        <UsersCrud initialUsers={users} />
      </div>
    </div>
  );
}
