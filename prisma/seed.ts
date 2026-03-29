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

