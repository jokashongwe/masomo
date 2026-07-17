import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/** Montant dû après application d'une réduction (0–100 %). */
export function applyFeeReduction(baseDue: number, reductionPercent: number): number {
  const pct = Math.min(100, Math.max(0, reductionPercent));
  return Math.max(0, baseDue * (1 - pct / 100));
}

export async function getStudentFeeReductionPercent(
  tx: Prisma.TransactionClient,
  input: { studentId: number; academicYearId: number; feeId: number },
): Promise<number> {
  const row = await tx.studentFeeSupportReduction.findFirst({
    where: {
      feeId: input.feeId,
      support: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
    },
    select: { reductionPercent: true },
  });
  if (!row) return 0;
  return Number(row.reductionPercent);
}

export async function getStudentFeeReductionPercents(
  tx: Prisma.TransactionClient,
  input: { studentId: number; academicYearId: number; feeIds: number[] },
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!input.feeIds.length) return map;
  const rows = await tx.studentFeeSupportReduction.findMany({
    where: {
      feeId: { in: input.feeIds },
      support: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
    },
    select: { feeId: true, reductionPercent: true },
  });
  for (const r of rows) {
    map.set(r.feeId, Number(r.reductionPercent));
  }
  return map;
}

export function clampReductionPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
