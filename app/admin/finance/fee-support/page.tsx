import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, requireRoles } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";
import FeeSupportCrud from "./FeeSupportCrud";

function studentLabel(s: {
  matricule: string | null;
  firstName: string;
  name: string;
  postnom: string;
  schoolClass: { codeClass: string };
}) {
  const name = [s.firstName, s.name, s.postnom].filter(Boolean).join(" ");
  const mat = s.matricule ? ` (${s.matricule})` : "";
  return `${name}${mat} — ${s.schoolClass.codeClass}`;
}

export default async function AdminFeeSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireRoles((role) => canReadFinance(role));
  const canWrite = canWriteFinance(user.role);
  const sp = await searchParams;

  const academicYears = await prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { id: true, name: true, isCurrent: true },
  });
  const defaultAcademicYearId =
    academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? null;

  const yearFromQuery = sp.year ? Number(sp.year) : null;
  const selectedAcademicYearId =
    yearFromQuery && academicYears.some((y) => y.id === yearFromQuery)
      ? yearFromQuery
      : defaultAcademicYearId;

  const [fees, students, supports] = await Promise.all([
    prisma.fee.findMany({
      orderBy: [{ code: "asc" }, { id: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        feeLevels: { select: { levelId: true } },
      },
    }),
    selectedAcademicYearId
      ? prisma.student.findMany({
          where: { academicYearId: selectedAcademicYearId, status: "ENROLLED" },
          orderBy: [{ name: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            matricule: true,
            firstName: true,
            name: true,
            postnom: true,
            schoolClass: { select: { codeClass: true, levelId: true } },
          },
        })
      : Promise.resolve([]),
    selectedAcademicYearId
      ? prisma.studentFeeSupport.findMany({
          where: { academicYearId: selectedAcademicYearId },
          orderBy: { id: "desc" },
          include: {
            student: {
              select: {
                id: true,
                matricule: true,
                firstName: true,
                name: true,
                postnom: true,
                schoolClass: { select: { codeClass: true } },
              },
            },
            academicYear: { select: { id: true, name: true, isCurrent: true } },
            feeReductions: {
              include: { fee: { select: { id: true, code: true, name: true } } },
              orderBy: { feeId: "asc" },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Prise en charge"
        subtitle="Élèves bénéficiant d'une réduction configurable (jusqu'à 100 %) sur certains frais, par année scolaire."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <FeeSupportCrud
          canWrite={canWrite}
          academicYears={academicYears}
          defaultAcademicYearId={defaultAcademicYearId}
          selectedAcademicYearId={selectedAcademicYearId}
          fees={fees}
          students={students.map((s) => ({ ...s, label: studentLabel(s) }))}
          initialSupports={supports.map((s) => ({
            id: s.id,
            studentId: s.studentId,
            academicYearId: s.academicYearId,
            note: s.note,
            studentLabel: studentLabel(s.student),
            matricule: s.student.matricule,
            reductions: s.feeReductions.map((r) => ({
              feeId: r.feeId,
              feeCode: r.fee.code,
              feeName: r.fee.name,
              reductionPercent: Number(r.reductionPercent),
            })),
          }))}
        />
      </div>
    </div>
  );
}
