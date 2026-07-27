import "server-only";

import { prisma } from "@/lib/prisma";
import { getTrancheOutstandingsForStudent } from "@/lib/fee-payments";
import { applySupportToDue, getStudentFeeSupport } from "@/lib/student-fee-support";
import type { Currency } from "@/generated/prisma/client";

const CURRENCIES: Currency[] = ["USD", "CDF"];

export async function getParentStudentFeeReport(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      name: true,
      postnom: true,
      matricule: true,
      academicYearId: true,
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      schoolClass: {
        select: {
          codeClass: true,
          levelId: true,
          level: {
            select: {
              codeLevel: true,
              option: { select: { nameOption: true } },
            },
          },
        },
      },
    },
  });
  if (!student) return null;

  const levelId = student.schoolClass.levelId;
  const fees = await prisma.fee.findMany({
    where: { feeLevels: { some: { levelId } } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      chargeType: true,
      totalAmounts: { select: { currency: true, amount: true } },
    },
  });

  const modules: {
    moduleId: number | null;
    moduleName: string;
    tranches: {
      trancheId: number | null;
      codeTranche: string;
      fees: {
        feeId: number;
        feeCode: string;
        feeName: string;
        currency: Currency;
        due: number;
        paid: number;
        outstanding: number;
      }[];
    }[];
  }[] = [];

  const totals: {
    feeId: number;
    feeCode: string;
    feeName: string;
    currency: Currency;
    due: number;
    paid: number;
    outstanding: number;
  }[] = [];

  const moduleMap = new Map<
    number | "none",
    {
      moduleId: number | null;
      moduleName: string;
      trancheMap: Map<
        number | "none",
        {
          trancheId: number | null;
          codeTranche: string;
          fees: {
            feeId: number;
            feeCode: string;
            feeName: string;
            currency: Currency;
            due: number;
            paid: number;
            outstanding: number;
          }[];
        }
      >;
    }
  >();

  function pushTrancheRow(row: {
    moduleId: number | null;
    moduleName: string;
    trancheId: number | null;
    codeTranche: string;
    feeId: number;
    feeCode: string;
    feeName: string;
    currency: Currency;
    due: number;
    paid: number;
    outstanding: number;
  }) {
    const mKey = row.moduleId ?? "none";
    let mod = moduleMap.get(mKey);
    if (!mod) {
      mod = {
        moduleId: row.moduleId,
        moduleName: row.moduleName,
        trancheMap: new Map(),
      };
      moduleMap.set(mKey, mod);
    }
    const tKey = row.trancheId ?? "none";
    let tranche = mod.trancheMap.get(tKey);
    if (!tranche) {
      tranche = {
        trancheId: row.trancheId,
        codeTranche: row.codeTranche,
        fees: [],
      };
      mod.trancheMap.set(tKey, tranche);
    }
    tranche.fees.push({
      feeId: row.feeId,
      feeCode: row.feeCode,
      feeName: row.feeName,
      currency: row.currency,
      due: row.due,
      paid: row.paid,
      outstanding: row.outstanding,
    });
  }

  for (const fee of fees) {
    for (const currency of CURRENCIES) {
      if (fee.chargeType === "BY_MODULE") {
        const rows = await getTrancheOutstandingsForStudent({
          studentId: student.id,
          feeId: fee.id,
          currency,
        });
        for (const r of rows) {
          if (r.due <= 0 && r.paid <= 0) continue;
          pushTrancheRow({
            moduleId: r.moduleId,
            moduleName: r.moduleName || "Sans module",
            trancheId: r.trancheId,
            codeTranche: r.codeTranche,
            feeId: fee.id,
            feeCode: fee.code,
            feeName: fee.name,
            currency,
            due: r.due,
            paid: r.paid,
            outstanding: r.outstanding,
          });
        }
      } else {
        const baseDue = Number(fee.totalAmounts.find((t) => t.currency === currency)?.amount ?? 0);
        if (baseDue <= 0) continue;

        const supportRule = await prisma.$transaction((tx) =>
          getStudentFeeSupport(tx, {
            studentId: student.id,
            academicYearId: student.academicYearId,
            feeId: fee.id,
          }),
        );
        const due = applySupportToDue(baseDue, supportRule, currency);

        const payments = await prisma.feePayment.findMany({
          where: {
            studentId: student.id,
            academicYearId: student.academicYearId,
            feeId: fee.id,
            currency,
          },
          select: { allocations: { select: { amount: true } } },
        });
        const paid = payments.reduce(
          (sum, p) => sum + p.allocations.reduce((s, a) => s + Number(a.amount), 0),
          0,
        );
        const outstanding = Math.max(0, due - paid);
        totals.push({
          feeId: fee.id,
          feeCode: fee.code,
          feeName: fee.name,
          currency,
          due,
          paid,
          outstanding,
        });
      }
    }
  }

  for (const mod of moduleMap.values()) {
    modules.push({
      moduleId: mod.moduleId,
      moduleName: mod.moduleName,
      tranches: [...mod.trancheMap.values()],
    });
  }

  const recentPayments = await prisma.feePayment.findMany({
    where: { studentId: student.id, academicYearId: student.academicYearId },
    orderBy: { paidAt: "desc" },
    take: 30,
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      currency: true,
      paidAt: true,
      fee: { select: { id: true, code: true, name: true } },
      allocations: {
        select: {
          amount: true,
          module: { select: { id: true, name: true } },
          tranche: { select: { id: true, codeTranche: true } },
        },
      },
    },
  });

  const ordinal = student.schoolClass.level.codeLevel === "1" ? "ère" : "ème";
  const classLabel = `${student.schoolClass.level.codeLevel}${ordinal} ${student.schoolClass.level.option.nameOption} ${student.schoolClass.codeClass}`;

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      name: student.name,
      postnom: student.postnom,
      matricule: student.matricule,
      classLabel,
      academicYear: student.academicYear,
    },
    modules,
    totals,
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: Number(p.amount),
      currency: p.currency,
      paidAt: p.paidAt.toISOString(),
      fee: p.fee,
      allocations: p.allocations.map((a) => ({
        amount: Number(a.amount),
        module: a.module,
        tranche: a.tranche,
      })),
    })),
  };
}
