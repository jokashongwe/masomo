import "server-only";

import { prisma } from "@/lib/prisma";
import type { Currency, FeePaymentSource, Prisma } from "@/generated/prisma/client";

type AllocationMode = "AUTO" | "MODULE" | "TRANCHE" | "TOTAL_DIRECT" | "TRANSHES_MULTI";

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
  /** Plusieurs tranches avec montant chacune (total ou partiel par tranche). */
  tranchePayments?: { trancheId: number; amount: number }[];
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

function mergeTranchePayments(lines: { trancheId: number; amount: number }[]) {
  const m = new Map<number, number>();
  for (const l of lines) {
    if (l.amount <= 0 || !Number.isFinite(l.amount)) continue;
    m.set(l.trancheId, (m.get(l.trancheId) ?? 0) + l.amount);
  }
  return Array.from(m.entries()).map(([trancheId, amount]) => ({ trancheId, amount }));
}

export type TrancheOutstandingRow = {
  trancheId: number;
  moduleId: number | null;
  codeTranche: string;
  moduleName: string;
  due: number;
  paid: number;
  outstanding: number;
};

/** Reste à payer par tranche pour un élève / frais / devise (frais BY_MODULE avec montants tranche). */
export async function getTrancheOutstandingsForStudent(input: {
  studentId: number;
  feeId: number;
  currency: Currency;
}): Promise<TrancheOutstandingRow[]> {
  const [student, fee] = await Promise.all([
    prisma.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, academicYearId: true, schoolClass: { select: { levelId: true } } },
    }),
    prisma.fee.findUnique({
      where: { id: input.feeId },
      include: { feeLevels: true },
    }),
  ]);

  if (!student || !fee) return [];
  if (fee.chargeType !== "BY_MODULE") return [];

  const levelAllowed = fee.feeLevels.some((fl) => fl.levelId === student.schoolClass.levelId);
  if (!levelAllowed) return [];

  return prisma.$transaction(async (tx) => {
    const dueLines = await buildDueLinesForByModule(tx, fee.id, input.currency);
    const withTranche = dueLines.filter((l) => l.trancheId != null);
    if (withTranche.length === 0) return [];

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

    const trancheMeta = await tx.moduleTranche.findMany({
      where: { id: { in: withTranche.map((l) => l.trancheId!) } },
      select: {
        id: true,
        codeTranche: true,
        moduleId: true,
        module: { select: { name: true } },
      },
    });
    const metaById = new Map(trancheMeta.map((t) => [t.id, t]));

    const rows: TrancheOutstandingRow[] = [];
    for (const l of withTranche) {
      const tid = l.trancheId!;
      const key = `t:${tid}`;
      const paid = alreadyPaid.get(key) ?? 0;
      const outstanding = Math.max(0, l.due - paid);
      const meta = metaById.get(tid);
      rows.push({
        trancheId: tid,
        moduleId: l.moduleId,
        codeTranche: meta?.codeTranche ?? `T${tid}`,
        moduleName: meta?.module.name ?? "",
        due: l.due,
        paid,
        outstanding,
      });
    }
    return rows.sort((a, b) => a.trancheId - b.trancheId);
  });
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

      if (input.allocationMode === "TRANSHES_MULTI") {
        const raw = input.tranchePayments ?? [];
        const merged = mergeTranchePayments(raw);
        if (merged.length === 0) {
          throw new Error("Ajoutez au moins une ligne de tranche avec un montant > 0");
        }
        const sum = merged.reduce((s, x) => s + x.amount, 0);
        if (Math.abs(sum - input.amount) > 0.00001) {
          throw new Error("Le montant total doit égaler la somme des montants par tranche");
        }

        const simulatedPaid = new Map(alreadyPaid);
        const combined: { moduleId: number | null; trancheId: number | null; amount: number }[] = [];

        for (const { trancheId, amount } of merged) {
          const targetLines = dueLines.filter((l) => l.trancheId === trancheId);
          if (targetLines.length === 0) {
            throw new Error(`Aucune ligne de frais pour la tranche ${trancheId}`);
          }
          const { allocations, remaining } = allocateAmount(targetLines, simulatedPaid, amount);
          if (remaining > 0.00001) {
            throw new Error(
              `Montant supérieur au reste à payer pour la tranche (id ${trancheId})`,
            );
          }
          for (const a of allocations) {
            const key = a.trancheId ? `t:${a.trancheId}` : a.moduleId ? `m:${a.moduleId}` : "total";
            simulatedPaid.set(key, (simulatedPaid.get(key) ?? 0) + a.amount);
          }
          combined.push(...allocations);
        }
        allocationsToCreate = combined;
      } else {
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
    /*
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
        academicYearId: student.academicYearId,
      },
    });
    */

    return created;
  });
}

