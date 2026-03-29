/**
 * Classes Tailwind partagées — thème admin (bleu #2D9CDB, cartes arrondies).
 * Importer depuis les pages serveur et les composants client.
 */

export const adminPage = "mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8";

export const adminHeaderRow = "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between";

export const adminKicker = "text-sm font-semibold text-[#2D9CDB]";

export const adminTitle = "text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl";

export const adminSubtitle = "mt-2 max-w-2xl text-zinc-600 dark:text-zinc-300";

export const adminBackLink =
  "inline-flex shrink-0 items-center justify-center self-start rounded-full border border-sky-200/90 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-[#2D9CDB] hover:text-[#1e7bb8] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-500 sm:self-center";

export const adminCard =
  "rounded-3xl border border-sky-100/80 bg-white p-5 shadow-lg shadow-sky-200/20 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none md:p-6";

export const adminCardGrid = "grid grid-cols-1 gap-6 lg:grid-cols-2";

export const adminInput =
  "w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#2D9CDB] focus:ring-2 focus:ring-sky-300/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-sky-500 dark:focus:ring-sky-500/20";

/** Champ numérique / montant étroit (tableaux) */
export const adminInputCompact =
  "w-32 min-w-0 rounded-xl border border-sky-100 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-[#2D9CDB] focus:ring-2 focus:ring-sky-300/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

export const adminLabel = "text-sm font-medium text-zinc-700 dark:text-zinc-200";

export const adminPrimaryButton =
  "inline-flex items-center justify-center rounded-full bg-[#2D9CDB] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/35 transition hover:bg-[#2590c9] disabled:pointer-events-none disabled:opacity-50";

export const adminPrimaryButtonBlock = `${adminPrimaryButton} w-full`;

export const adminSecondaryButton =
  "inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-[#2D9CDB] hover:bg-sky-50 hover:text-[#1e7bb8] disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-500";

export const adminGhostButton =
  "inline-flex items-center justify-center rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-[#2D9CDB] hover:bg-sky-50 hover:text-[#1e7bb8] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

export const adminDangerButton =
  "inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300";

export const adminTableWrap =
  "mt-3 overflow-x-auto rounded-2xl border border-sky-100/80 dark:border-zinc-800";

export const adminTable = "min-w-full text-sm";

export const adminTh =
  "py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

export const adminTr = "border-t border-sky-100/80 dark:border-zinc-800";

export const adminSectionTitle = "text-lg font-bold text-zinc-900 dark:text-white";

export const adminNestedCard =
  "mt-4 rounded-2xl border border-sky-100/70 bg-sky-50/40 p-4 dark:border-zinc-700 dark:bg-zinc-800/40";

/** Ligne / carte légère dans une liste */
export const adminSoftCard =
  "rounded-2xl border border-sky-100/70 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80";

export const adminErrorBox =
  "mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200";

export const adminEmptyState = "py-8 text-center text-zinc-500 dark:text-zinc-400";

/** Cartes du hub Finances / liens */
export const adminHubCard =
  "group flex flex-col gap-2 rounded-3xl border border-sky-100/80 bg-white p-6 shadow-md shadow-sky-200/25 transition hover:border-[#2D9CDB]/50 hover:shadow-lg hover:shadow-sky-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-600";

export const adminHubCardTitle = "text-lg font-bold text-zinc-900 group-hover:text-[#2D9CDB] dark:text-white dark:group-hover:text-sky-400";

export const adminHubCardDesc = "text-sm text-zinc-600 dark:text-zinc-400";

/** Boutons segmentés (ex. mode journalier / mensuel) */
export const adminSegmentActive =
  "rounded-full bg-[#2D9CDB] px-4 cursor-pointer py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-300/35";

export const adminSegmentInactive =
  "rounded-full border border-sky-200 cursor-pointer bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-[#2D9CDB]/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

/** Totaux rapports / Budget */
export const adminStatFees =
  "rounded-3xl bg-gradient-to-br from-[#2D9CDB]  to-sky-600 p-5 text-white shadow-lg shadow-sky-300/25";

export const adminStatExpenses =
  "rounded-3xl bg-gradient-to-br from-rose-500  to-pink-600 p-5 text-white shadow-lg shadow-rose-300/20";

export const adminStatWalletCDF =
  "rounded-3xl bg-gradient-to-br from-emerald-500  to-teal-600 p-5 text-white shadow-lg shadow-emerald-300/25";
