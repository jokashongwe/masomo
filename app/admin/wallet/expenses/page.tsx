import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, requireRoles } from "@/lib/auth";
import ExpensesCrud from "./ExpensesCrud";
import type { Prisma } from "@/generated/prisma/client";

function parseIntSafe(value: string | string[] | undefined, fallback: number) {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export default async function AdminWalletExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const user = await requireRoles((role) => canReadFinance(role));
  const canWrite = canWriteFinance(user.role);

  const sp = (await searchParams) ?? {};
  const q = sp.q;
  const qStr = Array.isArray(q) ? q[0] : q;
  const currencyRaw = sp.currency;
  const currency = Array.isArray(currencyRaw) ? currencyRaw[0] : currencyRaw;
  const page = parseIntSafe(sp.page, 1);
  const take = parseIntSafe(sp.take, 10);

  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!wallet) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white/60 dark:bg-black/40">
          Wallet not found. Run seed or create wallet as System Admin.
        </div>
      </div>
    );
  }

  const where: Prisma.ExpenseWhereInput = { walletId: wallet.id };
  if (qStr && qStr.trim()) {
    where.OR = [{ description: { contains: qStr.trim(), mode: "insensitive" } }];
  }
  if (currency === "USD" || currency === "CDF") {
    where.currency = currency;
  }

  const total = await prisma.expense.count({ where });
  const items = await prisma.expense.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    skip: (page - 1) * take,
    take,
  });

  const pageCount = Math.max(1, Math.ceil(total / take));

  const normalized = items.map((e) => ({
    ...e,
    amount: e.amount.toString(),
    occurredAt: e.occurredAt.toISOString(),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <ExpensesCrud
        canWrite={canWrite}
        initialExpenses={normalized}
        total={total}
        page={page}
        pageCount={pageCount}
        q={qStr ?? ""}
        currency={currency === "USD" || currency === "CDF" ? currency : ""}
        take={take}
      />
    </div>
  );
}

