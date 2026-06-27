import "server-only";

import type { Prisma, StudentSex } from "@/generated/prisma/client";
import type { TutorEnrollInput } from "@/lib/student-enroll";

export type ImportRow = Record<string, unknown>;

export const IMPORT_TEMPLATE_COLUMNS = [
  "Matricule",
  "Nom",
  "Numero_Tuteur",
  "Nom_Tuteur",
  "Niveau",
  "Section",
  "codeSection",
  "Option",
  "codeOption",
] as const;

const NA_VALUES = new Set(["N/A", "NA", "N.A.", "N.A", "-", "—", "NULL", "NONE"]);

export function isMissingImportValue(v: unknown): boolean {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  return NA_VALUES.has(s.toUpperCase());
}

/** Lit une cellule en testant plusieurs clés (casse / alias). */
export function cell(row: ImportRow, ...keys: string[]): string {
  for (const k of keys) {
    if (k in row && !isMissingImportValue(row[k])) return String(row[k]).trim();
  }
  for (const key of Object.keys(row)) {
    const norm = key.trim().toLowerCase().replace(/\s+/g, "_");
    for (const k of keys) {
      if (norm === k.toLowerCase().replace(/\s+/g, "_") && !isMissingImportValue(row[key])) {
        return String(row[key]).trim();
      }
    }
  }
  return "";
}

/** Détecte le format Matricule / Nom / codeSection… */
export function isMatriculeImportFormat(rows: ImportRow[]): boolean {
  if (!rows.length) return false;
  const first = rows[0];
  return Boolean(cell(first, "Matricule", "matricule"));
}

/** Découpe un nom complet en prénom, nom, postnom. */
export function splitFullName(full: string): { firstName: string; name: string; postnom: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "—", name: "—", postnom: "—" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], name: "—", postnom: "—" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], name: parts[1], postnom: "—" };
  }
  return {
    firstName: parts[0],
    postnom: parts[parts.length - 1],
    name: parts.slice(1, -1).join(" "),
  };
}

export type ParsedMatriculeImportRow = {
  matricule: string;
  fullName: string;
  firstName: string;
  name: string;
  postnom: string;
  codeSection: string;
  nameSection: string;
  codeOption: string;
  nameOption: string;
  codeLevel: string;
  tutorContact: string | null;
  tutorFullName: string | null;
  tutors: TutorEnrollInput[];
};

export function parseMatriculeImportRow(row: ImportRow): ParsedMatriculeImportRow {
  const matricule = cell(row, "Matricule", "matricule");
  const fullName = cell(row, "Nom", "nom");
  const codeSection = cell(row, "codeSection", "code_section");
  const nameSection = cell(row, "Section", "section", "nameSection", "name_section") || codeSection;
  const codeOption = cell(row, "codeOption", "code_option");
  const nameOption = cell(row, "Option", "option", "nameOption", "name_option") || codeOption;
  const codeLevel = cell(row, "Niveau", "niveau", "codeLevel", "code_level");

  if (!matricule) throw new Error("Matricule requis");
  if (!fullName) throw new Error("Nom requis");
  if (!codeSection) throw new Error("codeSection requis");
  if (!codeOption) throw new Error("codeOption requis");
  if (!codeLevel) throw new Error("Niveau requis");

  const { firstName, name, postnom } = splitFullName(fullName);

  const tutorContactRaw = cell(row, "Numero_Tuteur", "numero_tuteur", "NumeroTuteur", "tutorContact");
  const tutorNameRaw = cell(row, "Nom_Tuteur", "nom_tuteur", "NomTuteur", "tutorName");

  let tutors: TutorEnrollInput[] = [];
  if (tutorContactRaw || tutorNameRaw) {
    const contact = tutorContactRaw || `import-${matricule}-tutor`;
    const tParts = tutorNameRaw ? splitFullName(tutorNameRaw) : { firstName: "—", name: "—", postnom: "—" };
    tutors = [
      {
        firstName: tParts.firstName,
        name: tParts.name,
        postnom: tParts.postnom,
        address: "Non renseigné",
        contact,
      },
    ];
  }

  return {
    matricule,
    fullName,
    firstName,
    name,
    postnom,
    codeSection,
    nameSection,
    codeOption,
    nameOption,
    codeLevel,
    tutorContact: tutorContactRaw || null,
    tutorFullName: tutorNameRaw || null,
    tutors,
  };
}

async function resolveSchoolId(
  tx: Prisma.TransactionClient,
  input: { schoolId?: number; schoolName?: string },
): Promise<number> {
  if (input.schoolId && input.schoolId > 0) return input.schoolId;
  if (input.schoolName?.trim()) {
    const s = await tx.school.findFirst({
      where: { name: { equals: input.schoolName.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    if (s) return s.id;
  }
  const only = await tx.school.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (!only) throw new Error("Aucune école configurée dans le système");
  return only.id;
}

/**
 * Crée section / option / niveau / classe si absents (par codes), puis retourne classId.
 * Classe par défaut : code « A » pour le niveau.
 */
export async function ensureSchoolClassFromImportCodes(
  tx: Prisma.TransactionClient,
  input: {
    schoolId?: number;
    schoolName?: string;
    codeSection: string;
    nameSection: string;
    codeOption: string;
    nameOption: string;
    codeLevel: string;
    codeClass?: string;
  },
): Promise<number> {
  const schoolId = await resolveSchoolId(tx, input);
  const cs = input.codeSection.trim();
  const co = input.codeOption.trim();
  const cl = input.codeLevel.trim();
  const cc = (input.codeClass?.trim() || "A").trim();

  let section = await tx.section.findFirst({
    where: { schoolId, codeSection: cs },
    select: { id: true, nameSection: true },
  });
  if (!section) {
    section = await tx.section.create({
      data: { schoolId, codeSection: cs, nameSection: input.nameSection.trim() || cs },
      select: { id: true, nameSection: true },
    });
  } else if (input.nameSection.trim() && input.nameSection.trim() !== section.nameSection) {
    await tx.section.update({
      where: { id: section.id },
      data: { nameSection: input.nameSection.trim() },
    });
  }

  let option = await tx.option.findFirst({
    where: { sectionId: section.id, codeOption: co },
    select: { id: true, nameOption: true },
  });
  if (!option) {
    option = await tx.option.create({
      data: {
        sectionId: section.id,
        codeOption: co,
        nameOption: input.nameOption.trim() || co,
      },
      select: { id: true, nameOption: true },
    });
  } else if (input.nameOption.trim() && input.nameOption.trim() !== option.nameOption) {
    await tx.option.update({
      where: { id: option.id },
      data: { nameOption: input.nameOption.trim() },
    });
  }

  const levelName = `Niveau ${cl}`;
  let level = await tx.level.findFirst({
    where: { optionId: option.id, codeLevel: cl },
    select: { id: true },
  });
  if (!level) {
    level = await tx.level.create({
      data: { optionId: option.id, codeLevel: cl, name: levelName },
      select: { id: true },
    });
  }

  let schoolClass = await tx.schoolClass.findFirst({
    where: { levelId: level.id, codeClass: cc },
    select: { id: true },
  });
  if (!schoolClass) {
    schoolClass = await tx.schoolClass.create({
      data: { levelId: level.id, codeClass: cc },
      select: { id: true },
    });
  }

  return schoolClass.id;
}

export function defaultImportBirthDate(): Date {
  return new Date("2000-01-01T00:00:00.000Z");
}

export function defaultImportSex(): StudentSex {
  return "OTHER";
}
