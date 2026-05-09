import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi } from "@/lib/rbac";

/** Sections, options et classes pour les filtres du rapport « École » (lecture finance). */
export async function GET() {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const [sections, options, schoolClasses] = await Promise.all([
    prisma.section.findMany({
      orderBy: { id: "asc" },
      select: { id: true, codeSection: true, nameSection: true },
    }),
    prisma.option.findMany({
      orderBy: { id: "asc" },
      select: { id: true, codeOption: true, nameOption: true, sectionId: true },
    }),
    prisma.schoolClass.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        codeClass: true,
        level: {
          select: {
            id: true,
            name: true,
            option: {
              select: {
                id: true,
                nameOption: true,
                section: { select: { id: true, nameSection: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const classes = schoolClasses.map((c) => ({
    id: c.id,
    codeClass: c.codeClass,
    levelId: c.level.id,
    levelName: c.level.name,
    optionId: c.level.option.id,
    optionName: c.level.option.nameOption,
    sectionId: c.level.option.section.id,
    sectionName: c.level.option.section.nameSection,
    label: `${c.level.option.section.nameSection} — ${c.level.name} — Classe ${c.codeClass}`,
  }));

  return NextResponse.json({ sections, options, classes });
}
