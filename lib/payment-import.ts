import "server-only";

import type { Currency } from "@/generated/prisma/client";
import { cell, isMissingImportValue, type ImportRow } from "@/lib/student-import";

export const PAYMENT_JOURNAL_TEMPLATE_COLUMNS = [
  "TXN_JOURNAL",
  "STUDENT_NO",
  "STUDENT_NAME",
  "CLASSE",
  "PMT_TYPE",
  "TXN_AMOUNT",
  "DATE_TRANS",
  "HEURE",
] as const;

export const PAYMENT_IMPORT_SHEET_USD = "USD";
export const PAYMENT_IMPORT_SHEET_CDF = "CDF";

/** Feuilles Excel à ignorer (instructions, etc.). */
export function isSkippedPaymentImportSheet(sheetName: string): boolean {
  return /instruction/i.test(sheetName.trim());
}

/** Devise déduite du nom de feuille (USD, CDF, ou null si ambigu / inconnu). */
export function currencyFromPaymentImportSheet(sheetName: string): Currency | null {
  const n = sheetName.trim().toUpperCase();
  if (n === "USD") return "USD";
  if (n === "CDF") return "CDF";
  const hasUsd = /\bUSD\b/.test(n);
  const hasCdf = /\bCDF\b/.test(n);
  if (hasUsd && !hasCdf) return "USD";
  if (hasCdf && !hasUsd) return "CDF";
  return null;
}

export type PaymentImportSheetBatch = {
  sheetName: string;
  currency: Currency | null;
  rows: ImportRow[];
};

export function isJournalPaymentImportFormat(rows: ImportRow[]): boolean {
  if (!rows.length) return false;
  const first = rows[0];
  return Boolean(cell(first, "STUDENT_NO", "student_no") || cell(first, "TXN_JOURNAL", "txn_journal"));
}

export type ParsedJournalPaymentRow = {
  txnJournal: string;
  studentMatricule: string;
  studentName: string | null;
  classe: string | null;
  feeCode: string;
  amount: number;
  paidAt: Date;
  currency: Currency | null;
};

function parseExcelOrStringDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 120000) {
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function applyTimeToDate(base: Date, timeRaw: unknown): Date {
  const d = new Date(base.getTime());
  if (timeRaw == null || isMissingImportValue(timeRaw)) return d;
  if (timeRaw instanceof Date && !isNaN(timeRaw.getTime())) {
    d.setHours(timeRaw.getHours(), timeRaw.getMinutes(), timeRaw.getSeconds(), 0);
    return d;
  }
  if (typeof timeRaw === "number" && timeRaw >= 0 && timeRaw < 1) {
    const totalSec = Math.round(timeRaw * 86400);
    d.setHours(Math.floor(totalSec / 3600), Math.floor((totalSec % 3600) / 60), totalSec % 60, 0);
    return d;
  }
  const s = String(timeRaw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    d.setHours(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0, 0);
  }
  return d;
}

export function parseJournalPaymentRow(row: ImportRow): ParsedJournalPaymentRow {
  const txnJournal = cell(row, "TXN_JOURNAL", "txn_journal");
  const studentMatricule = cell(row, "STUDENT_NO", "student_no", "Student_No");
  const feeCode = cell(row, "PMT_TYPE", "pmt_type", "Pmt_Type");
  const amountRaw = row.TXN_AMOUNT ?? row.txn_amount ?? row["TXN_AMOUNT"];
  const amount = Number(typeof amountRaw === "string" ? amountRaw.replace(",", ".") : amountRaw);

  if (!studentMatricule) throw new Error("STUDENT_NO (matricule) requis");
  if (!feeCode) throw new Error("PMT_TYPE (code frais) requis");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("TXN_AMOUNT invalide");

  const dateRaw = row.DATE_TRANS ?? row.date_trans ?? row["DATE_TRANS"];
  const timeRaw = row.HEURE ?? row.heure ?? row["HEURE"];
  const baseDate = parseExcelOrStringDate(dateRaw) ?? new Date();
  const paidAt = applyTimeToDate(baseDate, timeRaw);

  const currencyRaw = cell(row, "Currency", "currency", "DEVISE", "devise");
  let currency: Currency | null = null;
  if (currencyRaw) {
    const c = currencyRaw.toUpperCase();
    if (c === "USD" || c === "CDF") currency = c;
    else throw new Error("Devise invalide (USD ou CDF)");
  }

  const studentName = cell(row, "STUDENT_NAME", "student_name") || null;
  const classe = cell(row, "CLASSE", "classe", "Class") || null;

  return {
    txnJournal,
    studentMatricule,
    studentName,
    classe,
    feeCode,
    amount,
    paidAt,
    currency,
  };
}

export function defaultPaymentImportCurrency(): Currency {
  return "CDF";
}

/** Ligne vide ou sans données utiles. */
export function isEmptyPaymentImportRow(row: ImportRow): boolean {
  if (isJournalPaymentImportFormat([row])) {
    return !cell(row, "STUDENT_NO", "student_no") && !cell(row, "PMT_TYPE", "pmt_type");
  }
  return !row.studentId && !cell(row, "feeCode", "fee_code");
}
