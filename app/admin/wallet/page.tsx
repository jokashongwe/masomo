import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRoles, canReadFinance, canWriteFinance } from "@/lib/auth";
import DepositForm from "./DepositForm";

export default async function AdminWalletPage() {
  const user = await requireRoles((role) => canReadFinance(role));
  const canWrite = canWriteFinance(user.role);

  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, balanceUSD: true, balanceCDF: true },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Wallet</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Manage USD/CDF balances and expenses.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/wallet/expenses"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
          >
            Expenses
          </Link>
        </div>
      </div>

      {wallet ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white p-5 shadow">
            <div className="text-sm font-medium opacity-95">Balance USD</div>
            <div className="mt-2 text-2xl font-semibold">{wallet.balanceUSD.toString()} USD</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-5 shadow">
            <div className="text-sm font-medium opacity-95">Balance CDF</div>
            <div className="mt-2 text-2xl font-semibold">{wallet.balanceCDF.toString()} CDF</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40">
          Wallet not found. Run the seed / create one from System Admin.
        </div>
      )}

      <div className="mt-6">
        <DepositForm canWrite={canWrite} />
      </div>
    </div>
  );
}

