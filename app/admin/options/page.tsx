import { prisma } from "@/lib/prisma";
import OptionCrud from "./OptionCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";

export default async function AdminOptionsPage() {
  await requireRoles((role) => canManageSchool(role));
  const [sections, options] = await Promise.all([
    prisma.section.findMany({ orderBy: { id: "asc" }, select: { id: true, codeSection: true, nameSection: true, school: { select: { name: true } } } }),
    prisma.option.findMany({ orderBy: { id: "asc" }, include: { section: { include: { school: true } } } }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Options</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Gérer les options des sections.</p>
        </div>
        <a href="/admin" className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40">
          Retour
        </a>
      </div>
      <div className="mt-6">
        <OptionCrud initialSections={sections} initialOptions={options} />
      </div>
    </div>
  );
}

