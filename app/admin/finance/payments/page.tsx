import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance } from "@/lib/auth";
import PaymentsClient from "./PaymentsClient";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminPage } from "../../components/admin-ui";

export default async function AdminFinancePaymentsPage() {
  await requireRoles((role) => canReadFinance(role));

  const [students, fees, modules, tranches, school] = await Promise.all([
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
      select: {
        id: true,
        codeTranche: true,
        moduleId: true,
        startDay: true,
        startMonth: true,
        endDay: true,
        endMonth: true,
        module: { select: { name: true } },
      },
    }),
    prisma.school.findFirst({ orderBy: { id: "asc" }, select: { name: true } }),
  ]);

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Paiements de frais"
        subtitle="Bordereau banque, bordereau par tranche, paiement direct et import Excel."
        backHref="/admin/finance"
      />
      <div className="mt-6">
        <PaymentsClient
          schoolName={school?.name ?? "Établissement"}
          students={students.map((s) => ({
            id: s.id,
            label: `${s.firstName} ${s.name} ${s.postnom} - ${s.schoolClass.codeClass}`,
          }))}
          fees={fees}
          modules={modules}
          tranches={tranches.map((t) => ({
            id: t.id,
            codeTranche: t.codeTranche,
            moduleId: t.moduleId,
            moduleName: t.module.name,
            startDay: t.startDay,
            startMonth: t.startMonth,
            endDay: t.endDay,
            endMonth: t.endMonth,
          }))}
        />
      </div>
    </div>
  );
}
