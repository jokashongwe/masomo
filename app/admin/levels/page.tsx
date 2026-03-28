import { prisma } from "@/lib/prisma";
import LevelCrud from "./LevelCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";

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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Niveaux</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Gérer les niveaux des options.</p>
        </div>
        <a
          href="/admin"
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
        >
          Retour
        </a>
      </div>

      <div className="mt-6">
        <LevelCrud initialOptions={options} initialLevels={levels} />
      </div>
    </div>
  );
}

