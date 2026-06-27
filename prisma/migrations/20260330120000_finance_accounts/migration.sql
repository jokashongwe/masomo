-- Comptes d'encaissement par année scolaire, liés aux frais et aux paiements.

-- CreateEnum
CREATE TYPE "FinanceAccountTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academicYearId" INTEGER NOT NULL,
    "balanceUSD" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceCDF" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAccountTransaction" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "type" "FinanceAccountTransactionType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "feePaymentId" INTEGER,
    "createdById" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceAccountTransaction_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Fee" ADD COLUMN "accountId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccount_academicYearId_name_key" ON "FinanceAccount"("academicYearId", "name");

CREATE INDEX "FinanceAccount_academicYearId_idx" ON "FinanceAccount"("academicYearId");

CREATE UNIQUE INDEX "FinanceAccountTransaction_feePaymentId_key" ON "FinanceAccountTransaction"("feePaymentId");

CREATE INDEX "FinanceAccountTransaction_accountId_idx" ON "FinanceAccountTransaction"("accountId");

CREATE INDEX "FinanceAccountTransaction_type_idx" ON "FinanceAccountTransaction"("type");

CREATE INDEX "FinanceAccountTransaction_createdById_idx" ON "FinanceAccountTransaction"("createdById");

CREATE INDEX "Fee_accountId_idx" ON "Fee"("accountId");

-- AddForeignKey
ALTER TABLE "FinanceAccount" ADD CONSTRAINT "FinanceAccount_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountTransaction" ADD CONSTRAINT "FinanceAccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountTransaction" ADD CONSTRAINT "FinanceAccountTransaction_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceAccountTransaction" ADD CONSTRAINT "FinanceAccountTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Fee" ADD CONSTRAINT "Fee_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
