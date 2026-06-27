
ALTER TABLE "Expense" ADD COLUMN "createdById" INTEGER;

CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
