import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ModulesCrud from "./ModulesCrud";
import { requireRoles, canReadFinance } from "@/lib/auth";

export default async function AdminFinanceModulesPage() {
  await requireRoles((role) => canReadFinance(role));
  const modules = await prisma.billingModule.findMany({
    orderBy: { id: "asc" },
    include: { tranches: { orderBy: { id: "asc" } } },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Billing Modules</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Each module has start/end (day/month) and tranches.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/finance"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ModulesCrud initialModules={modules} />
      </div>
    </div>
  );
}

