import { NextResponse } from "next/server";
import { z } from "zod";
import { changeTutorPin } from "@/lib/parent-auth";
import { requireParentApi } from "@/lib/parent-rbac";

const schema = z.object({
  currentPin: z.string().min(1),
  newPin: z.string().min(4).max(6),
});

export async function POST(req: Request) {
  const auth = await requireParentApi(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const result = await changeTutorPin({
    tutorId: auth.tutor.id,
    currentPin: parsed.data.currentPin,
    newPin: parsed.data.newPin,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, mustChangePin: false });
}
