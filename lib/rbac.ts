import "server-only";

import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { getCurrentUser, canManageSchool, canReadFinance, canWriteFinance, isSystemAdmin } from "@/lib/auth";

export async function requireApiAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const, user };
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireFinanceReadApi() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;
  if (!canReadFinance(auth.user.role)) return { ok: false as const, response: forbidden() };
  return auth;
}

export async function requireFinanceWriteApi() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;
  if (!canWriteFinance(auth.user.role)) return { ok: false as const, response: forbidden() };
  return auth;
}

export async function requireSchoolManageApi() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;
  if (!canManageSchool(auth.user.role)) return { ok: false as const, response: forbidden() };
  return auth;
}

export async function requireSystemAdminApi() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;
  if (!isSystemAdmin(auth.user.role)) return { ok: false as const, response: forbidden() };
  return auth;
}

export function roleLabel(role: UserRole) {
  return role;
}

