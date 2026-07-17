import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma, StudentStatus } from "@/generated/prisma/client";
import { requireRoles, canManageSchool, canEditStudentProfile } from "@/lib/auth";
import { studentSexLabel, studentStatusBadgeClass, studentStatusLabel, STUDENT_STATUS_OPTIONS } from "@/lib/student-labels";
import AdminPageHeader from "../components/AdminPageHeader";
import {
  adminCard,
  adminGhostButton,
  adminInput,
  adminLabel,
  adminPage,
  adminPrimaryButton,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
  adminThead,
  adminTd,
  adminTableEmpty,
} from "../components/admin-ui";

function parseIntSafe(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const user = await requireRoles((role) => canManageSchool(role));
  const canEdit = canEditStudentProfile(user.role);
  const sp = (await searchParams) ?? {};

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  if (!currentYear) {
    return (
      <div className={adminPage}>
        <div className={adminCard}>
          Aucune année scolaire en cours. Veuillez la configurer via l’administrateur système.
        </div>
      </div>
    );
  }
  const qRaw = sp.q;
  const q = Array.isArray(qRaw) ? qRaw[0] : qRaw;

  const classIdRaw = sp.classId;
  const classIdStr = Array.isArray(classIdRaw) ? classIdRaw[0] : classIdRaw;
  const classId = classIdStr ? Number(classIdStr) : undefined;

  const statusRaw = sp.status;
  const statusStr = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;
  const validStatuses = STUDENT_STATUS_OPTIONS.map((o) => o.value);
  const statusFilter =
    statusStr && validStatuses.includes(statusStr as StudentStatus) ? (statusStr as StudentStatus) : undefined;

  const page = parseIntSafe(Array.isArray(sp.page) ? sp.page[0] : sp.page, 1);
  const take = parseIntSafe(Array.isArray(sp.take) ? sp.take[0] : sp.take, 10);

  const queryWhere: Prisma.StudentWhereInput = { academicYearId: currentYear.id };
  if (classId && Number.isFinite(classId)) queryWhere.classId = classId;
  if (statusFilter) queryWhere.status = statusFilter;

  if (q && q.trim().length > 0) {
    queryWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { postnom: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
    ];
  }

  const total = await prisma.student.count({ where: queryWhere });

  const classes = await prisma.schoolClass.findMany({
    include: {
      level: {
        include: {
          option: {
            include: {
              section: {
                include: { school: true },
              },
            },
          },
        },
      },
    },
  });

  const items = await prisma.student.findMany({
    where: queryWhere,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * take,
    take,
    include: {
      schoolClass: {
        include: {
          level: {
            include: {
              option: {
                include: {
                  section: {
                    include: {
                      school: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      studentTutors: {
        include: {
          tutor: true,
        },
      },
    },
  });

  const classOptions = classes.map((c) => ({
    id: c.id,
    label: `${c.codeClass} - ${c.level.codeLevel} (${c.level.option.section.codeSection}) - ${c.level.option.section.school.name}`,
  }));

  const pageCount = Math.max(1, Math.ceil(total / take));

  function buildQuery(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classIdStr) params.set("classId", String(classIdStr));
    if (statusStr) params.set("status", statusStr);
    params.set("page", String(nextPage));
    params.set("take", String(take));
    return `?${params.toString()}`;
  }

  function buildStudentHref(studentId: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classIdStr) params.set("classId", String(classIdStr));
    if (statusStr) params.set("status", statusStr);
    if (page > 1) params.set("page", String(page));
    if (take !== 10) params.set("take", String(take));
    const qs = params.toString();
    return qs ? `/admin/students/${studentId}?${qs}` : `/admin/students/${studentId}`;
  }

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Scolarité"
        title="Élèves"
        subtitle="Consulter les fiches, filtrer par statut. La modification est réservée à l’administrateur système."
        actions={
          <>
            <Link href="/admin/students/import" className={adminGhostButton}>
              Import Excel
            </Link>
            <Link href="/admin/enroll" className={adminPrimaryButton}>
              Inscrire
            </Link>
          </>
        }
        backLabel="Retour à l’admin"
      />

      <div className={`${adminCard} mt-6`}>
        <form method="GET" className="grid grid-cols-1 items-end gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className={`block ${adminLabel}`}>Recherche</label>
            <input
              name="q"
              defaultValue={q ?? ""}
              className={`mt-2 ${adminInput}`}
              placeholder="Nom, postnom, prénom"
            />
          </div>
          <div>
            <label className={`block ${adminLabel}`}>Classe</label>
            <select name="classId" defaultValue={classIdStr ?? ""} className={`mt-2 ${adminInput}`}>
              <option value="">Toutes les classes</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block ${adminLabel}`}>Statut</label>
            <select name="status" defaultValue={statusStr ?? ""} className={`mt-2 ${adminInput}`}>
              <option value="">Tous les statuts</option>
              {STUDENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block ${adminLabel}`}>Taille de page</label>
            <select name="take" defaultValue={String(take)} className={`mt-2 ${adminInput}`}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="md:col-span-5">
            <button type="submit" className={adminPrimaryButton}>
              Rechercher
            </button>
            <Link href="/admin/students" className={`${adminGhostButton} ml-3 text-sm`}>
              Réinitialiser
            </Link>
          </div>
        </form>
      </div>

      <div className={`${adminTableWrap} mt-6`}>
        <table className={adminTable}>
          <thead className={adminThead}>
            <tr>
              <th className={adminTh}>Matricule</th>
              <th className={adminTh}>Élève</th>
              <th className={adminTh}>Statut</th>
              <th className={adminTh}>Sexe</th>
              <th className={adminTh}>Promotion</th>
              <th className={adminTh}>Classe</th>
              <th className={adminTh}>Tuteurs</th>
              <th className={adminTh}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className={adminTableEmpty}>
                  Aucun élève trouvé.
                </td>
              </tr>
            ) : (
              items.map((s) => {
                const classLabel = `${s.schoolClass.codeClass} `;
                const promotionLabel = `${s.schoolClass.level.codeLevel} ${s.schoolClass.level.codeLevel == "1" ? "ère": "ème"} ${s.schoolClass.level.option.nameOption}`;
                const tutorNames = s.studentTutors.map((st) => `${st.tutor.firstName} ${st.tutor.name} ${st.tutor.postnom}`.trim());
                return (
                  <tr key={s.id} className={adminTr}>
                    <td className={adminTd}>{s.matricule ?? "—"}</td>
                    <td className={adminTd}>
                      {s.firstName} {s.name} {s.postnom}
                    </td>
                    <td className={adminTd}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${studentStatusBadgeClass(s.status)}`}
                      >
                        {studentStatusLabel(s.status)}
                      </span>
                    </td>
                    <td className={adminTd}>{studentSexLabel(s.sex)}</td>
                    
                    <td className={adminTd}>{promotionLabel}</td>
                    <td className={adminTd}>{classLabel}</td>
                    <td className={adminTd}>
                      {tutorNames.length > 0 ? tutorNames.join(", ") : <span className="text-zinc-500">-</span>}
                    </td>
                    <td className={adminTd}>
                      <div className="flex flex-wrap gap-2">
                        <Link href={buildStudentHref(s.id)} className={adminGhostButton}>
                          {canEdit ? "Voir / modifier" : "Voir la fiche"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Page {page} sur {pageCount} ({total} au total).
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={buildQuery(page - 1)} className={adminGhostButton}>
              Précédent
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link href={buildQuery(page + 1)} className={adminGhostButton}>
              Suivant
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

