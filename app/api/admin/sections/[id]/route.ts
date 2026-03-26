import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const sectionSchema = z.object({
  codeSection: z.string().min(1),
  nameSection: z.string().min(1),
  schoolId: z.coerce.number().int().positive(),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.section.update({
      where: { id: parsedId.data.id },
      data: {
        codeSection: parsed.data.codeSection,
        nameSection: parsed.data.nameSection,
        schoolId: parsed.data.schoolId,
      },
    });
    return NextResponse.json({ section: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.section.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete section (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

