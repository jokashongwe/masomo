-- CreateEnum
CREATE TYPE "FeeSupportReductionMode" AS ENUM ('PERCENT', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "StudentFeeSupportReduction" ADD COLUMN "mode" "FeeSupportReductionMode" NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "StudentFeeSupportReduction" ADD COLUMN "amountToPayUSD" DECIMAL(18, 2);
ALTER TABLE "StudentFeeSupportReduction" ADD COLUMN "amountToPayCDF" DECIMAL(18, 2);
ALTER TABLE "StudentFeeSupportReduction" ALTER COLUMN "reductionPercent" DROP NOT NULL;
