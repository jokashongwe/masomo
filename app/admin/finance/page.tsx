import Link from "next/link";
import { requireRoles, canReadFinance } from "@/lib/auth";

export default async function AdminFinanceHomePage() {
  await requireRoles((role) => canReadFinance(role));
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">Finances</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">Gérer les frais, les modules de facturation et les tranches.</p>
        </div>
        <Link
          href="/admin"
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
        >
          Retour à l’admin
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40" href="/admin/finance/modules">
          Modules
        </Link>
        <Link className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40" href="/admin/finance/tranches">
          Tranches
        </Link>
        <Link className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40" href="/admin/finance/fees">
          Frais
        </Link>
        <Link className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40" href="/admin/finance/payments">
          Paiements
        </Link>
      </div>
    </div>
  );
}

