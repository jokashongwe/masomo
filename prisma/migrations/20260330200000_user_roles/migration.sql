-- AlterTable: single role -> roles array
ALTER TABLE "User" ADD COLUMN "roles" "UserRole"[];

UPDATE "User" SET "roles" = ARRAY["role"]::"UserRole"[] WHERE "roles" IS NULL;

ALTER TABLE "User" ALTER COLUMN "roles" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";
