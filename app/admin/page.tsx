import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser, isSystemAdmin, canReadFinance, canManageSchool } from "@/lib/auth";
import type { UserRole } from "@/generated/prisma/client";
import { getAdminDashboardStats, MAIN_FINANCE_ACCOUNT_NAME } from "@/lib/admin-dashboard-stats";
import { getEnrollmentsByOption, getWalletBalanceSummary } from "@/lib/school-dashboard-stats";
import { IconFinance, IconPayments, IconPlus, IconReports, IconStudents, IconWallet } from "./components/AdminIcons";

function formatMoney(amount: number, currency: "USD" | "CDF") {
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ` ${currency}`;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>;
}

function GenericRoleWelcome({ name }: { name: string }) {
  return (
    <PageShell>
      <div className="overflow-hidden rounded-3xl border border-sky-100/80 bg-white p-8 shadow-lg shadow-sky-200/30 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">Bon retour {name} !</h1>
            <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-300">
              Votre rôle donne accès à certaines sections. Utilisez la barre latérale pour naviguer dans l’administration.
            </p>
          </div>
          <div className="relative hidden h-28 w-40 shrink-0 md:block">
            <div className="absolute right-4 top-2 h-16 w-16 rounded-full bg-amber-300/90" />
            <div className="absolute right-12 top-8 h-12 w-12 rounded-full bg-[#2D9CDB]/80" />
            <div className="absolute right-0 top-10 h-10 w-10 rounded-full bg-orange-400/85" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function DashboardKpiGrid({
  stats,
  showStudents,
  cardBase,
}: {
  stats: Awaited<ReturnType<typeof getAdminDashboardStats>>;
  showStudents: boolean;
  cardBase: string;
}) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div className={cardBase}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#2D9CDB] dark:bg-sky-900/40 dark:text-sky-300">
          <IconFinance className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total encaissé</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(stats.totalEncaisse.usd, "USD")}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(stats.totalEncaisse.cdf, "CDF")}</p>
        <p className="mt-2 text-xs text-zinc-500">Paiements de frais — année en cours</p>
      </div>

      <div className={cardBase}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <IconFinance className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Solde du compte principal</p>
        {stats.mainAccount ? (
          <>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {formatMoney(stats.mainAccount.balanceUSD, "USD")}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatMoney(stats.mainAccount.balanceCDF, "CDF")}
            </p>
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{stats.mainAccount.name}</p>
            <Link
              href={`/admin/finance/accounts/${stats.mainAccount.id}`}
              className="mt-3 inline-flex text-sm font-semibold text-[#2D9CDB] hover:underline"
            >
              Voir le compte →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-zinc-500">Aucun compte pour cette année</p>
            <Link
              href="/admin/finance/accounts"
              className="mt-3 inline-flex text-sm font-semibold text-[#2D9CDB] hover:underline"
            >
              Gérer les comptes →
            </Link>
          </>
        )}
      </div>

      <div className={cardBase}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <IconFinance className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Retraits (compte principal)</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
          {formatMoney(stats.mainAccountWithdrawals.usd, "USD")}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(stats.mainAccountWithdrawals.cdf, "CDF")}</p>
        <p className="mt-2 text-xs text-zinc-500">Année en cours</p>
      </div>

      <div className={cardBase}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          <IconWallet className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Solde caution</p>
        {stats.walletBalance ? (
          <>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {formatMoney(stats.walletBalance.usd, "USD")}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(stats.walletBalance.cdf, "CDF")}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Caution non configurée</p>
        )}
      </div>

      <div className={cardBase}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <IconWallet className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total dépenses (caution)</p>
        <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(stats.walletExpenses.usd, "USD")}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(stats.walletExpenses.cdf, "CDF")}</p>
        <p className="mt-2 text-xs text-zinc-500">Année en cours</p>
      </div>

      {showStudents ? (
        <div className={cardBase}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <IconStudents className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total inscrits</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{stats.studentTotal}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Élèves — année en cours</p>
        </div>
      ) : null}
    </div>
  );
}

