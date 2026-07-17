-- CreateTable
CREATE TABLE "StudentFeeSupport" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeSupportReduction" (
    "id" SERIAL NOT NULL,
    "supportId" INTEGER NOT NULL,
    "feeId" INTEGER NOT NULL,
    "reductionPercent" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "StudentFeeSupportReduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFeeSupport_academicYearId_idx" ON "StudentFeeSupport"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeSupport_studentId_academicYearId_key" ON "StudentFeeSupport"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "StudentFeeSupportReduction_feeId_idx" ON "StudentFeeSupportReduction"("feeId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeSupportReduction_supportId_feeId_key" ON "StudentFeeSupportReduction"("supportId", "feeId");

-- AddForeignKey
ALTER TABLE "StudentFeeSupport" ADD CONSTRAINT "StudentFeeSupport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeSupport" ADD CONSTRAINT "StudentFeeSupport_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeSupportReduction" ADD CONSTRAINT "StudentFeeSupportReduction_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "StudentFeeSupport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeSupportReduction" ADD CONSTRAINT "StudentFeeSupportReduction_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
