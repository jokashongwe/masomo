import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRoles, canManageSchool } from "@/lib/auth";
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
  await requireRoles((role) => canManageSchool(role));
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

  const page = parseIntSafe(Array.isArray(sp.page) ? sp.page[0] : sp.page, 1);
  const take = parseIntSafe(Array.isArray(sp.take) ? sp.take[0] : sp.take, 10);

  const queryWhere: Prisma.StudentWhereInput = { academicYearId: currentYear.id };
  if (classId && Number.isFinite(classId)) queryWhere.classId = classId;

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
    params.set("page", String(nextPage));
    params.set("take", String(take));
    return `?${params.toString()}`;
  }

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Scolarité"
        title="Élèves"
        subtitle="Rechercher et filtrer les élèves. La pagination est côté serveur."
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
        <form method="GET" className="grid grid-cols-1 items-end gap-3 md:grid-cols-4">
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
            <label className={`block ${adminLabel}`}>Taille de page</label>
            <select name="take" defaultValue={String(take)} className={`mt-2 ${adminInput}`}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="md:col-span-4">
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
          <thead>
            <tr>
              <th className={adminTh}>Élève</th>
              <th className={adminTh}>Sexe</th>
              <th className={adminTh}>Date de naissance</th>
              <th className={adminTh}>Classe</th>
              <th className={adminTh}>Tuteurs</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-zinc-600 dark:text-zinc-300">
                  Aucun élève trouvé.
                </td>
              </tr>
            ) : (
              items.map((s) => {
                const classLabel = `${s.schoolClass.codeClass} - ${s.schoolClass.level.codeLevel} (${s.schoolClass.level.option.section.codeSection}) - ${s.schoolClass.level.option.section.school.name}`;
                const tutorNames = s.studentTutors.map((st) => `${st.tutor.firstName} ${st.tutor.name} ${st.tutor.postnom}`.trim());
                return (
                  <tr key={s.id} className={adminTr}>
                    <td className="py-3 pr-3">
                      {s.firstName} {s.name} {s.postnom}
                    </td>
                    <td className="py-3 pr-3">{s.sex}</td>
                    <td className="py-3 pr-3">
                      {s.birthDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-3 pr-3">{classLabel}</td>
                    <td className="py-3 pr-3">
                      {tutorNames.length > 0 ? tutorNames.join(", ") : <span className="text-zinc-500">-</span>}
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

