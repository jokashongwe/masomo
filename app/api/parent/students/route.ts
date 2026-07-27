import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireParentApi } from "@/lib/parent-rbac";

const querySchema = z.object({
  academicYearId: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const auth = await requireParentApi(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    academicYearId: url.searchParams.get("academicYearId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  let academicYearId = parsed.data.academicYearId;
  if (!academicYearId) {
    const current = await prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    });
    academicYearId = current?.id;
  }

  const links = await prisma.studentTutor.findMany({
    where: {
      tutorId: auth.tutor.id,
      ...(academicYearId
        ? { student: { academicYearId } }
        : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          name: true,
          postnom: true,
          matricule: true,
          status: true,
          sex: true,
          birthDate: true,
          academicYear: { select: { id: true, name: true, isCurrent: true } },
          schoolClass: {
            select: {
              id: true,
              codeClass: true,
              level: {
                select: {
                  id: true,
                  codeLevel: true,
                  name: true,
                  option: { select: { id: true, nameOption: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { studentId: "asc" },
  });

  const students = links.map(({ student: s }) => {
    const ordinal = s.schoolClass.level.codeLevel === "1" ? "ère" : "ème";
    const classLabel = `${s.schoolClass.level.codeLevel}${ordinal} ${s.schoolClass.level.option.nameOption} ${s.schoolClass.codeClass}`;
    return {
      id: s.id,
      firstName: s.firstName,
      name: s.name,
      postnom: s.postnom,
      matricule: s.matricule,
      status: s.status,
      sex: s.sex,
      birthDate: s.birthDate.toISOString().slice(0, 10),
      classLabel,
      academicYear: s.academicYear,
      class: {
        id: s.schoolClass.id,
        codeClass: s.schoolClass.codeClass,
        level: s.schoolClass.level,
      },
    };
  });

  return NextResponse.json({ students });
}
