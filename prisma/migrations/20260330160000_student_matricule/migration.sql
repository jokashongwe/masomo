-- Matricule élève (import Excel / CSV).

ALTER TABLE "Student" ADD COLUMN "matricule" TEXT;

CREATE UNIQUE INDEX "Student_academicYearId_matricule_key" ON "Student"("academicYearId", "matricule");
