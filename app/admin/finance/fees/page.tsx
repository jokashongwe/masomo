import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FeesCrud from "./FeesCrud";
import { requireRoles, canReadFinance } from "@/lib/auth";

export default async function AdminFinanceFeesPage() {
  await requireRoles((role) => canReadFinance(role));
  const [levels, modules, tranches, fees] = await Promise.all([
    prisma.level.findMany({
      orderBy: { id: "asc" },
      include: { option: { include: { section: { include: { school: true } } } } },
    }),
    prisma.billingModule.findMany({ orderBy: { id: "asc" } }),
    prisma.moduleTranche.findMany({ orderBy: { id: "asc" }, include: { module: true } }),
    prisma.fee.findMany({
      orderBy: { id: "asc" },
      include: {
        feeLevels: true,
        totalAmounts: true,
        moduleAmounts: true,
        trancheAmounts: true,
      },
    }),
  ]);

  const normalizedFees = fees.map((f) => ({
    ...f,
    totalAmounts: f.totalAmounts.map((a) => ({ currency: a.currency, amount: a.amount.toString() })),
    moduleAmounts: f.moduleAmounts.map((a) => ({
      moduleId: a.moduleId,
      currency: a.currency,
      amount: a.amount.toString(),
    })),
    trancheAmounts: f.trancheAmounts.map((a) => ({
      trancheId: a.trancheId,
      currency: a.currency,
      amount: a.amount.toString(),
    })),
    feeLevels: f.feeLevels.map((x) => ({ levelId: x.levelId })),
  }));

  const levelOptions = levels.map((l) => ({
    id: l.id,
    label: `${l.codeLevel} - ${l.name} | ${l.option.codeOption} | ${l.option.section.codeSection} | ${l.option.section.school.name}`,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Frais</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Gérer les frais, les attacher aux niveaux, et configurer les montants en USD/CDF (TOTAL ou PAR MODULE).
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
        <FeesCrud
          initialFees={normalizedFees}
          levelOptions={levelOptions}
          modules={modules}
          tranches={tranches}
        />
      </div>
    </div>
  );
}

