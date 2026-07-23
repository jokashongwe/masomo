import { requireUser } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";
import AccountForm from "./AccountForm";

export default async function AdminAccountPage() {
  const user = await requireUser();

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Compte"
        title="Mon compte"
        subtitle="Modifiez vos informations personnelles et votre mot de passe."
      />
      <AccountForm
        initialUser={{
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          roles: user.roles,
        }}
      />
    </div>
  );
}
