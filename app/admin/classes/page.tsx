import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import ClassCrud from "./ClassCrud";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";

function parseIntSafe(value: string | string[] | undefined, fallback: number) {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  await requireRoles((role) => canManageSchool(role));
  const sp = (await searchParams) ?? {};

  const qRaw = sp.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;

  const levelIdRaw = sp.levelId;
  const levelIdStr = Array.isArray(levelIdRaw) ? levelIdRaw[0] : levelIdRaw;
  const levelIdFilter =
    levelIdStr && levelIdStr.length > 0 ? Number(levelIdStr) : undefined;
  const validLevelFilter =
    levelIdFilter !== undefined && Number.isFinite(levelIdFilter) ? levelIdFilter : undefined;

  const page = parseIntSafe(sp.page, 1);
  const take = parseIntSafe(sp.take, 10);

  const where: Prisma.SchoolClassWhereInput = {};
  if (validLevelFilter !== undefined) {
    where.levelId = validLevelFilter;
  }
  if (q && q.trim().length > 0) {
    const t = q.trim();
    where.OR = [
      { codeClass: { contains: t, mode: "insensitive" } },
      { level: { name: { contains: t, mode: "insensitive" } } },
      { level: { codeLevel: { contains: t, mode: "insensitive" } } },
      { level: { option: { nameOption: { contains: t, mode: "insensitive" } } } },
      { level: { option: { codeOption: { contains: t, mode: "insensitive" } } } },
      { level: { option: { section: { nameSection: { contains: t, mode: "insensitive" } } } } },
      { level: { option: { section: { codeSection: { contains: t, mode: "insensitive" } } } } },
      { level: { option: { section: { school: { name: { contains: t, mode: "insensitive" } } } } } },
    ];
  }

  const [levels, total, pagedClasses] = await Promise.all([
    prisma.level.findMany({
      orderBy: { id: "asc" },
      include: { option: { include: { section: { include: { school: true } } } } },
    }),
    prisma.schoolClass.count({ where }),
    prisma.schoolClass.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (page - 1) * take,
      take,
      select: { id: true, codeClass: true, levelId: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / take));

  const levelOptions = levels.map((l) => ({
    id: l.id,
    label: `${l.codeLevel} - ${l.name} (${l.option.section.codeSection}) - ${l.option.section.school.name}`,
  }));

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Structure"
        title="Classes"
        subtitle="Assigner des codes de classe aux niveaux. Liste paginée avec recherche et filtre par niveau."
      />
      <div className="mt-6">
        <ClassCrud
          initialLevels={levels}
          pagedClasses={pagedClasses}
          levelOptions={levelOptions}
          listTotal={total}
          listPage={page}
          listPageCount={pageCount}
          listQ={q ?? ""}
          listLevelIdStr={validLevelFilter !== undefined ? String(validLevelFilter) : ""}
          listTake={take}
        />
      </div>
    </div>
  );
}
