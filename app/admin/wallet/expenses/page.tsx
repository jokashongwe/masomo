import { prisma } from "@/lib/prisma";
import { canReadFinance, canWriteFinance, requireRoles } from "@/lib/auth";
import ExpensesCrud from "./ExpensesCrud";
import type { Prisma } from "@/generated/prisma/client";
import AdminPageHeader from "../../components/AdminPageHeader";
import { adminCard, adminPage } from "../../components/admin-ui";

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
  const academicYearParam = sp.academicYearId;
  const academicYearParamStr = Array.isArray(academicYearParam) ? academicYearParam[0] : academicYearParam;
  const academicYearFromQuery = academicYearParamStr ? parseIntSafe(academicYearParamStr, 0) : 0;

  const academicYears = await prisma.academicYear.findMany({
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { id: true, name: true, isCurrent: true },
  });

  const defaultYearId =
    academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? null;
  const filterYearId =
    academicYearFromQuery > 0 && academicYears.some((y) => y.id === academicYearFromQuery)
      ? academicYearFromQuery
      : defaultYearId;

  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (!wallet) {
    return (
      <div className={adminPage}>
        <div className={adminCard}>
          Budget introuvable. Lancez le seed ou créez-en un via l’administrateur système.
        </div>
      </div>
    );
  }

  if (academicYears.length === 0) {
    return (
      <div className={adminPage}>
        <AdminPageHeader
          kicker="Trésorerie"
          title="Dépenses"
          subtitle="Enregistrer et suivre les dépenses du Budget."
          backHref="/admin/wallet"
          backLabel="Budget"
        />
        <div className={`${adminCard} mt-6`}>
          Aucune année scolaire n’est définie. Créez-en une dans « Années scolaires » pour enregistrer des dépenses.
        </div>
      </div>
    );
  }

  const where: Prisma.ExpenseWhereInput = { walletId: wallet.id };
  if (filterYearId != null) {
    where.academicYearId = filterYearId;
  }
  if (qStr && qStr.trim()) {
    where.OR = [{ description: { contains: qStr.trim(), mode: "insensitive" } }];
  }
  if (currency === "USD" || currency === "CDF") {
    where.currency = currency;
  }

  const total = filterYearId != null ? await prisma.expense.count({ where }) : 0;
  const items =
    filterYearId != null
      ? await prisma.expense.findMany({
          where,
          orderBy: { occurredAt: "desc" },
          skip: (page - 1) * take,
          take,
          include: { academicYear: { select: { id: true, name: true } } },
        })
      : [];

  const pageCount = Math.max(1, Math.ceil(total / take));

  const normalized = items.map((e) => ({
    id: e.id,
    currency: e.currency,
    amount: e.amount.toString(),
    description: e.description,
    occurredAt: e.occurredAt.toISOString(),
    academicYearId: e.academicYearId,
    academicYearName: e.academicYear.name,
  }));

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Trésorerie"
        title="Dépenses"
        subtitle="Enregistrer et suivre les dépenses du Budget."
        backHref="/admin/wallet"
        backLabel="Budget"
      />
      <div className="mt-6">
        <ExpensesCrud
          canWrite={canWrite}
          academicYears={academicYears.map(({ id, name }) => ({ id, name }))}
          selectedAcademicYearId={filterYearId}
          initialExpenses={normalized}
          total={total}
          page={page}
          pageCount={pageCount}
          q={qStr ?? ""}
          currency={currency === "USD" || currency === "CDF" ? currency : ""}
          take={take}
        />
      </div>
    </div>
  );
}
