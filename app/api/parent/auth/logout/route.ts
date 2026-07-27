import { NextResponse } from "next/server";
import { destroyTutorSession, extractBearerToken } from "@/lib/parent-auth";
import { requireParentApi } from "@/lib/parent-rbac";

export async function POST(req: Request) {
  const auth = await requireParentApi(req);
  if (!auth.ok) {
    // Allow logout even with bad token by best-effort delete
    const token = extractBearerToken(req);
    await destroyTutorSession(token);
    return NextResponse.json({ ok: true });
  }

  await destroyTutorSession(auth.token);
  return NextResponse.json({ ok: true });
}
