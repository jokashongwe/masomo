import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma, StudentSex } from "@/generated/prisma/client";

export type TutorEnrollInput = {
  name: string;
  postnom: string;
  firstName: string;
  address: string;
  contact: string;
};

export type StudentEnrollInput = {
  name: string;
  postnom: string;
  firstName: string;
  sex: StudentSex;
  birthDate: Date;
};

/**
 * Inscrit un élève pour l’année scolaire en cours (même logique que POST /api/enrollments).
 */
export async function enrollStudentInCurrentYear(input: {
  classId: number;
  student: StudentEnrollInput;
  tutors: TutorEnrollInput[];
}): Promise<{ studentId: number }> {
  if (input.tutors.length === 0) {
    throw new Error("Au moins un tuteur est requis");
  }
  if (input.tutors.length > 10) {
    throw new Error("Maximum 10 tuteurs par élève");
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  if (!currentYear) {
    throw new Error("Aucune année scolaire en cours");
  }

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: input.classId },
    select: { id: true },
  });
  if (!schoolClass) {
    throw new Error("Classe introuvable");
  }

  const result = await prisma.$transaction(async (tx) => {
    const uniqueTutors = Array.from(
      new Map(input.tutors.map((t) => [t.contact.trim(), { ...t, contact: t.contact.trim() }])),
      ([, v]) => v,
    );

    const upsertedTutors = await Promise.all(
      uniqueTutors.map((t) =>
        tx.tutor.upsert({
          where: { contact: t.contact },
          update: {
            name: t.name,
            postnom: t.postnom,
            firstName: t.firstName,
            address: t.address,
          },
          create: {
            name: t.name,
            postnom: t.postnom,
            firstName: t.firstName,
            address: t.address,
            contact: t.contact,
          },
        }),
      ),
    );

    const createdStudent = await tx.student.create({
      data: {
        name: input.student.name,
        postnom: input.student.postnom,
        firstName: input.student.firstName,
        sex: input.student.sex,
        birthDate: input.student.birthDate,
        classId: input.classId,
        academicYearId: currentYear.id,
        studentTutors: {
          create: upsertedTutors.map((t) => ({
            tutor: { connect: { id: t.id } },
          })),
        },
      },
      select: { id: true },
    });

    return createdStudent;
  });

  return { studentId: result.id };
}

/** Résout l’id de classe à partir des codes hiérarchiques (école → section → option → niveau → classe). */
export async function resolveSchoolClassIdFromCodes(
  tx: Prisma.TransactionClient,
  input: {
    schoolId?: number;
    schoolName?: string;
    codeSection: string;
    codeOption: string;
    codeLevel: string;
    codeClass: string;
  },
): Promise<number | null> {
  const cs = input.codeSection.trim();
  const co = input.codeOption.trim();
  const cl = input.codeLevel.trim();
  const cc = input.codeClass.trim();
  if (!cs || !co || !cl || !cc) return null;

  let schoolId = input.schoolId;
  if (!schoolId && input.schoolName?.trim()) {
    const s = await tx.school.findFirst({
      where: { name: { equals: input.schoolName.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    schoolId = s?.id;
  }
  if (!schoolId) {
    const only = await tx.school.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
    schoolId = only?.id;
  }
  if (!schoolId) return null;

  const section = await tx.section.findFirst({
    where: { schoolId, codeSection: cs },
    select: { id: true },
  });
  if (!section) return null;

  const option = await tx.option.findFirst({
    where: { sectionId: section.id, codeOption: co },
    select: { id: true },
  });
  if (!option) return null;

  const level = await tx.level.findFirst({
    where: { optionId: option.id, codeLevel: cl },
    select: { id: true },
  });
  if (!level) return null;

  const schoolClass = await tx.schoolClass.findFirst({
    where: { levelId: level.id, codeClass: cc },
    select: { id: true },
  });
  return schoolClass?.id ?? null;
}