async function FinanceManagerHome({ name, roles }: { name: string; roles: UserRole[] }) {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!currentYear) {
    return (
      <PageShell>
        <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-8 shadow-md dark:border-amber-900/40 dark:bg-amber-950/30">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Bon retour {name} !</h1>
          <p className="mt-2 text-zinc-700 dark:text-zinc-200">
            Aucune année scolaire n’est en cours. Les statistiques financières seront disponibles une fois l’année définie.
          </p>
          <Link
            href="/admin/academic-years"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2D9CDB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/40 hover:bg-[#2590c9]"
          >
            Années scolaires
          </Link>
        </div>
      </PageShell>
    );
  }

  const yearStart = currentYear.startDate;
  const yearEndExclusive = new Date(currentYear.endDate.getTime() + 1);

  const stats = await getAdminDashboardStats({
    academicYearId: currentYear.id,
    yearStart,
    yearEndExclusive,
    includeStudents: false,
  });

  const cardBase =
    "relative overflow-hidden rounded-3xl border border-sky-100/70 bg-white p-6 shadow-lg shadow-sky-200/25 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";
  const btnPrimary =
    "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2D9CDB] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/35 hover:bg-[#2590c9]";

  const roleLabel =
    roles.includes("FINANCE_VIEWER") && !roles.includes("FINANCE_MANAGER")
      ? "Consultation finance"
      : "Finances";

  return (
    <PageShell>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#2D9CDB]">Tableau de bord — {roleLabel}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">
            Finances — {currentYear.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Bon retour {name}.</p>
        </div>
      </header>

      <section
        className={`${cardBase} mb-8 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/20 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900`}
      >
        <p className="text-zinc-600 dark:text-zinc-300">
          Synthèse financière pour l’année scolaire en cours : encaissements, compte principal, caution et dépenses.
        </p>
      </section>

      <DashboardKpiGrid stats={stats} showStudents={false} cardBase={cardBase} />

      {stats.mainAccount ? (
        <section className={`${cardBase} mb-8 border-emerald-100/80 bg-gradient-to-br from-emerald-50/50 via-white to-sky-50/30 dark:border-emerald-900/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Compte principal</p>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{stats.mainAccount.name}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {formatMoney(stats.mainAccount.balanceUSD, "USD")} · {formatMoney(stats.mainAccount.balanceCDF, "CDF")}
              </p>
            </div>
            <Link
              href={`/admin/finance/accounts/${stats.mainAccount.id}`}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-300/30 hover:bg-emerald-700"
            >
              Ouvrir le compte
            </Link>
          </div>
        </section>
      ) : (
        <section className={`${cardBase} mb-8 border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20`}>
          <p className="font-semibold text-zinc-900 dark:text-white">Compte principal introuvable</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Aucun compte d’encaissement pour l’année {currentYear.name}. Créez « {MAIN_FINANCE_ACCOUNT_NAME} » dans Comptes.
          </p>
          <Link href="/admin/finance/accounts" className={`${btnPrimary} mt-4 w-auto`}>
            Aller aux comptes
          </Link>
        </section>
      )}

      <div className={`${cardBase}`}>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Raccourcis</h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.mainAccount ? (
            <div className="flex flex-col rounded-2xl border border-emerald-100/80 bg-emerald-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <IconFinance className="h-6 w-6" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Compte principal</p>
              <Link href={`/admin/finance/accounts/${stats.mainAccount.id}`} className={`${btnPrimary} mt-3`}>
                Ouvrir
              </Link>
            </div>
          ) : null}
          <div className="flex flex-col rounded-2xl border border-sky-100/80 bg-sky-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2D9CDB]/15 text-[#2D9CDB]">
              <IconPayments className="h-6 w-6" />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Paiements</p>
            <Link href="/admin/finance/payments" className={`${btnPrimary} mt-3`}>
              Ouvrir
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-indigo-100/80 bg-indigo-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
              <IconWallet className="h-6 w-6" />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Caution</p>
            <Link href="/admin/wallet" className={`${btnPrimary} mt-3`}>
              Ouvrir
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-emerald-100/80 bg-emerald-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <IconFinance className="h-6 w-6" />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Comptes</p>
            <Link href="/admin/finance/accounts" className={`${btnPrimary} mt-3`}>
              Ouvrir
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-rose-100/80 bg-rose-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
              <IconWallet className="h-6 w-6" />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Dépenses</p>
            <Link href="/admin/wallet/expenses" className={`${btnPrimary} mt-3`}>
              Ouvrir
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-amber-100/80 bg-amber-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
              <IconReports className="h-6 w-6" />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Rapports</p>
            <Link href="/admin/reports" className={`${btnPrimary} mt-3`}>
              Ouvrir
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

async function SchoolManagerHome({ name }: { name: string }) {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  });

  if (!currentYear) {
    return (
      <PageShell>
        <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-8 shadow-md dark:border-amber-900/40 dark:bg-amber-950/30">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Bon retour {name} !</h1>
          <p className="mt-2 text-zinc-700 dark:text-zinc-200">
            Aucune année scolaire n’est en cours. Les statistiques élèves seront disponibles une fois l’année définie.
          </p>
          <Link
            href="/admin/academic-years"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2D9CDB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/40 hover:bg-[#2590c9]"
          >
            Années scolaires
          </Link>
        </div>
      </PageShell>
    );
  }

  const [sexCounts, studentTotal, byOption, walletBalance] = await Promise.all([
    prisma.student.groupBy({
      by: ["sex"],
      where: { academicYearId: currentYear.id, status: "ENROLLED" },
      _count: { _all: true },
    }),
    prisma.student.count({ where: { academicYearId: currentYear.id, status: "ENROLLED" } }),
    getEnrollmentsByOption(currentYear.id),
    getWalletBalanceSummary(),
  ]);

  const totalMale = sexCounts.find((x) => x.sex === "MALE")?._count._all ?? 0;
  const totalFemale = sexCounts.find((x) => x.sex === "FEMALE")?._count._all ?? 0;
  const totalOther = sexCounts.find((x) => x.sex === "OTHER")?._count._all ?? 0;

  const cardBase =
    "relative overflow-hidden rounded-3xl border border-sky-100/70 bg-white p-6 shadow-lg shadow-sky-200/25 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";
  const btnPrimary =
    "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2D9CDB] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/35 hover:bg-[#2590c9]";

  return (
    <PageShell>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#2D9CDB]">Tableau de bord — Scolarité</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">
            Élèves — {currentYear.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Bon retour {name}.</p>
        </div>
      </header>

      <section
        className={`${cardBase} mb-8 bg-gradient-to-br from-white via-violet-50/40 to-sky-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900`}
      >
        <p className="text-zinc-600 dark:text-zinc-300">
          Effectifs inscrits et répartition par option pour l&apos;année scolaire en cours, ainsi que le solde de la
          caution.
        </p>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className={cardBase}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <IconStudents className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Inscrits</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{studentTotal}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Statut « Inscrit » — année en cours</p>
        </div>
        <div className={cardBase}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <IconWallet className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Solde caution</p>
          {walletBalance ? (
            <>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {formatMoney(walletBalance.usd, "USD")}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(walletBalance.cdf, "CDF")}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Caution non configurée</p>
          )}
        </div>
        <div className={`${cardBase} sm:col-span-2 lg:col-span-1`}>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Répartition par sexe (inscrits)</p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-zinc-500">Garçons</p>
              <p className="text-xl font-bold text-[#2D9CDB]">{totalMale}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Filles</p>
              <p className="text-xl font-bold text-pink-600 dark:text-pink-400">{totalFemale}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Autre</p>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{totalOther}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardBase}>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Inscriptions par option</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Total des élèves inscrits, regroupés par option et section.
          </p>
          <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
            {byOption.length === 0 ? (
              <li className="text-zinc-500">Aucun élève inscrit pour cette année.</li>
            ) : (
              byOption.map((row) => (
                <li
                  key={row.optionId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                >
                  <div>
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">
                      {row.codeOption} — {row.nameOption}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Section {row.codeSection} ({row.nameSection})
                    </span>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-zinc-900 dark:text-white">{row.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className={cardBase}>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Raccourcis</h3>
          <div className="mt-6 grid gap-4">
            <div className="flex flex-col rounded-2xl border border-violet-100/80 bg-violet-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <IconStudents className="h-6 w-6" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Liste des élèves</p>
              <Link href="/admin/students" className={`${btnPrimary} mt-3`}>
                Ouvrir
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-sky-100/80 bg-sky-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2D9CDB]/15 text-[#2D9CDB]">
                <IconPlus className="h-6 w-6" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Inscription</p>
              <Link href="/admin/enroll" className={`${btnPrimary} mt-3`}>
                Inscrire un élève
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-emerald-100/80 bg-emerald-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <IconPlus className="h-6 w-6" />
              </div>
              <p className="mt-2 text-center text-sm font-semibold text-zinc-900 dark:text-white">Import Excel</p>
              <Link href="/admin/students/import" className={`${btnPrimary} mt-3`}>
                Importer des élèves
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default async function AdminHomePage() {
  const user = await requireUser();

  if (!isSystemAdmin(user.roles)) {
    if (canReadFinance(user.roles)) {
      return <FinanceManagerHome name={user.name} roles={user.roles} />;
    }
    if (canManageSchool(user.roles)) {
      return <SchoolManagerHome name={user.name} />;
    }
    return <GenericRoleWelcome name={user.name} />;
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true, startDate: true, endDate: true },
  });

  if (!currentYear) {
    return (
      <PageShell>
        <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-8 shadow-md dark:border-amber-900/40 dark:bg-amber-950/30">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Bon retour {user.name} !</h1>
          <p className="mt-2 text-zinc-700 dark:text-zinc-200">
            Aucune année scolaire n’est en cours. Configurez-en une dans « Années scolaires ».
          </p>
          <Link
            href="/admin/academic-years"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2D9CDB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/40 hover:bg-[#2590c9]"
          >
            Ouvrir les années scolaires
          </Link>
        </div>
      </PageShell>
    );
  }

  const yearStart = currentYear.startDate;
  const yearEndExclusive = new Date(currentYear.endDate.getTime() + 1);

  const [stats, sexCounts] = await Promise.all([
    getAdminDashboardStats({
      academicYearId: currentYear.id,
      yearStart,
      yearEndExclusive,
      includeStudents: true,
    }),
    prisma.student.groupBy({
      by: ["sex"],
      where: { academicYearId: currentYear.id },
      _count: { _all: true },
    }),
  ]);

  const totalMale = sexCounts.find((x) => x.sex === "MALE")?._count._all ?? 0;
  const totalFemale = sexCounts.find((x) => x.sex === "FEMALE")?._count._all ?? 0;
  const totalOther = sexCounts.find((x) => x.sex === "OTHER")?._count._all ?? 0;

  const expenseByUserRaw = await prisma.expense.groupBy({
    by: ["createdById", "currency"],
    _sum: { amount: true },
    _count: { _all: true },
    where: {
      academicYearId: currentYear.id,
      occurredAt: { gte: yearStart, lt: yearEndExclusive },
    },
  });

  const userIds = Array.from(new Set(expenseByUserRaw.map((r) => r.createdById).filter((id): id is number => id != null)));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const expenseByUserMap = new Map<
    string,
    {
      key: string;
      label: string;
      usd: number;
      cdf: number;
      count: number;
    }
  >();
  for (const row of expenseByUserRaw) {
    const key = row.createdById == null ? "unknown" : String(row.createdById);
    const u = row.createdById == null ? null : userMap.get(row.createdById);
    const cur = expenseByUserMap.get(key) ?? {
      key,
      label: u ? u.name : "Non attribué",
      usd: 0,
      cdf: 0,
      count: 0,
    };
    const amt = row._sum.amount != null ? Number(row._sum.amount) : 0;
    if (row.currency === "USD") cur.usd += amt;
    if (row.currency === "CDF") cur.cdf += amt;
    cur.count += row._count._all;
    expenseByUserMap.set(key, cur);
  }
  const expenseByUser = Array.from(expenseByUserMap.values()).sort(
    (a, b) => b.usd + b.cdf / 100000 - (a.usd + a.cdf / 100000),
  );

  const btnPrimary =
    "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2D9CDB] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/35 hover:bg-[#2590c9]";
  const cardBase =
    "relative overflow-hidden rounded-3xl border border-sky-100/70 bg-white p-6 shadow-lg shadow-sky-200/25 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none";

  return (
    <PageShell>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#2D9CDB]">Tableau de bord</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">
            Vue d’ensemble — {currentYear.name}
          </h1>
        </div>
      </header>

      <section
        className={`${cardBase} mb-8 bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">Bon retour {user.name} !</h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-300">
              Vue globale de votre établissement pour l’année scolaire en cours.
            </p>
          </div>
          <div className="relative mx-auto h-32 w-44 shrink-0 lg:mx-0">
            <div className="absolute left-6 top-4 h-20 w-20 rounded-full bg-[#2D9CDB]/25" />
            <div className="absolute left-14 top-10 h-14 w-14 rounded-full bg-amber-300/90" />
            <div className="absolute left-2 top-14 h-12 w-12 rounded-full bg-orange-400/80" />
            <div className="absolute right-4 top-6 h-16 w-16 rounded-2xl bg-sky-200/70 dark:bg-sky-800/40" />
          </div>
        </div>
      </section>

      <DashboardKpiGrid stats={stats} showStudents={true} cardBase={cardBase} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        

        
        
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-sky-200/80 bg-white/60 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
        <span className="font-semibold text-[#2D9CDB]">Astuce :</span> le compte principal est « Encaissement École » pour
        l’année en cours (sinon le premier compte créé). Les retraits et soldes du compte sont distincts de la caution.
      </div>
    </PageShell>
  );
}
