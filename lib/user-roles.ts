import { z } from "zod";
import type { UserRole } from "@/generated/prisma/client";

export const USER_ROLE_VALUES = [
  "SYSTEM_ADMIN",
  "FINANCE_MANAGER",
  "FINANCE_VIEWER",
  "SCHOOL_MANAGER",
] as const satisfies readonly UserRole[];

export const userRoleSchema = z.enum(USER_ROLE_VALUES);

export const rolesFieldSchema = z
  .array(userRoleSchema)
  .min(1, "Au moins un rôle est requis")
  .transform((roles) => [...new Set(roles)]);

const ROLE_LABELS_FR: Record<UserRole, string> = {
  SYSTEM_ADMIN: "Administrateur système",
  FINANCE_MANAGER: "Responsable finances",
  FINANCE_VIEWER: "Lecteur finances",
  SCHOOL_MANAGER: "Responsable scolaire",
};

export function roleLabelFr(role: UserRole): string {
  return ROLE_LABELS_FR[role];
}

export function rolesLabelFr(roles: UserRole[]): string {
  return roles.map(roleLabelFr).join(", ");
}
