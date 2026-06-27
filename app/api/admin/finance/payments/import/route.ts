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
  isEmptyPaymentImportRow,
  isJournalPaymentImportFormat,
  isSkippedPaymentImportSheet,
  parseJournalPaymentRow,
  PAYMENT_JOURNAL_TEMPLATE_COLUMNS,
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

async function resolveFeeByCode(feeCode: string, feeByCode: Map<string, FeeCacheEntry>): Promise<FeeCacheEntry> {
  const key = feeCode.toUpperCase();
  let entry = feeByCode.get(key);
  if (!entry) {
    const fee = await prisma.fee.findFirst({
      where: { code: { equals: feeCode, mode: "insensitive" } },
      select: { id: true, accountId: true },
    });
    if (!fee) throw new Error(`Code frais introuvable (PMT_TYPE): ${feeCode}`);
    entry = { id: fee.id, accountId: fee.accountId };
    feeByCode.set(key, entry);
  }
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
    feeByCode: Map<string, FeeCacheEntry>;
    sheetCurrency: Currency | null;
  },
) {
  const parsed = parseJournalPaymentRow(row);
  let studentId = ctx.studentByMatricule.get(parsed.studentMatricule.toUpperCase());
  if (studentId == null) {
    const student = await prisma.student.findFirst({
      where: {
        academicYearId: ctx.academicYearId,
        matricule: { equals: parsed.studentMatricule, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (!student) throw new Error(`Élève introuvable pour matricule: ${parsed.studentMatricule}`);
    studentId = student.id;
    ctx.studentByMatricule.set(parsed.studentMatricule.toUpperCase(), studentId);
  }

  const fee = await resolveFeeByCode(parsed.feeCode, ctx.feeByCode);
  const currency = ctx.sheetCurrency
    ? ctx.sheetCurrency
    : parsed.currency ?? (await resolveCurrencyForFee(fee.id, null));

  const noteParts: string[] = [];
  if (parsed.studentName) noteParts.push(`Élève: ${parsed.studentName}`);
  if (parsed.classe) noteParts.push(`Classe: ${parsed.classe}`);
  if (parsed.txnJournal) noteParts.push(`Journal: ${parsed.txnJournal}`);

  return createFeePayment({
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
}

async function importLegacyRow(
  row: LegacyImportRow,
  feeByCode: Map<string, FeeCacheEntry>,
  sheetCurrency: Currency | null,
) {
  const studentId = Number(row.studentId);
  const amount = Number(row.amount);
  const feeCode = String(row.feeCode ?? cell(row, "feeCode", "fee_code")).trim();
  const fee = await resolveFeeByCode(feeCode, feeByCode);
  const currencyRaw =
    sheetCurrency ?? (row.currency === "CDF" ? "CDF" : row.currency === "USD" ? "USD" : null);
  const currency = await resolveCurrencyForFee(fee.id, currencyRaw);
  if (!Number.isFinite(studentId) || studentId <= 0) throw new Error("studentId invalide");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount invalide");

  return createFeePayment({
    studentId,
    feeId: fee.id,
    amount,
    currency,
    source: "IMPORT",
    paidAt: row.paidAt ? new Date(row.paidAt) : undefined,
    bankSlipReference: row.bankSlipReference ? String(row.bankSlipReference) : undefined,
    note: row.note ? String(row.note) : undefined,
    allocationMode: "AUTO",
  });
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

  const feeByCode = new Map<string, FeeCacheEntry>();
  const studentByMatricule = new Map<string, number>();
  const results: ImportResultRow[] = [];

  for (const batch of batches) {
    const useJournalFormat = isJournalPaymentImportFormat(batch.rows);
    for (let i = 0; i < batch.rows.length; i++) {
      const row = batch.rows[i];
      try {
        const created = useJournalFormat
          ? await importJournalRow(row, {
              academicYearId: currentYear.id,
              studentByMatricule,
              feeByCode,
              sheetCurrency: batch.currency,
            })
          : await importLegacyRow(row as LegacyImportRow, feeByCode, batch.currency);
        results.push({
          index: i + 1,
          sheet: batch.sheetName,
          ok: true,
          message: "OK — compte crédité",
          receiptNumber: created.receiptNumber,
          currency: batch.currency ?? undefined,
        });
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

  const successCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - successCount;
  const useJournalFormat = batches.some((b) => isJournalPaymentImportFormat(b.rows));

  return NextResponse.json({
    successCount,
    failedCount,
    format: useJournalFormat ? "journal" : "legacy",
    sheetsProcessed: batches.map((b) => ({ name: b.sheetName, currency: b.currency, rowCount: b.rows.length })),
    results,
    templateColumns: useJournalFormat
      ? [...PAYMENT_JOURNAL_TEMPLATE_COLUMNS]
      : ["studentId", "feeCode", "amount", "currency", "paidAt", "bankSlipReference", "note"],
  });
}
