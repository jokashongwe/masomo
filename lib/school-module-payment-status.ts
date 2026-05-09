import "server-only";

import type { Currency, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDueLinesForByModule } from "@/lib/fee-payments";

const EPS = 0.005;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type SchoolModulePaymentRow = {
  studentId: number;
  displayName: string;
  classLabel: string;
  paid: number;
  due: number;
  balance: number;
  status: "EN_ORDRE" | "PAS_EN_ORDRE";
  statusLabel: string;
};

export type SchoolModulePaymentReport = {
  academicYearName: string | null;
  moduleName: string | null;
  trancheCode: string | null;
  scopeLabel: string;
  currency: Currency;
  rows: SchoolModulePaymentRow[];
};

function studentWhere(filters: {
  academicYearId: number;
  sectionId?: number | null;
  optionId?: number | null;
  classId?: number | null;
}): Prisma.StudentWhereInput {
  const w: Prisma.StudentWhereInput = { academicYearId: filters.academicYearId };
  if (filters.classId != null && filters.classId > 0) {
    w.classId = filters.classId;
  } else if (filters.optionId != null && filters.optionId > 0) {
    w.schoolClass = { level: { optionId: filters.optionId } };
  } else if (filters.sectionId != null && filters.sectionId > 0) {
    w.schoolClass = { level: { option: { sectionId: filters.sectionId } } };
  }
  return w;
}

export async function getSchoolModulePaymentStatusReport(input: {
  currency: Currency;
  moduleId: number;
  trancheId?: number | null;
  sectionId?: number | null;
  optionId?: number | null;
  classId?: number | null;
}): Promise<SchoolModulePaymentReport> {
  const year = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  });
  if (!year) {
    return {
      academicYearName: null,
      moduleName: null,
      trancheCode: null,
      scopeLabel: "",
      currency: input.currency,
      rows: [],
    };
  }

  const mod = await prisma.billingModule.findUnique({
    where: { id: input.moduleId },
    select: { id: true, name: true },
  });
  if (!mod) {
    return {
      academicYearName: year.name,
      moduleName: null,
      trancheCode: null,
      scopeLabel: "",
      currency: input.currency,
      rows: [],
    };
  }

  let trancheCode: string | null = null;
  if (input.trancheId != null && input.trancheId > 0) {
    const tr = await prisma.moduleTranche.findFirst({
      where: { id: input.trancheId, moduleId: mod.id },
      select: { codeTranche: true },
    });
    trancheCode = tr?.codeTranche ?? null;
  }

  const scopeLabel =
    input.trancheId != null && input.trancheId > 0 && trancheCode
      ? `Tranche « ${trancheCode} » (module ${mod.name})`
      : `Module « ${mod.name} » (toutes les tranches)`;

  const students = await prisma.student.findMany({
    where: studentWhere({
      academicYearId: year.id,
      sectionId: input.sectionId,
      optionId: input.optionId,
      classId: input.classId,
    }),
    select: {
      id: true,
      firstName: true,
      name: true,
      postnom: true,
      schoolClass: {
        select: {
          codeClass: true,
          level: {
            select: {
              id: true,
              name: true,
              option: {
                select: {
                  nameOption: true,
                  section: { select: { nameSection: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ id: "asc" }],
  });

  const fees = await prisma.fee.findMany({
    where: { chargeType: "BY_MODULE" },
    select: {
      id: true,
      feeLevels: { select: { levelId: true } },
    },
  });

  const dueLinesCache = new Map<string, Awaited<ReturnType<typeof buildDueLinesForByModule>>>();
  async function linesForFee(feeId: number) {
    const k = `${feeId}:${input.currency}`;
    let lines = dueLinesCache.get(k);
    if (!lines) {
      lines = await buildDueLinesForByModule(prisma, feeId, input.currency);
      dueLinesCache.set(k, lines);
    }
    return lines;
  }

  const dueByStudent = new Map<number, number>();
  for (const s of students) {
    const levelId = s.schoolClass.level.id;
    let dueSum = 0;
    for (const fee of fees) {
      if (!fee.feeLevels.some((fl) => fl.levelId === levelId)) continue;
      const lines = await linesForFee(fee.id);
      for (const line of lines) {
        if (input.trancheId != null && input.trancheId > 0) {
          if (line.trancheId === input.trancheId) dueSum += line.due;
        } else if (line.moduleId === mod.id) {
          dueSum += line.due;
        }
      }
    }
    dueByStudent.set(s.id, round2(dueSum));
  }

  const studentIds = students.map((s) => s.id);
  const paidByStudent = new Map<number, number>();

  if (studentIds.length > 0) {
    const allocWhere: Prisma.FeePaymentAllocationWhereInput = {
      currency: input.currency,
      payment: { academicYearId: year.id, studentId: { in: studentIds } },
    };
    if (input.trancheId != null && input.trancheId > 0) {
      allocWhere.trancheId = input.trancheId;
    } else {
      allocWhere.OR = [{ moduleId: mod.id }, { tranche: { moduleId: mod.id } }];
    }

    const allocations = await prisma.feePaymentAllocation.findMany({
      where: allocWhere,
      select: {
        amount: true,
        payment: { select: { studentId: true } },
      },
    });
    for (const a of allocations) {
      const sid = a.payment.studentId;
      paidByStudent.set(sid, round2((paidByStudent.get(sid) ?? 0) + Number(a.amount)));
    }
  }

  const rows: SchoolModulePaymentRow[] = students.map((s) => {
    const due = dueByStudent.get(s.id) ?? 0;
    const paid = paidByStudent.get(s.id) ?? 0;
    const balance = round2(Math.max(0, due - paid));
    const enOrdre = balance <= EPS;
    const sc = s.schoolClass;
    const classLabel = `${sc.level.option.section.nameSection} — ${sc.level.name} — Classe ${sc.codeClass}`;
    return {
      studentId: s.id,
      displayName: `${s.firstName} ${s.name} ${s.postnom}`.trim(),
      classLabel,
      paid: round2(paid),
      due: round2(due),
      balance,
      status: enOrdre ? "EN_ORDRE" : "PAS_EN_ORDRE",
      statusLabel: enOrdre ? "En ordre" : "Pas en ordre",
    };
  });

  return {
    academicYearName: year.name,
    moduleName: mod.name,
    trancheCode,
    scopeLabel,
    currency: input.currency,
    rows,
  };
}
