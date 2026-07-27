import { NextResponse } from "next/server";
import { z } from "zod";
import { tutorOwnsStudent } from "@/lib/parent-auth";
import { getParentStudentFeeReport } from "@/lib/parent-fee-report";
import { requireParentApi } from "@/lib/parent-rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireParentApi(req);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsed = idSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const owns = await tutorOwnsStudent(auth.tutor.id, parsed.data.id);
  if (!owns) {
    return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });
  }

  const report = await getParentStudentFeeReport(parsed.data.id);
  if (!report) {
    return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });
  }

  return NextResponse.json(report);
}
