import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRoles, canManageSchool } from "@/lib/auth";

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
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white/60 dark:bg-black/40">
          No academic year in progress. Please configure it from system admin.
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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Students</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Search and filter students. Pagination is server-side.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/enroll"
            className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 text-sm"
          >
            Enroll
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40">
        <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-black dark:text-white">Search</label>
            <input
              name="q"
              defaultValue={q ?? ""}
              className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              placeholder="Name, postnom, first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black dark:text-white">Class</label>
            <select
              name="classId"
              defaultValue={classIdStr ?? ""}
              className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-black dark:text-white">Page size</label>
            <select
              name="take"
              defaultValue={String(take)}
              className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800"
            >
              Search
            </button>
            <Link
              href="/admin/students"
              className="ml-3 text-sm text-zinc-600 dark:text-zinc-300 hover:underline"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-700 dark:text-zinc-300">
              <th className="py-2 pr-3">Student</th>
              <th className="py-2 pr-3">Sex</th>
              <th className="py-2 pr-3">Birth date</th>
              <th className="py-2 pr-3">Class</th>
              <th className="py-2 pr-3">Tutors</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-zinc-600 dark:text-zinc-300">
                  No students found.
                </td>
              </tr>
            ) : (
              items.map((s) => {
                const classLabel = `${s.schoolClass.codeClass} - ${s.schoolClass.level.codeLevel} (${s.schoolClass.level.option.section.codeSection}) - ${s.schoolClass.level.option.section.school.name}`;
                const tutorNames = s.studentTutors.map((st) => `${st.tutor.firstName} ${st.tutor.name} ${st.tutor.postnom}`.trim());
                return (
                  <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
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
          Showing page {page} of {pageCount} ({total} total).
        </div>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={buildQuery(page - 1)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
            >
              Prev
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link
              href={buildQuery(page + 1)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-white/60 dark:hover:bg-black/40"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

