import LoginForm from "./LoginForm";
import LoginLayoutChrome from "./LoginLayoutChrome";

export default function LoginPage() {
  return (
    <LoginLayoutChrome
      title="Connexion"
      subtitle="Utilisez vos identifiants pour accéder à l’administration et aux modules autorisés."
    >
      <LoginForm />
    </LoginLayoutChrome>
  );
}
