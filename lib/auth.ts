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

export async function createSession(userId: number) {
  const token = createSessionToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
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

export type CurrentUser = { id: number; email: string; name: string; role: UserRole };

export async function getCurrentUser(): Promise<CurrentUser | null> {
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
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export function canReadFinance(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "FINANCE_MANAGER" || role === "FINANCE_VIEWER";
}

export function canWriteFinance(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "FINANCE_MANAGER";
}

export function canManageSchool(role: UserRole) {
  return role === "SYSTEM_ADMIN" || role === "SCHOOL_MANAGER";
}

export function isSystemAdmin(role: UserRole) {
  return role === "SYSTEM_ADMIN";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(check: (role: UserRole) => boolean) {
  const user = await requireUser();
  if (!check(user.role)) redirect("/login");
  return user;
}

