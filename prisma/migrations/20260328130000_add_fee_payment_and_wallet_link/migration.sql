-- Fee payments, allocations, and wallet link (aligned with schema FeePayment / FeePaymentAllocation).

-- CreateEnum
CREATE TYPE "FeePaymentSource" AS ENUM ('BANK_SLIP', 'MANUAL', 'IMPORT');

-- AlterEnum: wallet rows tied to fee payments
ALTER TYPE "WalletTransactionType" ADD VALUE 'FEE_PAYMENT';

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" SERIAL NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "source" "FeePaymentSource" NOT NULL,
    "bankSlipReference" TEXT,
    "studentId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "feeId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePaymentAllocation" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "moduleId" INTEGER,
    "trancheId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "FeePayment"("receiptNumber");

CREATE INDEX "FeePayment_studentId_academicYearId_idx" ON "FeePayment"("studentId", "academicYearId");

CREATE INDEX "FeePayment_feeId_idx" ON "FeePayment"("feeId");

CREATE INDEX "FeePayment_paidAt_idx" ON "FeePayment"("paidAt");

CREATE INDEX "FeePaymentAllocation_paymentId_idx" ON "FeePaymentAllocation"("paymentId");

CREATE INDEX "FeePaymentAllocation_moduleId_idx" ON "FeePaymentAllocation"("moduleId");

CREATE INDEX "FeePaymentAllocation_trancheId_idx" ON "FeePaymentAllocation"("trancheId");

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeePaymentAllocation" ADD CONSTRAINT "FeePaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeePaymentAllocation" ADD CONSTRAINT "FeePaymentAllocation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "BillingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeePaymentAllocation" ADD CONSTRAINT "FeePaymentAllocation_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "ModuleTranche"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "feePaymentId" INTEGER;

CREATE UNIQUE INDEX "WalletTransaction_feePaymentId_key" ON "WalletTransaction"("feePaymentId");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
