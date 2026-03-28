-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "academicYearId" INTEGER;

-- Backfill Expense: année dont la plage contient occurredAt, sinon année en cours, sinon première année
UPDATE "Expense" e
SET "academicYearId" = (
  SELECT ay.id
  FROM "AcademicYear" ay
  WHERE e."occurredAt" >= ay."startDate" AND e."occurredAt" <= ay."endDate"
  ORDER BY ay.id ASC
  LIMIT 1
);

UPDATE "Expense"
SET "academicYearId" = (SELECT id FROM "AcademicYear" WHERE "isCurrent" = true ORDER BY id ASC LIMIT 1)
WHERE "academicYearId" IS NULL;

UPDATE "Expense"
SET "academicYearId" = (SELECT id FROM "AcademicYear" ORDER BY id ASC LIMIT 1)
WHERE "academicYearId" IS NULL;

ALTER TABLE "Expense" ALTER COLUMN "academicYearId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "academicYearId" INTEGER;

UPDATE "WalletTransaction" wt
SET "academicYearId" = fp."academicYearId"
FROM "FeePayment" fp
WHERE wt."feePaymentId" IS NOT NULL AND wt."feePaymentId" = fp.id;

UPDATE "WalletTransaction" wt
SET "academicYearId" = ex."academicYearId"
FROM "Expense" ex
WHERE wt."expenseId" IS NOT NULL AND wt."expenseId" = ex.id;

UPDATE "WalletTransaction"
SET "academicYearId" = (SELECT id FROM "AcademicYear" WHERE "isCurrent" = true ORDER BY id ASC LIMIT 1)
WHERE "academicYearId" IS NULL;

UPDATE "WalletTransaction"
SET "academicYearId" = (SELECT id FROM "AcademicYear" ORDER BY id ASC LIMIT 1)
WHERE "academicYearId" IS NULL;

ALTER TABLE "WalletTransaction" ALTER COLUMN "academicYearId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Expense_academicYearId_idx" ON "Expense"("academicYearId");

-- CreateIndex
CREATE INDEX "WalletTransaction_academicYearId_idx" ON "WalletTransaction"("academicYearId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
