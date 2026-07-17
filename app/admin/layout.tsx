import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { canManageSchool, canReadFinance, getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { rolesLabelFr } from "@/lib/user-roles";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "./components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const showSchool = canManageSchool(user.roles);
  const showFinance = canReadFinance(user.roles);
  const showUsers = isSystemAdmin(user.roles);

  const school = await prisma.school.findFirst({
    orderBy: { id: "asc" },
    select: { name: true },
  });
  const brandName = school?.name ?? "Masomo";

  return (
    <div className="flex min-h-screen bg-[#eef6fb] dark:bg-zinc-950">
      <AdminSidebar
        userName={user.name}
        userRole={rolesLabelFr(user.roles)}
        brandName={brandName}
        showSchool={showSchool}
        showFinance={showFinance}
        showUsers={showUsers}
      />
      <main className="min-h-screen flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
