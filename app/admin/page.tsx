import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser, isSystemAdmin } from "@/lib/auth";
import { findCurrentBillingModuleForDate, getModulePaymentWindowUTC } from "@/lib/reports";
import { IconFinance, IconPayments, IconPlus, IconReports, IconStudents, IconWallet } from "./components/AdminIcons";

function sumsFromPaymentOrExpenseAgg(rows: { currency: string; _sum: { amount: unknown } }[]) {
  let usd = 0;
  let cdf = 0;
  for (const r of rows) {
    const n = r._sum.amount != null ? Number(r._sum.amount) : 0;
    if (r.currency === "USD") usd += n;
    if (r.currency === "CDF") cdf += n;
  }
  return { usd, cdf };
}

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

export default async function AdminHomePage() {
  const user = await requireUser();

  if (!isSystemAdmin(user.role)) {
    return (
      <PageShell>
        <div className="overflow-hidden rounded-3xl border border-sky-100/80 bg-white p-8 shadow-lg shadow-sky-200/30 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">
                Bon retour {user.name} !
              </h1>
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

  const [modules, sexCounts, studentTotal, paymentsYearAgg, wallet] = await Promise.all([
    prisma.billingModule.findMany({ orderBy: { id: "asc" } }),
    prisma.student.groupBy({
      by: ["sex"],
      where: { academicYearId: currentYear.id },
      _count: { _all: true },
    }),
    prisma.student.count({ where: { academicYearId: currentYear.id } }),
    prisma.feePayment.groupBy({
      by: ["currency"],
      _sum: { amount: true },
      where: { academicYearId: currentYear.id },
    }),
    prisma.wallet.findFirst({ orderBy: { id: "asc" }, select: { id: true } }),
  ]);

  const expenseAgg = wallet
    ? await prisma.expense.groupBy({
        by: ["currency"],
        _sum: { amount: true },
        where: {
          walletId: wallet.id,
          academicYearId: currentYear.id,
          occurredAt: { gte: yearStart, lt: yearEndExclusive },
        },
      })
    : [];

  const currentModule = findCurrentBillingModuleForDate(new Date(), currentYear.startDate, modules);

  const { usd: totalPerceivedUSD, cdf: totalPerceivedCDF } = sumsFromPaymentOrExpenseAgg(paymentsYearAgg);

  let moduleCurrentPerceivedUSD = 0;
  let moduleCurrentPerceivedCDF = 0;
  if (currentModule) {
    const { gte, lt } = getModulePaymentWindowUTC(currentYear.startDate, currentModule);
    const modulePaymentsAgg = await prisma.feePayment.groupBy({
      by: ["currency"],
      _sum: { amount: true },
      where: {
        academicYearId: currentYear.id,
        paidAt: { gte, lt },
      },
    });
    const m = sumsFromPaymentOrExpenseAgg(modulePaymentsAgg);
    moduleCurrentPerceivedUSD = m.usd;
    moduleCurrentPerceivedCDF = m.cdf;
  }

  const totalMale = sexCounts.find((x) => x.sex === "MALE")?._count._all ?? 0;
  const totalFemale = sexCounts.find((x) => x.sex === "FEMALE")?._count._all ?? 0;
  const totalOther = sexCounts.find((x) => x.sex === "OTHER")?._count._all ?? 0;

  const { usd: totalExpensesUSD, cdf: totalExpensesCDF } = sumsFromPaymentOrExpenseAgg(expenseAgg);

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
              Les montants d’encaissement proviennent des paiements de frais enregistrés pour l’année en cours. Les dépenses
              totalisent les sorties du portefeuille sur la même période.
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

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardBase}>
          <Link
            href="/admin/finance/fees"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-[#2D9CDB] transition hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-900"
            title="Configurer les frais"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-[#2D9CDB] dark:bg-sky-900/40 dark:text-sky-300">
            <IconFinance className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total encaissé (année)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(totalPerceivedUSD, "USD")}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(totalPerceivedCDF, "CDF")}</p>
        </div>

        <div className={cardBase}>
          <Link
            href="/admin/finance/modules"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
            title="Modules de facturation"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <IconFinance className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Encaissé (module en cours)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            {currentModule ? formatMoney(moduleCurrentPerceivedUSD, "USD") : "—"}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {currentModule
              ? formatMoney(moduleCurrentPerceivedCDF, "CDF")
              : "Aucun module de facturation ne correspond à la date du jour"}
          </p>
          {currentModule ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{currentModule.name}</p>
          ) : null}
        </div>

        <div className={cardBase}>
          <Link
            href="/admin/students"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition hover:bg-violet-200 dark:bg-violet-950/50 dark:text-violet-300"
            title="Élèves"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <IconStudents className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Élèves inscrits</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{studentTotal}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Répartition par sexe sur l’année en cours</p>
        </div>

        <div className={cardBase}>
          <Link
            href="/admin/wallet/expenses"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 transition hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
            title="Dépenses"
          >
            <IconPlus className="h-5 w-5" />
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <IconWallet className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total dépenses</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{formatMoney(totalExpensesUSD, "USD")}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatMoney(totalExpensesCDF, "CDF")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardBase} lg:col-span-1`}>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Répartition des élèves</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-sky-50/80 px-4 py-3 dark:bg-sky-950/20">
              <span className="text-zinc-600 dark:text-zinc-300">Garçons</span>
              <span className="text-lg font-bold text-[#2D9CDB]">{totalMale}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-pink-50/80 px-4 py-3 dark:bg-pink-950/20">
              <span className="text-zinc-600 dark:text-zinc-300">Filles</span>
              <span className="text-lg font-bold text-pink-600 dark:text-pink-400">{totalFemale}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
              <span className="text-zinc-600 dark:text-zinc-300">Autre</span>
              <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{totalOther}</span>
            </div>
          </div>
        </div>

        <div className={`${cardBase} lg:col-span-2`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Activités fréquentes</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Raccourcis vers les actions du quotidien.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-sky-100/80 bg-sky-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2D9CDB]/15 text-[#2D9CDB]">
                <IconFinance className="h-7 w-7" />
              </div>
              <p className="mt-3 text-center font-semibold text-zinc-900 dark:text-white">Mettre à jour les frais</p>
              <Link href="/admin/finance/fees" className={`${btnPrimary} mt-4`}>
                <IconPlus className="h-4 w-4" /> Ouvrir les frais
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-emerald-100/80 bg-emerald-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <IconPayments className="h-7 w-7" />
              </div>
              <p className="mt-3 text-center font-semibold text-zinc-900 dark:text-white">Enregistrer un paiement</p>
              <Link href="/admin/finance/payments" className={`${btnPrimary} mt-4`}>
                <IconPlus className="h-4 w-4" /> Nouveau paiement
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-violet-100/80 bg-violet-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <IconStudents className="h-7 w-7" />
              </div>
              <p className="mt-3 text-center font-semibold text-zinc-900 dark:text-white">Gérer les élèves</p>
              <Link href="/admin/students" className={`${btnPrimary} mt-4`}>
                <IconPlus className="h-4 w-4" /> Liste des élèves
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-amber-100/80 bg-amber-50/30 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                <IconReports className="h-7 w-7" />
              </div>
              <p className="mt-3 text-center font-semibold text-zinc-900 dark:text-white">Analyser les données</p>
              <Link href="/admin/reports" className={`${btnPrimary} mt-4`}>
                <IconPlus className="h-4 w-4" /> Voir les rapports
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-sky-200/80 bg-white/60 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
        <span className="font-semibold text-[#2D9CDB]">Astuce :</span> « Module en cours » repose sur les dates jour/mois des
        modules de facturation (année calendaire alignée sur le début d’année scolaire), comme dans les rapports financiers.
      </div>
    </PageShell>
  );
}
