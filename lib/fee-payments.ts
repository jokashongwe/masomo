import "server-only";

import { prisma } from "@/lib/prisma";
import type { Currency, FeePaymentSource, Prisma } from "@/generated/prisma/client";

type AllocationMode = "AUTO" | "MODULE" | "TRANCHE" | "TOTAL_DIRECT";

export type CreateFeePaymentInput = {
  studentId: number;
  feeId: number;
  currency: Currency;
  amount: number;
  paidAt?: Date;
  source: FeePaymentSource;
  bankSlipReference?: string;
  note?: string;
  allocationMode: AllocationMode;
  moduleId?: number;
  trancheId?: number;
};

function makeReceiptNumber() {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
  const rnd = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `REC-${stamp}-${rnd}`;
}

type DueLine = {
  key: string;
  moduleId: number | null;
  trancheId: number | null;
  due: number;
};

async function buildDueLinesForByModule(
  tx: Prisma.TransactionClient,
  feeId: number,
  currency: Currency,
): Promise<DueLine[]> {
  const [trancheAmounts, moduleAmounts, modules] = await Promise.all([
    tx.feeTrancheAmount.findMany({
      where: { feeId, currency },
      include: { tranche: { include: { module: true } } },
    }),
    tx.feeModuleAmount.findMany({
      where: { feeId, currency },
      include: { module: true },
    }),
    tx.billingModule.findMany({ orderBy: [{ startMonth: "asc" }, { startDay: "asc" }, { id: "asc" }] }),
  ]);

  const moduleOrder = new Map<number, number>();
  modules.forEach((m, idx) => moduleOrder.set(m.id, idx));

  if (trancheAmounts.length > 0) {
    return trancheAmounts
      .map((t) => ({
        key: `t:${t.trancheId}`,
        moduleId: t.tranche.moduleId,
        trancheId: t.trancheId,
        due: Number(t.amount),
        moduleOrder: moduleOrder.get(t.tranche.moduleId) ?? 999999,
      }))
      .sort((a, b) => a.moduleOrder - b.moduleOrder || (a.trancheId ?? 0) - (b.trancheId ?? 0))
      .map(({ key, moduleId, trancheId, due }) => ({ key, moduleId, trancheId, due }));
  }

  return moduleAmounts
    .map((m) => ({
      key: `m:${m.moduleId}`,
      moduleId: m.moduleId,
      trancheId: null,
      due: Number(m.amount),
      moduleOrder: moduleOrder.get(m.moduleId) ?? 999999,
    }))
    .sort((a, b) => a.moduleOrder - b.moduleOrder || (a.moduleId ?? 0) - (b.moduleId ?? 0))
    .map(({ key, moduleId, trancheId, due }) => ({ key, moduleId, trancheId, due }));
}

function allocateAmount(lines: DueLine[], alreadyPaid: Map<string, number>, amountToAllocate: number) {
  let remaining = amountToAllocate;
  const allocations: { moduleId: number | null; trancheId: number | null; amount: number }[] = [];

  for (const line of lines) {
    const paid = alreadyPaid.get(line.key) ?? 0;
    const outstanding = Math.max(0, line.due - paid);
    if (outstanding <= 0) continue;
    if (remaining <= 0) break;

    const part = Math.min(remaining, outstanding);
    if (part > 0) {
      allocations.push({ moduleId: line.moduleId, trancheId: line.trancheId, amount: part });
      remaining -= part;
    }
  }

  return { allocations, remaining };
}

