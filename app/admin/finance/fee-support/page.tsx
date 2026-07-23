import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, requireRoles } from "@/lib/auth";
import { formatFeeSupportRule } from "@/lib/student-fee-support";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";
import FeeSupportCrud from "./FeeSupportCrud";

const schoolClassSelect = {
  id: true,
  codeClass: true,
  levelId: true,
  level: {
    select: {
      codeLevel: true,
      option: { select: { nameOption: true } },
    },
  },
} as const;

type SchoolClassLabel = {
  codeClass: string;
  level: { codeLevel: string; option: { nameOption: string } };
};

/** Format : Code niveau + Option + Classe (ex. « 3ème Sciences A »). */
function formatFeeSupportClassLabel(schoolClass: SchoolClassLabel) {
  const { codeLevel } = schoolClass.level;
  const ordinal = codeLevel === "1" ? "ère" : "ème";
  return `${codeLevel}${ordinal} ${schoolClass.level.option.nameOption} ${schoolClass.codeClass}`;
}

function studentDisplayName(s: {
  matricule: string | null;
  firstName: string;
  name: string;
  postnom: string;
}) {
  const name = [s.firstName, s.name, s.postnom].filter(Boolean).join(" ");
  const mat = s.matricule ? ` (${s.matricule})` : "";
  return `${name}${mat}`;
}

function studentLabel(s: {
  matricule: string | null;
  firstName: string;
  name: string;
  postnom: string;
  schoolClass: SchoolClassLabel;
}) {
  return `${studentDisplayName(s)} — ${formatFeeSupportClassLabel(s.schoolClass)}`;
}

export default async function AdminFeeSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireRoles(canReadFinance);
  const canWrite = canWriteFinance(user.roles);
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
            schoolClass: { select: schoolClassSelect },
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
                schoolClass: { select: schoolClassSelect },
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
        subtitle="Élèves bénéficiant d'une réduction (pourcentage) ou d'un montant fixe à payer sur certains frais, par année scolaire."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <FeeSupportCrud
          canWrite={canWrite}
          academicYears={academicYears}
          defaultAcademicYearId={defaultAcademicYearId}
          selectedAcademicYearId={selectedAcademicYearId}
          fees={fees}
          students={students.map((s) => ({
            ...s,
            label: studentLabel(s),
            classLabel: formatFeeSupportClassLabel(s.schoolClass),
          }))}
          initialSupports={supports.map((s) => ({
            id: s.id,
            studentId: s.studentId,
            academicYearId: s.academicYearId,
            note: s.note,
            studentLabel: studentDisplayName(s.student),
            classLabel: formatFeeSupportClassLabel(s.student.schoolClass),
            matricule: s.student.matricule,
            reductions: s.feeReductions.map((r) => {
              const reductionPercent = r.reductionPercent != null ? Number(r.reductionPercent) : null;
              const amountToPayUSD = r.amountToPayUSD != null ? Number(r.amountToPayUSD) : null;
              const amountToPayCDF = r.amountToPayCDF != null ? Number(r.amountToPayCDF) : null;
              const mode = r.mode as "PERCENT" | "FIXED_AMOUNT";
              return {
                feeId: r.feeId,
                feeCode: r.fee.code,
                feeName: r.fee.name,
                mode,
                reductionPercent,
                amountToPayUSD,
                amountToPayCDF,
                label: formatFeeSupportRule({
                  mode,
                  reductionPercent,
                  amountToPayUSD,
                  amountToPayCDF,
                }),
              };
            }),
          }))}
        />
      </div>
    </div>
  );
}
