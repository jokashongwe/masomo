import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSchoolManageApi } from "@/lib/rbac";
import { IMPORT_TEMPLATE_COLUMNS } from "@/lib/student-import";

const EXAMPLE_ROW: (string | number)[] = [
  "CSVN356",
  "BITA DI LELO KHOMBO",
  "N/A",
  "N/A",
  "1",
  "Humanité",
  "HUM",
  "Commerciale",
  "COMM",
];

const INSTRUCTIONS_ROWS: string[][] = [
  ["Import élèves — mode d'emploi"],
  [""],
  ["Feuille « Eleves » : une ligne = un élève inscrit pour l'année scolaire en cours."],
  [""],
  ["Colonnes obligatoires :"],
  ["  • Matricule — identifiant unique de l'élève pour l'année"],
  ["  • Nom — nom complet (ex. BITA DI LELO KHOMBO)"],
  ["  • Niveau — code du niveau (ex. 1)"],
  ["  • Section + codeSection — libellé et code (ex. Humanité / HUM)"],
  ["  • Option + codeOption — libellé et code (ex. Commerciale / COMM)"],
  [""],
  ["Tuteur (optionnel) :"],
  ["  • Numero_Tuteur, Nom_Tuteur — laisser N/A si inconnu"],
  [""],
  ["Création automatique :"],
  ["  • Si la section, l'option ou le niveau n'existe pas (selon le code), ils sont créés."],
  ["  • Une classe « A » est créée pour le niveau si nécessaire."],
  [""],
  ["Valeur N/A = donnée manquante (surtout pour le tuteur)."],
  [""],
  ["Supprimez la ligne d'exemple avant d'importer vos données réelles."],
];

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;

  const dataSheet = XLSX.utils.aoa_to_sheet([[...IMPORT_TEMPLATE_COLUMNS], EXAMPLE_ROW]);
  dataSheet["!cols"] = IMPORT_TEMPLATE_COLUMNS.map((h) => ({
    wch: Math.max(12, Math.min(28, h.length + 4)),
  }));

  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_ROWS);
  instructionsSheet["!cols"] = [{ wch: 72 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Eleves");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-import-eleves.xlsx"',
      "Cache-Control": "private, no-cache",
    },
  });
}
