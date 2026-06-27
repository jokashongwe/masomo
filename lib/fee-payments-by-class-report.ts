import "server-only";

import type { Currency, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type FeePaymentsByClassStudentRow = {
  studentId: number;
  displayName: string;
  paid: number;
};

export type FeePaymentsByClassGroup = {
  classId: number;
  label: string;
  /** Tri stable : option / niveau / code classe */
  sortKey: string;
  students: FeePaymentsByClassStudentRow[];
  subtotalPaid: number;
};

export type FeePaymentsByClassFlatRow = {
  studentId: number;
  displayName: string;
  classId: number;
  classLabel: string;
  paid: number;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function clampPageInfo(total: number, page: number, pageSize: number) {
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const pageCount = Math.max(1, Math.ceil(total / safeSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  return { page: safePage, pageSize: safeSize, pageCount };
}

export async function getFeePaymentsByClassReport(input: {
  currency: Currency;
  feeId?: number | null;
  moduleId?: number | null;
  trancheId?: number | null;
  page?: number;
  pageSize?: number;
  all?: boolean;
}): Promise<{
  academicYearName: string | null;
  rows: FeePaymentsByClassFlatRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}> {
  const year = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  });
  if (!year) {
    return {
      academicYearName: null,
      rows: [],
      total: 0,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      pageCount: 1,
    };
  }

  const paymentWhere: Prisma.FeePaymentWhereInput = { academicYearId: year.id };
  if (input.feeId != null && input.feeId > 0) {
    paymentWhere.feeId = input.feeId;
  }

  const allocationWhere: Prisma.FeePaymentAllocationWhereInput = {
    currency: input.currency,
    payment: paymentWhere,
  };

  if (input.trancheId != null && input.trancheId > 0) {
    allocationWhere.trancheId = input.trancheId;
  } else if (input.moduleId != null && input.moduleId > 0) {
    allocationWhere.OR = [{ moduleId: input.moduleId }, { tranche: { moduleId: input.moduleId } }];
  }

  const [allocations, students] = await Promise.all([
    prisma.feePaymentAllocation.findMany({
      where: allocationWhere,
      select: {
        amount: true,
        payment: { select: { studentId: true } },
      },
    }),
    prisma.student.findMany({
      where: { academicYearId: year.id },
      select: {
        id: true,
        firstName: true,
        name: true,
        postnom: true,
        classId: true,
        schoolClass: {
          select: {
            id: true,
            codeClass: true,
            level: {
              select: {
                name: true,
                codeLevel: true,
                option: {
                  select: {
                    nameOption: true,
                    codeOption: true,
                    section: { select: { codeSection: true, nameSection: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const paidByStudent = new Map<number, number>();
  for (const a of allocations) {
    const sid = a.payment.studentId;
    paidByStudent.set(sid, (paidByStudent.get(sid) ?? 0) + Number(a.amount));
  }

  type ClassInfo = NonNullable<(typeof students)[number]["schoolClass"]>;

  const byClass = new Map<number, { info: ClassInfo; studentIds: Set<number> }>();
  for (const s of students) {
    const c = s.schoolClass;
    const cur = byClass.get(c.id) ?? { info: c, studentIds: new Set<number>() };
    cur.studentIds.add(s.id);
    byClass.set(c.id, cur);
  }

  const studentById = new Map(students.map((s) => [s.id, s]));

  const classes: FeePaymentsByClassGroup[] = [];

  for (const [classId, { info, studentIds }] of byClass) {
    const level = info.level;
    const opt = level.option;
    const sortKey = [
      opt.section.codeSection,
      opt.codeOption,
      level.codeLevel,
      info.codeClass,
    ].join("\0");

    const label = `${opt.section.nameSection} — ${opt.nameOption} — ${level.name} — Classe ${info.codeClass}`;

    const rowStudents: FeePaymentsByClassStudentRow[] = [];
    let subtotal = 0;

    for (const sid of studentIds) {
      const st = studentById.get(sid);
      if (!st) continue;
      const paid = round2(paidByStudent.get(sid) ?? 0);
      subtotal += paid;
      rowStudents.push({
        studentId: sid,
        displayName: `${st.firstName} ${st.name} ${st.postnom}`.trim(),
        paid,
      });
    }

    rowStudents.sort((a, b) => {
      if (b.paid !== a.paid) return b.paid - a.paid;
      return a.displayName.localeCompare(b.displayName, "fr");
    });

    classes.push({
      classId,
      label,
      sortKey,
      students: rowStudents,
      subtotalPaid: round2(subtotal),
    });
  }

  classes.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

  const flatRows: FeePaymentsByClassFlatRow[] = [];
  for (const grp of classes) {
    for (const st of grp.students) {
      flatRows.push({
        studentId: st.studentId,
        displayName: st.displayName,
        classId: grp.classId,
        classLabel: grp.label,
        paid: st.paid,
      });
    }
  }

  const total = flatRows.length;
  if (input.all) {
    return {
      academicYearName: year.name,
      rows: flatRows,
      total,
      page: 1,
      pageSize: Math.max(total, 1),
      pageCount: 1,
    };
  }

  const requestedPage = input.page ?? 1;
  const requestedSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { page, pageSize, pageCount } = clampPageInfo(total, requestedPage, requestedSize);
  const start = (page - 1) * pageSize;
  const rows = flatRows.slice(start, start + pageSize);

  return {
    academicYearName: year.name,
    rows,
    total,
    page,
    pageSize,
    pageCount,
  };
}
