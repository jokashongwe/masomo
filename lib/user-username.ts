import "server-only";

import { z } from "zod";

/** Identifiant de connexion normalisé (minuscules, sans espaces). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export const usernameFieldSchema = z
  .string()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
  .max(32, "Le nom d'utilisateur ne peut pas dépasser 32 caractères")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Caractères autorisés : lettres, chiffres, point, tiret et souligné",
  )
  .transform(normalizeUsername);

export const optionalEmailFieldSchema = z
  .string()
  .email("Adresse e-mail invalide")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v.trim() : null));
