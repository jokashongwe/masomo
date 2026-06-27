-- Statut scolaire de l'élève (inscrit, quitté, renvoyé, terminé).

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ENROLLED', 'LEFT', 'EXPELLED', 'GRADUATED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "status" "StudentStatus" NOT NULL DEFAULT 'ENROLLED';

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");
