import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { UserRole } from "@/generated/prisma/client";
import { canManageSchool, canReadFinance, getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "./components/AdminSidebar";

function roleLabelFr(role: UserRole): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "Administrateur système";
    case "FINANCE_MANAGER":
      return "Responsable finances";
    case "FINANCE_VIEWER":
      return "Consultation finances";
    case "SCHOOL_MANAGER":
      return "Gestionnaire d’école";
    default:
      return role;
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const showSchool = canManageSchool(user.role);
  const showFinance = canReadFinance(user.role);
  const showUsers = isSystemAdmin(user.role);

  const school = await prisma.school.findFirst({
    orderBy: { id: "asc" },
    select: { name: true },
  });
  const brandName = school?.name ?? "Masomo";

  return (
    <div className="flex min-h-screen bg-[#eef6fb] dark:bg-zinc-950">
      <AdminSidebar
        userName={user.name}
        userRole={roleLabelFr(user.role)}
        brandName={brandName}
        showSchool={showSchool}
        showFinance={showFinance}
        showUsers={showUsers}
      />
      <main className="min-h-screen flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
