import { prisma } from "@/lib/prisma";
import { requireRoles, isSystemAdmin } from "@/lib/auth";
import UsersCrud from "./UsersCrud";

export default async function AdminUsersPage() {
  await requireRoles((role) => isSystemAdmin(role));
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Utilisateurs</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Réservé à l’administrateur système.</p>
        </div>
        <a
          href="/admin"
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
        >
          Retour
        </a>
      </div>

      <div className="mt-6">
        <UsersCrud initialUsers={users} />
      </div>
    </div>
  );
}

