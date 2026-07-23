import "server-only";

import { prisma } from "@/lib/prisma";
import { pickClassOnLevel, resolveNextLevel } from "@/lib/level-progression";

export type CloseAcademicYearResult = {
  closedYearId: number;
  targetYearId: number;
  promoted: number;
  graduated: number;
  skippedNoPayment: number;
  skippedNoClass: number;
  errors: string[];
};

/**
 * Clôture une année scolaire :
 * - les élèves ENROLLED avec ≥1 paiement de frais sur cette année passent au niveau supérieur
 *   (ou GRADUATED s'il n'y a pas de niveau suivant) et sont rattachés à l'année cible ;
 * - l'année cible devient l'année en cours.
 */
export async function closeAcademicYear(input: {
  closedYearId: number;
  targetYearId: number;
}): Promise<CloseAcademicYearResult> {
  if (input.closedYearId === input.targetYearId) {
    throw new Error("L'année à clôturer et l'année cible doivent être différentes");
  }

  return prisma.$transaction(async (tx) => {
    const [closedYear, targetYear] = await Promise.all([
      tx.academicYear.findUnique({
        where: { id: input.closedYearId },
        select: { id: true, name: true, isCurrent: true },
      }),
      tx.academicYear.findUnique({
        where: { id: input.targetYearId },
        select: { id: true, name: true },
      }),
    ]);

    if (!closedYear) throw new Error("Année à clôturer introuvable");
    if (!targetYear) throw new Error("Année cible introuvable");
    if (!closedYear.isCurrent) {
      throw new Error("Seule l'année scolaire en cours peut être clôturée");
    }

    const students = await tx.student.findMany({
      where: { academicYearId: closedYear.id, status: "ENROLLED" },
      select: {
        id: true,
        firstName: true,
        name: true,
        postnom: true,
        matricule: true,
        classId: true,
        schoolClass: {
          select: {
            id: true,
            codeClass: true,
            level: {
              select: {
                id: true,
                codeLevel: true,
                name: true,
                nextLevel: true,
                optionId: true,
              },
            },
          },
        },
        _count: {
          select: {
            feePayments: { where: { academicYearId: closedYear.id } },
          },
        },
      },
    });

    let promoted = 0;
    let graduated = 0;
    let skippedNoPayment = 0;
    let skippedNoClass = 0;
    const errors: string[] = [];

    for (const student of students) {
      const label = `${student.firstName} ${student.name} ${student.postnom}`.trim();

      if (student._count.feePayments < 1) {
        skippedNoPayment += 1;
        continue;
      }

      const nextLevel = await resolveNextLevel(tx, student.schoolClass.level);
      if (!nextLevel) {
        await tx.student.update({
          where: { id: student.id },
          data: { status: "GRADUATED" },
        });
        graduated += 1;
        continue;
      }

      const targetClass = await pickClassOnLevel(
        tx,
        nextLevel.id,
        student.schoolClass.codeClass,
      );
      if (!targetClass) {
        skippedNoClass += 1;
        errors.push(
          `${label} : aucune classe sur le niveau ${nextLevel.codeLevel} (${nextLevel.name})`,
        );
        continue;
      }

      // Éviter conflit de matricule sur l'année cible
      if (student.matricule) {
        const clash = await tx.student.findFirst({
          where: {
            academicYearId: targetYear.id,
            matricule: student.matricule,
            id: { not: student.id },
          },
          select: { id: true },
        });
        if (clash) {
          errors.push(`${label} : matricule déjà utilisé sur ${targetYear.name}`);
          continue;
        }
      }

      await tx.student.update({
        where: { id: student.id },
        data: {
          classId: targetClass.id,
          academicYearId: targetYear.id,
          status: "ENROLLED",
        },
      });
      promoted += 1;
    }

    await tx.academicYear.updateMany({ data: { isCurrent: false } });
    await tx.academicYear.update({
      where: { id: targetYear.id },
      data: { isCurrent: true },
    });

    return {
      closedYearId: closedYear.id,
      targetYearId: targetYear.id,
      promoted,
      graduated,
      skippedNoPayment,
      skippedNoClass,
      errors,
    };
  });
}
