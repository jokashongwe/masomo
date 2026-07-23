import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles, canManageSchool } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminCard, adminGhostButton, adminPage } from "../components/admin-ui";
import EnrollmentForm from "./EnrollmentForm";

export default async function AdminEnrollPage() {
  await requireRoles(canManageSchool);

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  if (!currentYear) {
    return (
      <div className={adminPage}>
        <AdminPageHeader
          kicker="Scolarité"
          title="Inscription d’un élève"
          subtitle="Aucune année scolaire n’est en cours."
        />
        <div className={`${adminCard} mt-6`}>
          Veuillez contacter l’administrateur système pour configurer une année scolaire active.
        </div>
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
    orderBy: [{ level: { option: { nameOption: "asc" } } }, { level: { codeLevel: "asc" } }, { codeClass: "asc" }],
  });

  const classOptions = classes.map((c) => {
    const { codeLevel } = c.level;
    const ordinal = codeLevel === "1" ? "ère" : "ème";
    const levelLabel = `${codeLevel}${ordinal} ${c.level.name}`;
    return {
      id: c.id,
      codeClass: c.codeClass,
      levelId: c.levelId,
      levelLabel,
      optionId: c.level.optionId,
      optionLabel: c.level.option.nameOption,
    };
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Scolarité"
        title="Inscription d’un élève"
        subtitle="Choisissez l’option et le niveau, puis assignez l’élève à une classe."
        actions={
          <Link href="/admin/students" className={adminGhostButton}>
            Liste des élèves
          </Link>
        }
      />

      <div className={`${adminCard} mt-6`}>
        {classOptions.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-300">
            Aucune classe trouvée. Créez d’abord École / Section / Option / Niveau / Classe, puis revenez pour inscrire des
            élèves.
          </p>
        ) : (
          <EnrollmentForm classOptions={classOptions} />
        )}
      </div>
    </div>
  );
}
