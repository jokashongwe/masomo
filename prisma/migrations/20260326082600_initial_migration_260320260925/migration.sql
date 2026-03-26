-- CreateEnum
CREATE TYPE "StudentSex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'CDF');

-- CreateEnum
CREATE TYPE "FeeChargeType" AS ENUM ('TOTAL', 'BY_MODULE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'FINANCE_MANAGER', 'FINANCE_VIEWER', 'SCHOOL_MANAGER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contacts" TEXT,
    "email" TEXT,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "codeSection" TEXT NOT NULL,
    "nameSection" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" SERIAL NOT NULL,
    "codeOption" TEXT NOT NULL,
    "nameOption" TEXT NOT NULL,
    "sectionId" INTEGER NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "codeLevel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nextLevel" TEXT,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" SERIAL NOT NULL,
    "codeClass" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "postnom" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "sex" "StudentSex" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classId" INTEGER NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "postnom" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTutor" (
    "studentId" INTEGER NOT NULL,
    "tutorId" INTEGER NOT NULL,

    CONSTRAINT "StudentTutor_pkey" PRIMARY KEY ("studentId","tutorId")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chargeType" "FeeChargeType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeLevel" (
    "feeId" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,

    CONSTRAINT "FeeLevel_pkey" PRIMARY KEY ("feeId","levelId")
);

-- CreateTable
CREATE TABLE "BillingModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDay" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleTranche" (
    "id" SERIAL NOT NULL,
    "codeTranche" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,

    CONSTRAINT "ModuleTranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeTotalAmount" (
    "id" SERIAL NOT NULL,
    "feeId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "FeeTotalAmount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeModuleAmount" (
    "id" SERIAL NOT NULL,
    "feeId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "FeeModuleAmount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeTrancheAmount" (
    "id" SERIAL NOT NULL,
    "feeId" INTEGER NOT NULL,
    "trancheId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "FeeTrancheAmount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_schoolId_codeSection_key" ON "Section"("schoolId", "codeSection");

-- CreateIndex
CREATE UNIQUE INDEX "Option_sectionId_codeOption_key" ON "Option"("sectionId", "codeOption");

-- CreateIndex
CREATE UNIQUE INDEX "Level_optionId_codeLevel_key" ON "Level"("optionId", "codeLevel");

-- CreateIndex
CREATE INDEX "SchoolClass_levelId_idx" ON "SchoolClass"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_levelId_codeClass_key" ON "SchoolClass"("levelId", "codeClass");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_contact_key" ON "Tutor"("contact");

-- CreateIndex
CREATE UNIQUE INDEX "Fee_code_key" ON "Fee"("code");

-- CreateIndex
CREATE INDEX "FeeLevel_levelId_idx" ON "FeeLevel"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingModule_name_startDay_startMonth_endDay_endMonth_key" ON "BillingModule"("name", "startDay", "startMonth", "endDay", "endMonth");

-- CreateIndex
CREATE INDEX "ModuleTranche_moduleId_idx" ON "ModuleTranche"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleTranche_moduleId_codeTranche_key" ON "ModuleTranche"("moduleId", "codeTranche");

-- CreateIndex
CREATE INDEX "FeeTotalAmount_feeId_idx" ON "FeeTotalAmount"("feeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeTotalAmount_feeId_currency_key" ON "FeeTotalAmount"("feeId", "currency");

-- CreateIndex
CREATE INDEX "FeeModuleAmount_moduleId_idx" ON "FeeModuleAmount"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeModuleAmount_feeId_moduleId_currency_key" ON "FeeModuleAmount"("feeId", "moduleId", "currency");

-- CreateIndex
CREATE INDEX "FeeTrancheAmount_trancheId_idx" ON "FeeTrancheAmount"("trancheId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeTrancheAmount_feeId_trancheId_currency_key" ON "FeeTrancheAmount"("feeId", "trancheId", "currency");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTutor" ADD CONSTRAINT "StudentTutor_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTutor" ADD CONSTRAINT "StudentTutor_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLevel" ADD CONSTRAINT "FeeLevel_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLevel" ADD CONSTRAINT "FeeLevel_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTranche" ADD CONSTRAINT "ModuleTranche_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BillingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTotalAmount" ADD CONSTRAINT "FeeTotalAmount_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeModuleAmount" ADD CONSTRAINT "FeeModuleAmount_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeModuleAmount" ADD CONSTRAINT "FeeModuleAmount_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BillingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTrancheAmount" ADD CONSTRAINT "FeeTrancheAmount_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTrancheAmount" ADD CONSTRAINT "FeeTrancheAmount_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "ModuleTranche"("id") ON DELETE CASCADE ON UPDATE CASCADE;
