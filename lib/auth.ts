import "server-only";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

const SESSION_COOKIE = "kela.session";
const SESSION_DAYS = 7;

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: number, options?: { secure?: boolean }) {
  const token = createSessionToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: options?.secure ?? process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = sha256Hex(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: number;
  username: string;
  email: string | null;
  name: string;
  roles: UserRole[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const tokenHash = sha256Hex(token);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { tokenHash } }).catch(() => null);
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      name: session.user.name,
      roles: session.user.roles,
    };
  }
  catch (error) {
    console.error(error);
    return null;
  }
}

export function canReadFinance(roles: UserRole[]) {
  return roles.some(
    (role) => role === "SYSTEM_ADMIN" || role === "FINANCE_MANAGER" || role === "FINANCE_VIEWER",
  );
}

export function canWriteFinance(roles: UserRole[]) {
  return roles.some((role) => role === "SYSTEM_ADMIN" || role === "FINANCE_MANAGER");
}

export function canManageSchool(roles: UserRole[]) {
  return roles.some((role) => role === "SYSTEM_ADMIN" || role === "SCHOOL_MANAGER");
}

export function isSystemAdmin(roles: UserRole[]) {
  return roles.includes("SYSTEM_ADMIN");
}

/** Modification complète des fiches élèves (y compris statut). */
export function canEditStudents(roles: UserRole[]) {
  return roles.includes("SYSTEM_ADMIN");
}

/** Modification du profil élève (identité, classe, tuteurs) — sans le statut. */
export function canEditStudentProfile(roles: UserRole[]) {
  return roles.some((role) => role === "SYSTEM_ADMIN" || role === "SCHOOL_MANAGER");
}

/** Modification du statut scolaire (inscrit, quitté, etc.). */
export function canEditStudentStatus(roles: UserRole[]) {
  return roles.includes("SYSTEM_ADMIN");
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(check: (roles: UserRole[]) => boolean) {
  const user = await requireUser();
  if (!check(user.roles)) redirect("/login");
  return user;
}

