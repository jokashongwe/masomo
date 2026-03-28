import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

function getEnv(name: string, fallback: string) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL env var for seed.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  const systemAdminEmail = getEnv("SEED_SYSTEM_ADMIN_EMAIL", "admin@kelaapp.local");
  const systemAdminPassword = getEnv("SEED_SYSTEM_ADMIN_PASSWORD", "admin123456");
  const systemAdminName = getEnv("SEED_SYSTEM_ADMIN_NAME", "System Administrator");

  const schoolName = getEnv("SEED_SCHOOL_NAME", "Kela Academy");
  const schoolCity = getEnv("SEED_SCHOOL_CITY", "Kinshasa");

  const feeRegistrationCode = "FEE_REGISTRATION";
  const feeTuitionCode = "FEE_TUITION";

  const modules = [
    { name: "Term 1", startDay: 1, startMonth: 1, endDay: 30, endMonth: 3, tranches: ["T1", "T2"] },
    { name: "Term 2", startDay: 1, startMonth: 4, endDay: 30, endMonth: 6, tranches: ["T1", "T2"] },
  ];

  const currencyUSD = "USD" as const;
  const currencyCDF = "CDF" as const;

  // Academic year (always keep exactly one in progress)
  const today = new Date();
  const baseYear = today.getFullYear();
  const seedYearName = getEnv("SEED_ACADEMIC_YEAR_NAME", `${baseYear}-${baseYear + 1}`);
  const seedStartDate = new Date(getEnv("SEED_ACADEMIC_YEAR_START_DATE", `${baseYear}-01-01T00:00:00.000Z`));
  const seedEndDate = new Date(getEnv("SEED_ACADEMIC_YEAR_END_DATE", `${baseYear}-12-31T23:59:59.000Z`));

  await prisma.academicYear.updateMany({ data: { isCurrent: false } }).catch(() => null);
  await prisma.academicYear.upsert({
    where: { name: seedYearName },
    update: { startDate: seedStartDate, endDate: seedEndDate, isCurrent: true },
    create: { name: seedYearName, startDate: seedStartDate, endDate: seedEndDate, isCurrent: true },
  });

  // Create SYSTEM_ADMIN user (upsert by email)
  const passwordHash = await bcrypt.hash(systemAdminPassword, await bcrypt.genSalt(12));
  await prisma.user.upsert({
    where: { email: systemAdminEmail },
    update: {
      name: systemAdminName,
      role: "SYSTEM_ADMIN",
      passwordHash,
    },
    create: {
      email: systemAdminEmail,
      name: systemAdminName,
      role: "SYSTEM_ADMIN",
      passwordHash,
    },
  });

  // Wallet (balances in USD/CDF)
  let wallet = await prisma.wallet.findFirst();
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: {} });
  }

  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  // Seed a deposit + an example expense so the dashboard has non-zero data.
  if (currentAcademicYear) {
    await prisma.$transaction(async (tx) => {
      const alreadySeeded = await tx.walletTransaction.findFirst({
        where: { walletId: wallet!.id, type: "DEPOSIT" },
        select: { id: true },
      });
      if (alreadySeeded) return;

      const depositAmount = 500;
      await tx.wallet.update({
        where: { id: wallet!.id },
        data: { balanceUSD: { increment: depositAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: "DEPOSIT",
          currency: currencyUSD,
          amount: depositAmount,
          note: "Seed deposit",
          academicYearId: currentAcademicYear.id,
        },
      });

      // Example expense (USD)
      const createdExpense = await tx.expense.create({
        data: {
          walletId: wallet!.id,
          currency: currencyUSD,
          amount: 25,
          description: "Seed expense",
          occurredAt: new Date(),
          academicYearId: currentAcademicYear.id,
        },
        select: { id: true },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: "EXPENSE",
          currency: currencyUSD,
          amount: 25,
          note: "Expense: Seed expense",
          expenseId: createdExpense.id,
          academicYearId: currentAcademicYear.id,
        },
      });
    });
  }

  // School -> Section -> Option -> Levels -> Classes
  const school = await prisma.school.findFirst({ where: { name: schoolName } });
  const schoolId = school
    ? school.id
    : (await prisma.school.create({ data: { name: schoolName, logo: null, address: `${schoolName} HQ`, city: schoolCity, contacts: null, email: null } })).id;

  const sectionSpecs = [{ codeSection: "SEC-A", nameSection: "Section A" }];
  await prisma.section.createMany({
    data: sectionSpecs.map((s) => ({ ...s, schoolId })),
    skipDuplicates: true,
  });

  const sectionRows = await prisma.section.findMany({ where: { schoolId, codeSection: { in: sectionSpecs.map((s) => s.codeSection) } } });
  const sectionIdByCode = new Map(sectionRows.map((s) => [s.codeSection, s.id]));

  const optionSpecs = [{ codeOption: "OPT-1", nameOption: "Option 1", sectionCode: "SEC-A" }];
  await prisma.option.createMany({
    data: optionSpecs.map((o) => ({
      codeOption: o.codeOption,
      nameOption: o.nameOption,
      sectionId: sectionIdByCode.get(o.sectionCode)!,
    })),
    skipDuplicates: true,
  });

  const optionRows = await prisma.option.findMany({
    where: { sectionId: { in: sectionRows.map((s) => s.id) }, codeOption: { in: optionSpecs.map((o) => o.codeOption) } },
  });
  const optionIdByCode = new Map(optionRows.map((o) => [o.codeOption, o.id]));

  const levelSpecs = [
    { codeLevel: "L1", name: "Level 1", nextLevel: "L2", optionCode: "OPT-1" },
    { codeLevel: "L2", name: "Level 2", nextLevel: null, optionCode: "OPT-1" },
  ];
  await prisma.level.createMany({
    data: levelSpecs.map((l) => ({
      codeLevel: l.codeLevel,
      name: l.name,
      nextLevel: l.nextLevel ?? null,
      optionId: optionIdByCode.get(l.optionCode)!,
    })),
    skipDuplicates: true,
  });

  const levelRows = await prisma.level.findMany({
    where: { optionId: { in: optionRows.map((o) => o.id) }, codeLevel: { in: levelSpecs.map((l) => l.codeLevel) } },
  });
  const levelIdByCode = new Map(levelRows.map((l) => [l.codeLevel, l.id]));

  const classSpecs = [
    { codeClass: "CL-1", levelCode: "L1" },
    { codeClass: "CL-2", levelCode: "L1" },
    { codeClass: "CL-3", levelCode: "L2" },
  ];
  await prisma.schoolClass.createMany({
    data: classSpecs.map((c) => ({
      codeClass: c.codeClass,
      levelId: levelIdByCode.get(c.levelCode)!,
    })),
    skipDuplicates: true,
  });

  // Finance: modules + tranches
  for (const m of modules) {
    await prisma.billingModule.create({
      data: {
        name: m.name,
        startDay: m.startDay,
        startMonth: m.startMonth,
        endDay: m.endDay,
        endMonth: m.endMonth,
      },
    }).catch(() => null);
  }

  const moduleRows = await prisma.billingModule.findMany({
    where: { name: { in: modules.map((m) => m.name) } },
  });
  const moduleIdByName = new Map(moduleRows.map((m) => [m.name, m.id]));

  await prisma.moduleTranche.createMany({
    data: modules.flatMap((m) =>
      m.tranches.map((codeTranche) => ({
        codeTranche,
        moduleId: moduleIdByName.get(m.name)!,
        startDay: m.startDay,
        startMonth: m.startMonth,
        endDay: m.endDay,
        endMonth: m.endMonth,
      })),
    ),
    skipDuplicates: true,
  });

  const trancheRows = await prisma.moduleTranche.findMany({
    where: { moduleId: { in: moduleRows.map((m) => m.id) } },
  });
  const trancheIdByModuleAndCode = new Map(trancheRows.map((t) => [`${t.moduleId}:${t.codeTranche}`, t.id]));

  // Fees
  await prisma.fee.upsert({
    where: { code: feeRegistrationCode },
    update: {
      name: "Registration Fee",
      chargeType: "TOTAL",
      description: "Registration / administrative fee",
      feeLevels: { deleteMany: {}, create: [] },
    },
    create: {
      code: feeRegistrationCode,
      name: "Registration Fee",
      description: "Registration / administrative fee",
      chargeType: "TOTAL",
      feeLevels: { create: [] },
    },
  }).catch(() => null);

  await prisma.fee.upsert({
    where: { code: feeTuitionCode },
    update: {
      name: "Tuition Fee (by module/tranche)",
      chargeType: "BY_MODULE",
      description: "Tuition fee split by billing modules and tranches",
      feeLevels: { deleteMany: {}, create: [] },
    },
    create: {
      code: feeTuitionCode,
      name: "Tuition Fee (by module/tranche)",
      description: "Tuition fee split by billing modules and tranches",
      chargeType: "BY_MODULE",
      feeLevels: { create: [] },
    },
  }).catch(() => null);

  const feesRows = await prisma.fee.findMany({ where: { code: { in: [feeRegistrationCode, feeTuitionCode] } } });
  const feeIdByCode = new Map(feesRows.map((f) => [f.code, f.id]));

  // Attach fees to all seeded levels
  const feeLevelRows = feesRows.flatMap((f) => levelRows.map((l) => ({ feeId: f.id, levelId: l.id })));
  await prisma.feeLevel.createMany({
    data: feeLevelRows,
    skipDuplicates: true,
  });

  // Amounts (USD/CDF)
  const registrationFeeId = feeIdByCode.get(feeRegistrationCode)!;
  await prisma.feeTotalAmount.createMany({
    data: [
      { feeId: registrationFeeId, currency: currencyUSD, amount: 20 },
      { feeId: registrationFeeId, currency: currencyCDF, amount: 80000 },
    ],
    skipDuplicates: true,
  });

  const tuitionFeeId = feeIdByCode.get(feeTuitionCode)!;
  // By-module: define amounts per module
  await prisma.feeModuleAmount.createMany({
    data: moduleRows.map((m) => [
      { feeId: tuitionFeeId, moduleId: m.id, currency: currencyUSD, amount: 10 },
      { feeId: tuitionFeeId, moduleId: m.id, currency: currencyCDF, amount: 50000 },
    ]).flat(),
    skipDuplicates: true,
  });

  // By-module: tranche amounts per tranche
  await prisma.feeTrancheAmount.createMany({
    data: [
      // For each module, tranche T1 and T2
      ...modules.flatMap((m) => [
        {
          feeId: tuitionFeeId,
          trancheId: trancheIdByModuleAndCode.get(`${moduleIdByName.get(m.name)}:T1`)!,
          currency: currencyUSD,
          amount: 6,
        },
        {
          feeId: tuitionFeeId,
          trancheId: trancheIdByModuleAndCode.get(`${moduleIdByName.get(m.name)}:T2`)!,
          currency: currencyUSD,
          amount: 4,
        },
        {
          feeId: tuitionFeeId,
          trancheId: trancheIdByModuleAndCode.get(`${moduleIdByName.get(m.name)}:T1`)!,
          currency: currencyCDF,
          amount: 30000,
        },
        {
          feeId: tuitionFeeId,
          trancheId: trancheIdByModuleAndCode.get(`${moduleIdByName.get(m.name)}:T2`)!,
          currency: currencyCDF,
          amount: 20000,
        },
      ]),
    ],
    skipDuplicates: true,
  });

  await prisma.$disconnect();
  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });

