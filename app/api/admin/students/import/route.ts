import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";
import { enrollStudentInCurrentYear, resolveSchoolClassIdFromCodes } from "@/lib/student-enroll";
import type { StudentSex } from "@/generated/prisma/client";
import {
  cell,
  defaultImportBirthDate,
  defaultImportSex,
  ensureSchoolClassFromImportCodes,
  IMPORT_TEMPLATE_COLUMNS,
  isMatriculeImportFormat,
  parseMatriculeImportRow,
  type ImportRow,
} from "@/lib/student-import";

function str(row: ImportRow, ...keys: string[]) {
  return cell(row, ...keys);
}

function parseSex(raw: string): StudentSex | null {
  const s = raw.trim().toUpperCase();
  if (s === "MALE" || s === "M" || s === "H" || s === "MASCULIN") return "MALE";
  if (s === "FEMALE" || s === "F" || s === "FÉMININ" || s === "FEMININ") return "FEMALE";
  if (s === "OTHER" || s === "O" || s === "AUTRE") return "OTHER";
  return null;
}

function parseBirthDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    if (v > 20000 && v < 120000) {
      const ms = (v - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

async function importLegacyRow(row: ImportRow, classIdCache: Map<string, number>) {
  const firstName = str(row, "firstName", "prenom", "prénom");
  const name = str(row, "name", "nom");
  const postnom = str(row, "postnom", "postNom");
  const sexRaw = str(row, "sex", "sexe");
  const birthRaw = row.birthDate ?? row.birthdate ?? row["dateNaissance"] ?? row["date_naissance"];

  const tutorFirstName = str(row, "tutorFirstName", "tuteurPrenom", "tuteur_prenom");
  const tutorName = str(row, "tutorName", "tuteurNom", "tuteur_nom");
  const tutorPostnom = str(row, "tutorPostnom", "tuteurPostnom", "tuteur_postnom");
  const tutorAddress = str(row, "tutorAddress", "tuteurAdresse", "tuteur_adresse");
  const tutorContact = str(row, "tutorContact", "tuteurContact", "tuteur_contact", "tuteurTelephone", "tuteur_telephone");

  if (!firstName || !name || !postnom) throw new Error("firstName, name et postnom sont requis");
  const sex = parseSex(sexRaw);
  if (!sex) throw new Error("sexe invalide (MALE, FEMALE, OTHER ou M/F/H)");
  const birthDate = parseBirthDate(birthRaw);
  if (!birthDate) throw new Error("birthDate invalide");

  if (!tutorFirstName || !tutorName || !tutorPostnom || !tutorAddress || !tutorContact) {
    throw new Error("Champs tuteur requis: tutorFirstName, tutorName, tutorPostnom, tutorAddress, tutorContact");
  }

  let classId = Number(row.classId ?? row.class_id);
  if (!Number.isFinite(classId) || classId <= 0) classId = NaN;

  if (!Number.isFinite(classId) || classId <= 0) {
    const codeSection = str(row, "codeSection", "code_section");
    const codeOption = str(row, "codeOption", "code_option");
    const codeLevel = str(row, "codeLevel", "code_level");
    const codeClass = str(row, "codeClass", "code_class");
    if (!codeSection || !codeOption || !codeLevel || !codeClass) {
      throw new Error(
        "Indiquez classId ou les colonnes codeSection, codeOption, codeLevel, codeClass (et optionnellement schoolName)",
      );
    }
    const schoolName = str(row, "schoolName", "school_name", "ecole", "école");
    const schoolIdRaw = row.schoolId ?? row.school_id;
    const schoolId =
      schoolIdRaw != null && String(schoolIdRaw).trim() !== "" ? Number(schoolIdRaw) : undefined;

    const cacheKey = `${schoolId ?? schoolName}|${codeSection}|${codeOption}|${codeLevel}|${codeClass}`;
    let resolved = classIdCache.get(cacheKey);
    if (resolved == null) {
      resolved =
        (await prisma.$transaction((tx) =>
          resolveSchoolClassIdFromCodes(tx, {
            schoolId: Number.isFinite(schoolId) && (schoolId as number) > 0 ? (schoolId as number) : undefined,
            schoolName: schoolName || undefined,
            codeSection,
            codeOption,
            codeLevel,
            codeClass,
          }),
        )) ?? undefined;
      if (resolved != null) classIdCache.set(cacheKey, resolved);
    }
    if (resolved == null) {
      throw new Error(`Classe introuvable pour ${codeSection} / ${codeOption} / ${codeLevel} / ${codeClass}`);
    }
    classId = resolved;
  }

  const matricule = str(row, "Matricule", "matricule") || null;

  return enrollStudentInCurrentYear({
    classId,
    matricule,
    student: { firstName, name, postnom, sex, birthDate },
    tutors: [
      {
        firstName: tutorFirstName,
        name: tutorName,
        postnom: tutorPostnom,
        address: tutorAddress,
        contact: tutorContact,
      },
    ],
  });
}

async function importMatriculeRow(row: ImportRow, classIdCache: Map<string, number>) {
  const parsed = parseMatriculeImportRow(row);
  const cacheKey = `${parsed.codeSection}|${parsed.codeOption}|${parsed.codeLevel}|A`;
  let classId = classIdCache.get(cacheKey);
  if (classId == null) {
    classId = await prisma.$transaction((tx) =>
      ensureSchoolClassFromImportCodes(tx, {
        codeSection: parsed.codeSection,
        nameSection: parsed.nameSection,
        codeOption: parsed.codeOption,
        nameOption: parsed.nameOption,
        codeLevel: parsed.codeLevel,
        codeClass: "A",
      }),
    );
    classIdCache.set(cacheKey, classId);
  }

  return enrollStudentInCurrentYear({
    classId,
    matricule: parsed.matricule,
    requireTutor: false,
    student: {
      firstName: parsed.firstName,
      name: parsed.name,
      postnom: parsed.postnom,
      sex: defaultImportSex(),
      birthDate: defaultImportBirthDate(),
    },
    tutors: parsed.tutors,
  });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier Excel ou CSV requis (champ: file)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  const bookType = name.endsWith(".csv") ? "csv" : undefined;
  const wb = XLSX.read(arrayBuffer, { type: "array", ...(bookType ? { bookType } : {}) });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: undefined, raw: true });

  if (!rows.length) return NextResponse.json({ error: "Le fichier est vide" }, { status: 400 });

  const useMatriculeFormat = isMatriculeImportFormat(rows);
  const classIdCache = new Map<string, number>();
  const results: Array<{ index: number; ok: boolean; message: string; studentId?: number }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const { studentId } = useMatriculeFormat
        ? await importMatriculeRow(row, classIdCache)
        : await importLegacyRow(row, classIdCache);
      results.push({ index: i + 1, ok: true, message: "OK", studentId });
    } catch (e) {
      results.push({
        index: i + 1,
        ok: false,
        message: e instanceof Error ? e.message : "Erreur inconnue",
      });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - successCount;

  return NextResponse.json({
    successCount,
    failedCount,
    format: useMatriculeFormat ? "matricule" : "legacy",
    results,
    templateColumns: [...IMPORT_TEMPLATE_COLUMNS],
  });
}
