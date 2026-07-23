import "server-only";

import { prisma } from "@/lib/prisma";
import { clampAmountToPay, clampReductionPercent } from "@/lib/student-fee-support";

export type FeeSupportReductionInput =
  | { feeId: number; mode: "PERCENT"; reductionPercent: number }
  | {
      feeId: number;
      mode: "FIXED_AMOUNT";
      amountToPayUSD: number | null;
      amountToPayCDF: number | null;
    };

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
    if (r.mode === "PERCENT") {
      if (!Number.isFinite(r.reductionPercent) || r.reductionPercent < 0 || r.reductionPercent > 100) {
        return { ok: false, error: "La réduction doit être entre 0 et 100 %" };
      }
    } else {
      const usd = r.amountToPayUSD;
      const cdf = r.amountToPayCDF;
      if (usd == null && cdf == null) {
        return { ok: false, error: "Indiquez au moins un montant à payer (USD et/ou CDF)" };
      }
      if (usd != null && (!Number.isFinite(usd) || usd < 0)) {
        return { ok: false, error: "Montant USD invalide" };
      }
      if (cdf != null && (!Number.isFinite(cdf) || cdf < 0)) {
        return { ok: false, error: "Montant CDF invalide" };
      }
    }
  }

  return { ok: true };
}

export function normalizeReductions(reductions: FeeSupportReductionInput[]): FeeSupportReductionInput[] {
  return reductions.map((r) => {
    if (r.mode === "PERCENT") {
      return {
        feeId: r.feeId,
        mode: "PERCENT" as const,
        reductionPercent: clampReductionPercent(r.reductionPercent),
      };
    }
    return {
      feeId: r.feeId,
      mode: "FIXED_AMOUNT" as const,
      amountToPayUSD: clampAmountToPay(r.amountToPayUSD),
      amountToPayCDF: clampAmountToPay(r.amountToPayCDF),
    };
  });
}

export function reductionCreateData(r: FeeSupportReductionInput) {
  if (r.mode === "PERCENT") {
    return {
      feeId: r.feeId,
      mode: "PERCENT" as const,
      reductionPercent: r.reductionPercent,
      amountToPayUSD: null,
      amountToPayCDF: null,
    };
  }
  return {
    feeId: r.feeId,
    mode: "FIXED_AMOUNT" as const,
    reductionPercent: null,
    amountToPayUSD: r.amountToPayUSD,
    amountToPayCDF: r.amountToPayCDF,
  };
}
