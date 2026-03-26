import { prisma } from "@/lib/prisma";
import EnrollmentForm from "./EnrollmentForm";
import { requireUser } from "@/lib/auth";

export default async function EnrollPage() {
  await requireUser();
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  if (!currentYear) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-black dark:text-white">Enroll Student</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          No academic year is currently in progress. Please contact system admin.
        </p>
      </div>
    );
  }
  const classes = await prisma.schoolClass.findMany({
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
    orderBy: { codeClass: "asc" },
  });

  const classOptions = classes.map((c) => ({
    id: c.id,
    label: `${c.codeClass} - ${c.level.codeLevel} (${c.level.option.section.codeSection}) - ${c.level.option.section.school.name}`,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Enroll Student</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Enter the student details and their tutor(s), then assign them to a class.
      </p>

      <div className="mt-8">
        {classOptions.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white/60 dark:bg-black/40">
            No classes found yet. Create your `School` / `Section` / `Option` / `Level` / `Class` first,
            then come back to enroll students.
          </div>
        ) : (
          <EnrollmentForm classOptions={classOptions} />
        )}
      </div>
    </div>
  );
}

