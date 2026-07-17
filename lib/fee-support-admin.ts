import "server-only";

import { prisma } from "@/lib/prisma";
import { clampReductionPercent } from "@/lib/student-fee-support";

export type FeeSupportReductionInput = { feeId: number; reductionPercent: number };

export async function validateFeeSupportReductions(
  studentId: number,
  reductions: FeeSupportReductionInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!reductions.length) {
    return { ok: false, error: "Ajoutez au moins une réduction par frais" };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolClass: { select: { levelId: true } } },
  });
  if (!student) return { ok: false, error: "Élève introuvable" };

  const feeIds = [...new Set(reductions.map((r) => r.feeId))];
  if (feeIds.length !== reductions.length) {
    return { ok: false, error: "Chaque frais ne peut apparaître qu'une fois" };
  }

  const fees = await prisma.fee.findMany({
    where: { id: { in: feeIds } },
    select: { id: true, code: true, name: true, feeLevels: { select: { levelId: true } } },
  });
  if (fees.length !== feeIds.length) {
    return { ok: false, error: "Un ou plusieurs frais sont introuvables" };
  }

  const levelId = student.schoolClass.levelId;
  for (const fee of fees) {
    const allowed = fee.feeLevels.some((fl) => fl.levelId === levelId);
    if (!allowed) {
      return { ok: false, error: `Le frais ${fee.code} n'est pas applicable au niveau de l'élève` };
    }
  }

  for (const r of reductions) {
    const pct = clampReductionPercent(r.reductionPercent);
    if (pct !== r.reductionPercent && !Number.isFinite(r.reductionPercent)) {
      return { ok: false, error: "Pourcentage de réduction invalide" };
    }
    if (pct < 0 || pct > 100) {
      return { ok: false, error: "La réduction doit être entre 0 et 100 %" };
    }
  }

  return { ok: true };
}

export function normalizeReductions(reductions: FeeSupportReductionInput[]): FeeSupportReductionInput[] {
  return reductions.map((r) => ({
    feeId: r.feeId,
    reductionPercent: clampReductionPercent(r.reductionPercent),
  }));
}
