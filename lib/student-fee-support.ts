import "server-only";

import type { Currency, Prisma } from "@/generated/prisma/client";

export type FeeSupportRule =
  | { mode: "PERCENT"; reductionPercent: number }
  | {
      mode: "FIXED_AMOUNT";
      amountToPayUSD: number | null;
      amountToPayCDF: number | null;
    };

/** Montant dû après application d'une réduction (0–100 %). */
export function applyFeeReduction(baseDue: number, reductionPercent: number): number {
  const pct = Math.min(100, Math.max(0, reductionPercent));
  return Math.max(0, baseDue * (1 - pct / 100));
}

export function applySupportToDue(
  baseDue: number,
  rule: FeeSupportRule | null,
  currency: Currency,
): number {
  if (!rule) return baseDue;
  if (rule.mode === "PERCENT") {
    return applyFeeReduction(baseDue, rule.reductionPercent);
  }
  const target = currency === "USD" ? rule.amountToPayUSD : rule.amountToPayCDF;
  if (target == null) return baseDue;
  return Math.max(0, Math.min(baseDue, target));
}

/** Répartit un montant fixe à payer au prorata des lignes (frais par module/tranche). */
export function applySupportToDueLines(
  baseDues: number[],
  rule: FeeSupportRule | null,
  currency: Currency,
): number[] {
  if (!rule) return [...baseDues];
  if (rule.mode === "PERCENT") {
    return baseDues.map((d) => applyFeeReduction(d, rule.reductionPercent));
  }
  const target = currency === "USD" ? rule.amountToPayUSD : rule.amountToPayCDF;
  if (target == null) return [...baseDues];
  const totalBase = baseDues.reduce((s, d) => s + d, 0);
  if (totalBase <= 0) return baseDues.map(() => 0);
  const capped = Math.min(Math.max(0, target), totalBase);
  return baseDues.map((d) => (d / totalBase) * capped);
}

function rowToRule(row: {
  mode: string;
  reductionPercent: unknown;
  amountToPayUSD: unknown;
  amountToPayCDF: unknown;
}): FeeSupportRule {
  if (row.mode === "FIXED_AMOUNT") {
    return {
      mode: "FIXED_AMOUNT",
      amountToPayUSD: row.amountToPayUSD != null ? Number(row.amountToPayUSD) : null,
      amountToPayCDF: row.amountToPayCDF != null ? Number(row.amountToPayCDF) : null,
    };
  }
  return {
    mode: "PERCENT",
    reductionPercent: row.reductionPercent != null ? Number(row.reductionPercent) : 0,
  };
}

export async function getStudentFeeSupport(
  tx: Prisma.TransactionClient,
  input: { studentId: number; academicYearId: number; feeId: number },
): Promise<FeeSupportRule | null> {
  const row = await tx.studentFeeSupportReduction.findFirst({
    where: {
      feeId: input.feeId,
      support: {
        studentId: input.studentId,
        academicYearId: input.academicYearId,
      },
    },
    select: {
      mode: true,
      reductionPercent: true,
      amountToPayUSD: true,
      amountToPayCDF: true,
    },
  });
  if (!row) return null;
  return rowToRule(row);
}

/** @deprecated Prefer getStudentFeeSupport — conservé pour compat. */
export async function getStudentFeeReductionPercent(
  tx: Prisma.TransactionClient,
  input: { studentId: number; academicYearId: number; feeId: number },
): Promise<number> {
  const rule = await getStudentFeeSupport(tx, input);
  if (!rule || rule.mode !== "PERCENT") return 0;
  return rule.reductionPercent;
}

export function clampReductionPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function clampAmountToPay(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

export function formatFeeSupportRule(rule: {
  mode: string;
  reductionPercent: number | null;
  amountToPayUSD: number | null;
  amountToPayCDF: number | null;
}): string {
  if (rule.mode === "FIXED_AMOUNT") {
    const parts: string[] = [];
    if (rule.amountToPayUSD != null) parts.push(`${rule.amountToPayUSD} USD`);
    if (rule.amountToPayCDF != null) parts.push(`${rule.amountToPayCDF} CDF`);
    return parts.length ? `à payer ${parts.join(" / ")}` : "montant fixe";
  }
  return `${rule.reductionPercent ?? 0}%`;
}
