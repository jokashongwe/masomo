import Link from "next/link";
import LoginForm from "./login/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Sign in</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">
        Enter your admin credentials to access the system.
      </p>

      <div className="mt-6">
        <LoginForm />
      </div>

      {user ? (
        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4 text-sm">
          Signed in as <span className="font-medium">{user.name}</span> ({user.role}).{" "}
          <Link className="text-zinc-900 dark:text-zinc-50 underline font-medium" href="/enroll">
            Go to enrollment
          </Link>
        </div>
      ) : null}
    </div>
  );
}
