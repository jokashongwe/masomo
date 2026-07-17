import "server-only";

import { prisma } from "@/lib/prisma";

export type EnrollmentByOptionRow = {
  optionId: number;
  codeOption: string;
  nameOption: string;
  codeSection: string;
  nameSection: string;
  count: number;
};

export async function getEnrollmentsByOption(academicYearId: number): Promise<EnrollmentByOptionRow[]> {
  const students = await prisma.student.findMany({
    where: { academicYearId, status: "ENROLLED" },
    select: {
      schoolClass: {
        select: {
          level: {
            select: {
              option: {
                select: {
                  id: true,
                  codeOption: true,
                  nameOption: true,
                  section: { select: { codeSection: true, nameSection: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const map = new Map<number, EnrollmentByOptionRow>();
  for (const s of students) {
    const opt = s.schoolClass.level.option;
    const row = map.get(opt.id) ?? {
      optionId: opt.id,
      codeOption: opt.codeOption,
      nameOption: opt.nameOption,
      codeSection: opt.section.codeSection,
      nameSection: opt.section.nameSection,
      count: 0,
    };
    row.count += 1;
    map.set(opt.id, row);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || a.codeSection.localeCompare(b.codeSection) || a.codeOption.localeCompare(b.codeOption),
  );
}

export async function getWalletBalanceSummary() {
  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { balanceUSD: true, balanceCDF: true },
  });
  if (!wallet) return null;
  return {
    usd: Number(wallet.balanceUSD),
    cdf: Number(wallet.balanceCDF),
  };
}
