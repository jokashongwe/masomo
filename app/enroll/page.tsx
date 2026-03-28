import { redirect } from "next/navigation";
import { canManageSchool, getCurrentUser } from "@/lib/auth";

/** Ancienne URL publique : redirige vers l’admin pour les rôles autorisés. */
export default async function EnrollLegacyRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSchool(user.role)) redirect("/admin");
  redirect("/admin/enroll");
}
