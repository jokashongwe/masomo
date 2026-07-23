import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEditStudentProfile, canEditStudentStatus, canManageSchool, requireRoles } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";
import StudentDetailClient from "./StudentDetailClient";

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const user = await requireRoles(canManageSchool);
  const canEdit = canEditStudentProfile(user.roles);
  const canEditStatus = canEditStudentStatus(user.roles);
  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isFinite(studentId)) notFound();

  const sp = (await searchParams) ?? {};
  const backParams = new URLSearchParams();
  for (const key of ["q", "classId", "status", "page", "take"] as const) {
    const raw = sp[key];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (val) backParams.set(key, val);
  }
  const backHref = backParams.toString() ? `/admin/students?${backParams.toString()}` : "/admin/students";

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      schoolClass: {
        include: {
          level: {
            include: {
              option: {
                include: {
                  section: { include: { school: true } },
                },
              },
            },
          },
        },
      },
      studentTutors: { include: { tutor: true } },
    },
  });
  if (!student) notFound();

  const classes = await prisma.schoolClass.findMany({
    orderBy: { id: "asc" },
    include: {
      level: {
        include: {
          option: {
            include: {
              section: { include: { school: true } },
            },
          },
        },
      },
    },
  });

  const classOptions = classes.map((c) => {
    const ordinal = c.level.codeLevel === "1" ? "ère" : "ème";
    const levelLabel = `${c.level.codeLevel}${ordinal} ${c.level.option.nameOption}`;
    return {
      id: c.id,
      levelId: c.levelId,
      levelLabel,
      label: `${levelLabel} ${c.codeClass}`,
      codeClass: c.codeClass,
    };
  });

  const levelLabel = (() => {
    const { codeLevel } = student.schoolClass.level;
    const ordinal = codeLevel === "1" ? "ère" : "ème";
    return `${codeLevel}${ordinal} ${student.schoolClass.level.option.nameOption}`;
  })();

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Scolarité"
        title="Fiche élève"
        subtitle={`${student.firstName} ${student.name} ${student.postnom}`.trim()}
        backHref={backHref}
        backLabel="Liste des élèves"
      />
      <StudentDetailClient
        canEdit={canEdit}
        canEditStatus={canEditStatus}
        backHref={backHref}
        classOptions={classOptions}
        initialStudent={{
          id: student.id,
          firstName: student.firstName,
          name: student.name,
          postnom: student.postnom,
          sex: student.sex,
          status: student.status,
          birthDate: student.birthDate.toISOString().slice(0, 10),
          classId: student.classId,
          levelId: student.schoolClass.levelId,
          levelLabel,
          classLabel: `${levelLabel} ${student.schoolClass.codeClass}`,
          academicYear: student.academicYear,
          tutors: student.studentTutors.map((st) => ({
            id: st.tutor.id,
            firstName: st.tutor.firstName,
            name: st.tutor.name,
            postnom: st.tutor.postnom,
            address: st.tutor.address,
            contact: st.tutor.contact,
          })),
          createdAt: student.createdAt.toISOString(),
          updatedAt: student.updatedAt.toISOString(),
        }}
      />
    </div>
  );
}
