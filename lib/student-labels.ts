import type { StudentSex, StudentStatus } from "@/generated/prisma/client";

export const STUDENT_STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "ENROLLED", label: "Inscrit" },
  { value: "LEFT", label: "Quitté" },
  { value: "EXPELLED", label: "Renvoyé" },
  { value: "GRADUATED", label: "Terminé" },
];

export function studentStatusLabel(status: StudentStatus): string {
  return STUDENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export const STUDENT_SEX_OPTIONS: { value: StudentSex; label: string }[] = [
  { value: "MALE", label: "Masculin" },
  { value: "FEMALE", label: "Féminin" },
  { value: "OTHER", label: "Autre" },
];

export function studentSexLabel(sex: StudentSex): string {
  return STUDENT_SEX_OPTIONS.find((o) => o.value === sex)?.label ?? sex;
}

export function studentStatusBadgeClass(status: StudentStatus): string {
  switch (status) {
    case "ENROLLED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "LEFT":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
    case "EXPELLED":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
    case "GRADUATED":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}
