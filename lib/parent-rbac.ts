import "server-only";

import { NextResponse } from "next/server";
import type { UserRole } from "@/generated/prisma/client";
import { extractBearerToken, getTutorFromToken, type CurrentTutor } from "@/lib/parent-auth";
import { requireApiAuth } from "@/lib/rbac";

export async function requireParentApi(req: Request): Promise<
  { ok: true; tutor: CurrentTutor; token: string } | { ok: false; response: NextResponse }
> {
  const token = extractBearerToken(req);
  const tutor = await getTutorFromToken(token);
  if (!tutor || !token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, tutor, token };
}

/** Admin système, responsable scolaire ou responsable finances. */
export function canManageAnnouncements(roles: UserRole[]) {
  return roles.some(
    (role) => role === "SYSTEM_ADMIN" || role === "SCHOOL_MANAGER" || role === "FINANCE_MANAGER",
  );
}

export async function requireAnnouncementManageApi() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;
  if (!canManageAnnouncements(auth.user.roles)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
