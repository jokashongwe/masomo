import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance } from "@/lib/auth";
import PaymentsClient from "./PaymentsClient";

export default async function AdminFinancePaymentsPage() {
  await requireRoles((role) => canReadFinance(role));

  const [students, fees, modules, tranches] = await Promise.all([
    prisma.student.findMany({
      orderBy: [{ firstName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        postnom: true,
        firstName: true,
        schoolClass: { select: { codeClass: true } },
      },
      take: 2000,
    }),
    prisma.fee.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, chargeType: true },
    }),
    prisma.billingModule.findMany({
      orderBy: [{ startMonth: "asc" }, { startDay: "asc" }],
      select: { id: true, name: true, startDay: true, startMonth: true, endDay: true, endMonth: true },
    }),
    prisma.moduleTranche.findMany({
      orderBy: { id: "asc" },
      select: { id: true, codeTranche: true, moduleId: true, module: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Paiements de frais</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Bordereau banque, paiement direct (non-tranche), et import Excel.
          </p>
        </div>
        <Link
          href="/admin/finance"
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
        >
          Retour
        </Link>
      </div>

      <div className="mt-6">
        <PaymentsClient
          students={students.map((s) => ({
            id: s.id,
            label: `${s.firstName} ${s.name} ${s.postnom} - ${s.schoolClass.codeClass}`,
          }))}
          fees={fees}
          modules={modules}
          tranches={tranches.map((t) => ({ id: t.id, codeTranche: t.codeTranche, moduleId: t.moduleId, moduleName: t.module.name }))}
        />
      </div>
    </div>
  );
}

