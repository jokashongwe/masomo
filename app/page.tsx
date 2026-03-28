import Link from "next/link";
import LoginForm from "./login/LoginForm";
import LoginLayoutChrome from "./login/LoginLayoutChrome";
import { canManageSchool, getCurrentUser } from "@/lib/auth";
import { adminBackLink, adminNestedCard } from "./admin/components/admin-ui";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <LoginLayoutChrome
      title="Connexion"
      subtitle="Entrez vos identifiants pour accéder à l’application."
      footer={
        user ? (
          <div className={`${adminNestedCard} text-center text-sm text-zinc-600 dark:text-zinc-300`}>
            Connecté en tant que <span className="font-semibold text-zinc-900 dark:text-white">{user.name}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">({user.role})</span>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManageSchool(user.role) ? (
                <Link href="/admin/enroll" className={adminBackLink}>
                  Inscription (admin)
                </Link>
              ) : (
                <Link href="/admin" className={adminBackLink}>
                  Tableau de bord
                </Link>
              )}
            </div>
          </div>
        ) : null
      }
    >
      <LoginForm />
    </LoginLayoutChrome>
  );
}
