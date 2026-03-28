import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-black dark:text-white">Connexion</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-300">Utilisez vos identifiants pour accéder à l’application.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}

