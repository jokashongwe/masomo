import { NextResponse } from "next/server";
import { requireFinanceWriteApi } from "@/lib/rbac";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { createFeePayment } from "@/lib/fee-payments";
import type { Currency } from "@/generated/prisma/client";
import { cell, type ImportRow } from "@/lib/student-import";
import {
  currencyFromPaymentImportSheet,
  defaultPaymentImportCurrency,
  findExistingPaymentByJournal,
  isEmptyPaymentImportRow,
  isJournalPaymentImportFormat,
  isSkippedPaymentImportSheet,
  parseJournalPaymentRow,
  PAYMENT_JOURNAL_TEMPLATE_COLUMNS,
  resolveOrCreateStudentForPaymentImport,
  type PaymentImportSheetBatch,
} from "@/lib/payment-import";

type LegacyImportRow = ImportRow & {
  studentId?: number;
  feeCode?: string;
  amount?: number;
  currency?: "USD" | "CDF";
  paidAt?: string;
  bankSlipReference?: string;
  note?: string;
};

type FeeCacheEntry = { id: number; accountId: number | null };

type ImportResultRow = {
  index: number;
  sheet: string;
  ok: boolean;
  skipped?: boolean;
  message: string;
  receiptNumber?: string;
  currency?: Currency;
};

async function resolveCurrencyForFee(feeId: number, explicit: Currency | null): Promise<Currency> {
  if (explicit) return explicit;
  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    include: { totalAmounts: { select: { currency: true } } },
  });
  if (!fee) return defaultPaymentImportCurrency();
  const currencies = new Set(fee.totalAmounts.map((a) => a.currency));
  if (currencies.size === 1) return [...currencies][0];
  if (currencies.has("CDF")) return "CDF";
  if (currencies.has("USD")) return "USD";
  return defaultPaymentImportCurrency();
}

async function resolveFeeForStudent(
  feeCode: string,
  studentId: number,
  feeCache: Map<string, FeeCacheEntry>,
): Promise<FeeCacheEntry> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolClass: { select: { levelId: true } } },
  });
  if (!student) throw new Error("Élève introuvable");

  const levelId = student.schoolClass.levelId;
  const cacheKey = `${feeCode.toUpperCase()}:${levelId}`;
  const cached = feeCache.get(cacheKey);
  if (cached) {
    if (!cached.accountId) {
      throw new Error(`Le frais ${feeCode} n'est pas rattaché à un compte financier`);
    }
    return cached;
  }

  const fees = await prisma.fee.findMany({
    where: { code: { equals: feeCode, mode: "insensitive" } },
    select: {
      id: true,
      accountId: true,
      name: true,
      feeLevels: { select: { levelId: true } },
    },
  });
  if (!fees.length) throw new Error(`Code frais introuvable (PMT_TYPE): ${feeCode}`);

  const matching = fees.filter((f) => f.feeLevels.some((fl) => fl.levelId === levelId));
  if (matching.length === 0) {
    throw new Error(`Aucun frais « ${feeCode} » configuré pour le niveau de l'élève`);
  }
  if (matching.length > 1) {
    const labels = matching.map((f) => `#${f.id} ${f.name}`).join(", ");
    throw new Error(`Code frais « ${feeCode} » ambigu pour ce niveau (${labels})`);
  }

  const entry: FeeCacheEntry = { id: matching[0].id, accountId: matching[0].accountId };
  feeCache.set(cacheKey, entry);
  if (!entry.accountId) {
    throw new Error(`Le frais ${feeCode} n'est pas rattaché à un compte financier`);
  }
  return entry;
}

function collectSheetBatches(wb: XLSX.WorkBook): PaymentImportSheetBatch[] {
  const batches: PaymentImportSheetBatch[] = [];
  for (const sheetName of wb.SheetNames) {
    if (isSkippedPaymentImportSheet(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const allRows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: undefined, raw: true });
    const rows = allRows.filter((r) => !isEmptyPaymentImportRow(r));
    if (!rows.length) continue;
    batches.push({
      sheetName,
      currency: currencyFromPaymentImportSheet(sheetName),
      rows,
    });
  }
  return batches;
}

async function importJournalRow(
  row: ImportRow,
  ctx: {
    academicYearId: number;
    studentByMatricule: Map<string, number>;
    feeCache: Map<string, FeeCacheEntry>;
    sheetCurrency: Currency | null;
    seenJournals: Set<string>;
  },
) {
  const parsed = parseJournalPaymentRow(row);

  if (parsed.txnJournal) {
    const journalKey = parsed.txnJournal.trim().toUpperCase();
    if (ctx.seenJournals.has(journalKey)) {
      const existing = await findExistingPaymentByJournal(parsed.txnJournal);
      return {
        skipped: true as const,
        receiptNumber: existing?.receiptNumber,
        message: `TXN_JOURNAL déjà traité dans ce fichier : ${parsed.txnJournal}`,
      };
    }

    const existing = await findExistingPaymentByJournal(parsed.txnJournal);
    if (existing) {
      ctx.seenJournals.add(journalKey);
      return {
        skipped: true as const,
        receiptNumber: existing.receiptNumber,
        message: `TXN_JOURNAL déjà enregistré : ${parsed.txnJournal}`,
      };
    }
  }

  const studentId = await resolveOrCreateStudentForPaymentImport({
    academicYearId: ctx.academicYearId,
    matricule: parsed.studentMatricule,
    studentName: parsed.studentName,
    classe: parsed.classe,
    studentByMatricule: ctx.studentByMatricule,
  });

  const fee = await resolveFeeForStudent(parsed.feeCode, studentId, ctx.feeCache);
  const currency = ctx.sheetCurrency
    ? ctx.sheetCurrency
    : parsed.currency ?? (await resolveCurrencyForFee(fee.id, null));

  const noteParts: string[] = [];
  if (parsed.studentName) noteParts.push(`Élève: ${parsed.studentName}`);
  if (parsed.classe) noteParts.push(`Classe: ${parsed.classe}`);
  if (parsed.txnJournal) noteParts.push(`Journal: ${parsed.txnJournal}`);

  const created = await createFeePayment({
    studentId,
    feeId: fee.id,
    amount: parsed.amount,
    currency,
    source: "IMPORT",
    paidAt: parsed.paidAt,
    bankSlipReference: parsed.txnJournal || undefined,
    note: noteParts.length ? noteParts.join(" | ") : undefined,
    allocationMode: "AUTO",
  });

  if (parsed.txnJournal) {
    ctx.seenJournals.add(parsed.txnJournal.trim().toUpperCase());
  }

  return { skipped: false as const, payment: created };
}

