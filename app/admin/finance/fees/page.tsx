import { prisma } from "@/lib/prisma";
import FeesCrud from "./FeesCrud";
import { requireRoles, canReadFinance } from "@/lib/auth";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";

export default async function AdminFinanceFeesPage() {
  await requireRoles((role) => canReadFinance(role));
  const [levels, modules, tranches, fees, accounts] = await Promise.all([
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
        account: { select: { id: true, name: true, academicYearId: true } },
      },
    }),
    prisma.financeAccount.findMany({
      orderBy: [{ academicYear: { startDate: "desc" } }, { name: "asc" }],
      include: { academicYear: { select: { name: true } } },
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
    label: `${l.codeLevel} ${l.option.nameOption}`,
  }));

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    label: `${a.name} (${a.academicYear.name})`,
  }));

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Frais"
        subtitle="Gérer les frais, les attacher aux niveaux et aux comptes d’encaissement, et configurer les montants en USD/CDF."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <FeesCrud
          initialFees={normalizedFees}
          levelOptions={levelOptions}
          modules={modules}
          tranches={tranches}
          accountOptions={accountOptions}
        />
      </div>
    </div>
  );
}
