import Link from "next/link";
import LoginForm from "./login/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Connexion</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Entrez vos identifiants pour accéder à l’application.
      </p>

      <div className="mt-6">
        <LoginForm />
      </div>

      {user ? (
        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4 text-sm">
          Connecté en tant que <span className="font-medium">{user.name}</span> ({user.role}).{" "}
          <Link className="text-zinc-900 dark:text-zinc-50 underline font-medium" href="/enroll">
            Aller à l’inscription
          </Link>
        </div>
      ) : null}
    </div>
  );
}
