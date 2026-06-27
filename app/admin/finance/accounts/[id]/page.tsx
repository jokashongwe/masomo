import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canReadFinance, isSystemAdmin, requireRoles } from "@/lib/auth";
import AdminPageHeader from "../../../components/AdminPageHeader";
import { adminPage } from "../../../components/admin-ui";
import AccountDetailClient from "./AccountDetailClient";

export default async function AdminFinanceAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRoles((role) => canReadFinance(role));
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isFinite(accountId)) notFound();

  const account = await prisma.financeAccount.findUnique({
    where: { id: accountId },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      fees: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } },
    },
  });
  if (!account) notFound();

  const transactions = await prisma.financeAccountTransaction.findMany({
    where: { accountId: account.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    include: {
      feePayment: {
        select: {
          id: true,
          receiptNumber: true,
          student: { select: { id: true, firstName: true, name: true, postnom: true } },
          fee: { select: { code: true, name: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title={account.name}
        subtitle={`Compte d’encaissement — année ${account.academicYear.name}`}
        backHref="/admin/finance/accounts"
        backLabel="Comptes"
      />
      <AccountDetailClient
        account={{
          id: account.id,
          name: account.name,
          description: account.description,
          balanceUSD: account.balanceUSD.toString(),
          balanceCDF: account.balanceCDF.toString(),
          academicYear: account.academicYear,
          fees: account.fees,
        }}
        initialTransactions={transactions.map((t) => ({
          id: t.id,
          type: t.type,
          currency: t.currency,
          amount: t.amount.toString(),
          note: t.note,
          createdAt: t.createdAt.toISOString(),
          feePayment: t.feePayment,
          createdBy: t.createdBy,
        }))}
        canWithdraw={isSystemAdmin(user.role)}
      />
    </div>
  );
}