export async function createFeePayment(input: CreateFeePaymentInput) {
  if (input.amount <= 0) throw new Error("Le montant doit être > 0");

  return prisma.$transaction(async (tx) => {
    const [student, fee, wallet] = await Promise.all([
      tx.student.findUnique({
        where: { id: input.studentId },
        select: { id: true, classId: true, academicYearId: true, schoolClass: { select: { levelId: true } } },
      }),
      tx.fee.findUnique({
        where: { id: input.feeId },
        include: {
          feeLevels: true,
          totalAmounts: true,
        },
      }),
      tx.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } }),
    ]);

    if (!student) throw new Error("Élève introuvable");
    if (!fee) throw new Error("Frais introuvable");
    if (!wallet) throw new Error("Wallet introuvable");

    const levelAllowed = fee.feeLevels.some((fl) => fl.levelId === student.schoolClass.levelId);
    if (!levelAllowed) throw new Error("Ce frais n'est pas attaché au niveau de l'élève");

    const paymentRows = await tx.feePayment.findMany({
      where: {
        studentId: student.id,
        academicYearId: student.academicYearId,
        feeId: fee.id,
        currency: input.currency,
      },
      select: {
        allocations: { select: { moduleId: true, trancheId: true, amount: true } },
      },
    });

    const alreadyPaid = new Map<string, number>();
    for (const p of paymentRows) {
      for (const a of p.allocations) {
        const key = a.trancheId ? `t:${a.trancheId}` : a.moduleId ? `m:${a.moduleId}` : "total";
        alreadyPaid.set(key, (alreadyPaid.get(key) ?? 0) + Number(a.amount));
      }
    }

    let allocationsToCreate: { moduleId: number | null; trancheId: number | null; amount: number }[] = [];

    if (fee.chargeType === "TOTAL") {
      if (input.allocationMode !== "TOTAL_DIRECT" && input.allocationMode !== "AUTO") {
        throw new Error("Ce frais n'est pas payable par module/tranche");
      }
      const due = Number(fee.totalAmounts.find((t) => t.currency === input.currency)?.amount ?? 0);
      const paid = alreadyPaid.get("total") ?? 0;
      const outstanding = Math.max(0, due - paid);
      if (input.amount > outstanding + 0.00001) {
        throw new Error("Montant supérieur au reste à payer pour ce frais");
      }
      allocationsToCreate = [{ moduleId: null, trancheId: null, amount: input.amount }];
    } else {
      const dueLines = await buildDueLinesForByModule(tx, fee.id, input.currency);
      if (dueLines.length === 0) throw new Error("Aucun montant configuré pour ce frais/devise");

      let targetLines = dueLines;
      if (input.allocationMode === "TRANCHE") {
        if (!input.trancheId) throw new Error("trancheId requis");
        targetLines = dueLines.filter((l) => l.trancheId === input.trancheId);
      } else if (input.allocationMode === "MODULE") {
        if (!input.moduleId) throw new Error("moduleId requis");
        targetLines = dueLines.filter((l) => l.moduleId === input.moduleId);
      } else if (input.allocationMode === "TOTAL_DIRECT") {
        throw new Error("TOTAL_DIRECT n'est pas valide pour un frais payable par module/tranche");
      }

      if (targetLines.length === 0) {
        throw new Error("Aucune ligne payable trouvée pour cette sélection");
      }

      const { allocations, remaining } = allocateAmount(targetLines, alreadyPaid, input.amount);
      if (remaining > 0.00001) {
        throw new Error("Montant supérieur au reste à payer pour la sélection");
      }
      allocationsToCreate = allocations;
    }

    const created = await tx.feePayment.create({
      data: {
        receiptNumber: makeReceiptNumber(),
        source: input.source,
        bankSlipReference: input.bankSlipReference,
        studentId: student.id,
        academicYearId: student.academicYearId,
        feeId: fee.id,
        currency: input.currency,
        amount: input.amount,
        paidAt: input.paidAt ?? new Date(),
        note: input.note,
        allocations: {
          create: allocationsToCreate.map((a) => ({
            currency: input.currency,
            amount: a.amount,
            moduleId: a.moduleId,
            trancheId: a.trancheId,
          })),
        },
      },
      select: { id: true, receiptNumber: true },
    });

    if (input.currency === "USD") {
      await tx.wallet.update({ where: { id: wallet.id }, data: { balanceUSD: { increment: input.amount } } });
    } else {
      await tx.wallet.update({ where: { id: wallet.id }, data: { balanceCDF: { increment: input.amount } } });
    }

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "FEE_PAYMENT",
        currency: input.currency,
        amount: input.amount,
        note: input.note ? `Paiement frais: ${input.note}` : "Paiement de frais",
        feePaymentId: created.id,
      },
    });

    return created;
  });
}

