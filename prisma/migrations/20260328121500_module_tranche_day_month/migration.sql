-- Day/month window per tranche (aligned with BillingModule).

ALTER TABLE "ModuleTranche" ADD COLUMN "startDay" INTEGER;
ALTER TABLE "ModuleTranche" ADD COLUMN "startMonth" INTEGER;
ALTER TABLE "ModuleTranche" ADD COLUMN "endDay" INTEGER;
ALTER TABLE "ModuleTranche" ADD COLUMN "endMonth" INTEGER;

UPDATE "ModuleTranche" AS t
SET
  "startDay" = m."startDay",
  "startMonth" = m."startMonth",
  "endDay" = m."endDay",
  "endMonth" = m."endMonth"
FROM "BillingModule" AS m
WHERE t."moduleId" = m."id";

ALTER TABLE "ModuleTranche" ALTER COLUMN "startDay" SET NOT NULL;
ALTER TABLE "ModuleTranche" ALTER COLUMN "startMonth" SET NOT NULL;
ALTER TABLE "ModuleTranche" ALTER COLUMN "endDay" SET NOT NULL;
ALTER TABLE "ModuleTranche" ALTER COLUMN "endMonth" SET NOT NULL;
