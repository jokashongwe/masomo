import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSystemAdminApi } from "@/lib/rbac";
import { closeAcademicYear } from "@/lib/close-academic-year";

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const bodySchema = z.object({
  targetAcademicYearId: z.coerce.number().int().positive(),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await closeAcademicYear({
      closedYearId: parsedId.data.id,
      targetYearId: parsed.data.targetAcademicYearId,
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Échec de la clôture";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
