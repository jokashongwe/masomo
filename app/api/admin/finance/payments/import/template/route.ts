import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireFinanceWriteApi } from "@/lib/rbac";
import {
  PAYMENT_IMPORT_SHEET_CDF,
  PAYMENT_IMPORT_SHEET_USD,
  PAYMENT_JOURNAL_TEMPLATE_COLUMNS,
} from "@/lib/payment-import";

const EXAMPLE_ROW: (string | number)[] = [
  "241324536",
  "CSVN006",
  "",
  "N/A",
  "MINERVAL",
  50,
  "2026-05-12 00:00:00",
  "09:44:16",
];

const INSTRUCTIONS_ROWS: string[][] = [
  ["Import paiements — journal de transactions"],
  [""],
  ["Le fichier contient deux feuilles de données : USD et CDF."],
  ["La devise est déterminée par la feuille (pas de colonne Currency requise)."],
  [""],
  ["Une ligne = un paiement de frais pour l'année scolaire en cours."],
  ["Chaque frais (PMT_TYPE) doit être rattaché à un compte financier :"],
  ["  le compte est crédité automatiquement à chaque paiement importé."],
  [""],
  ["Colonnes (identiques sur USD et CDF) :"],
  ["  • TXN_JOURNAL — référence bordereau / journal"],
  ["  • STUDENT_NO — matricule de l'élève (année en cours)"],
  ["  • STUDENT_NAME, CLASSE — informatifs (N/A si inconnu)"],
  ["  • PMT_TYPE — code du frais (ex. MINERVAL, FEE_TUITION…)"],
  ["  • TXN_AMOUNT — montant payé dans la devise de la feuille"],
  ["  • DATE_TRANS — date (AAAA-MM-JJ ou date Excel)"],
  ["  • HEURE — heure (HH:MM:SS, optionnel)"],
  [""],
  ["Supprimez les lignes d'exemple avant l'import réel."],
];

function buildDataSheet() {
  const dataSheet = XLSX.utils.aoa_to_sheet([[...PAYMENT_JOURNAL_TEMPLATE_COLUMNS], EXAMPLE_ROW]);
  dataSheet["!cols"] = PAYMENT_JOURNAL_TEMPLATE_COLUMNS.map((h) => ({
    wch: Math.max(12, Math.min(24, h.length + 2)),
  }));
  return dataSheet;
}

export async function GET() {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS);
  instructionsSheet["!cols"] = [{ wch: 72 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildDataSheet(), PAYMENT_IMPORT_SHEET_USD);
  XLSX.utils.book_append_sheet(workbook, buildDataSheet(), PAYMENT_IMPORT_SHEET_CDF);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-paiements.xlsx"',
      "Cache-Control": "private, no-cache",
    },
  });
}