async function importLegacyRow(
  row: LegacyImportRow,
  feeCache: Map<string, FeeCacheEntry>,
  sheetCurrency: Currency | null,
  seenJournals: Set<string>,
) {
  const studentId = Number(row.studentId);
  const amount = Number(row.amount);
  const feeCode = String(row.feeCode ?? cell(row, "feeCode", "fee_code")).trim();
  if (!Number.isFinite(studentId) || studentId <= 0) throw new Error("studentId invalide");
  const fee = await resolveFeeForStudent(feeCode, studentId, feeCache);
  const currencyRaw =
    sheetCurrency ?? (row.currency === "CDF" ? "CDF" : row.currency === "USD" ? "USD" : null);
  const currency = await resolveCurrencyForFee(fee.id, currencyRaw);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount invalide");

  const bankRef = row.bankSlipReference ? String(row.bankSlipReference).trim() : "";
  if (bankRef) {
    const journalKey = bankRef.toUpperCase();
    if (seenJournals.has(journalKey)) {
      const existing = await findExistingPaymentByJournal(bankRef);
      return {
        skipped: true as const,
        receiptNumber: existing?.receiptNumber,
        message: `Référence déjà traitée dans ce fichier : ${bankRef}`,
      };
    }
    const existing = await findExistingPaymentByJournal(bankRef);
    if (existing) {
      seenJournals.add(journalKey);
      return {
        skipped: true as const,
        receiptNumber: existing.receiptNumber,
        message: `Référence déjà enregistrée : ${bankRef}`,
      };
    }
  }

  const created = await createFeePayment({
    studentId,
    feeId: fee.id,
    amount,
    currency,
    source: "IMPORT",
    paidAt: row.paidAt ? new Date(row.paidAt) : undefined,
    bankSlipReference: bankRef || undefined,
    note: row.note ? String(row.note) : undefined,
    allocationMode: "AUTO",
  });

  if (bankRef) seenJournals.add(bankRef.toUpperCase());

  return { skipped: false as const, payment: created };
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier Excel ou CSV requis (champ: file)" }, { status: 400 });
  }

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  if (!currentYear) {
    return NextResponse.json({ error: "Aucune année scolaire en cours" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  const bookType = name.endsWith(".csv") ? "csv" : undefined;
  const wb = XLSX.read(arrayBuffer, { type: "array", ...(bookType ? { bookType } : {}) });
  const batches = collectSheetBatches(wb);

  if (!batches.length) {
    return NextResponse.json({ error: "Le fichier est vide ou ne contient aucune feuille de données" }, { status: 400 });
  }

  const feeCache = new Map<string, FeeCacheEntry>();
  const studentByMatricule = new Map<string, number>();
  const seenJournals = new Set<string>();
  const results: ImportResultRow[] = [];

  for (const batch of batches) {
    const useJournalFormat = isJournalPaymentImportFormat(batch.rows);
    for (let i = 0; i < batch.rows.length; i++) {
      const row = batch.rows[i];
      try {
        const outcome = useJournalFormat
          ? await importJournalRow(row, {
              academicYearId: currentYear.id,
              studentByMatricule,
              feeCache,
              sheetCurrency: batch.currency,
              seenJournals,
            })
          : await importLegacyRow(row as LegacyImportRow, feeCache, batch.currency, seenJournals);

        if (outcome.skipped) {
          results.push({
            index: i + 1,
            sheet: batch.sheetName,
            ok: true,
            skipped: true,
            message: outcome.message,
            receiptNumber: outcome.receiptNumber,
            currency: batch.currency ?? undefined,
          });
        } else {
          results.push({
            index: i + 1,
            sheet: batch.sheetName,
            ok: true,
            message: "OK — compte crédité",
            receiptNumber: outcome.payment.receiptNumber,
            currency: batch.currency ?? undefined,
          });
        }
      } catch (e) {
        results.push({
          index: i + 1,
          sheet: batch.sheetName,
          ok: false,
          message: e instanceof Error ? e.message : "Erreur inconnue",
          currency: batch.currency ?? undefined,
        });
      }
    }
  }

  const successCount = results.filter((r) => r.ok && !r.skipped).length;
  const skippedCount = results.filter((r) => r.skipped).length;
  const failedCount = results.filter((r) => !r.ok).length;
  const useJournalFormat = batches.some((b) => isJournalPaymentImportFormat(b.rows));

  return NextResponse.json({
    successCount,
    skippedCount,
    failedCount,
    format: useJournalFormat ? "journal" : "legacy",
    sheetsProcessed: batches.map((b) => ({ name: b.sheetName, currency: b.currency, rowCount: b.rows.length })),
    results,
    templateColumns: useJournalFormat
      ? [...PAYMENT_JOURNAL_TEMPLATE_COLUMNS]
      : ["studentId", "feeCode", "amount", "currency", "paidAt", "bankSlipReference", "note"],
  });
}
