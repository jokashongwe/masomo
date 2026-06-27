-- DropIndex
DROP INDEX "Fee_code_key";

-- CreateIndex
CREATE INDEX "Fee_code_idx" ON "Fee"("code");
