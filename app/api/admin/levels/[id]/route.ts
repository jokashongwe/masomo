import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const levelSchema = z.object({
  codeLevel: z.string().min(1),
  name: z.string().min(1),
  nextLevel: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  optionId: z.coerce.number().int().positive(),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = levelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.level.update({
      where: { id: parsedId.data.id },
      data: {
        codeLevel: parsed.data.codeLevel,
        name: parsed.data.name,
        nextLevel: parsed.data.nextLevel ?? null,
        optionId: parsed.data.optionId,
      },
    });
    return NextResponse.json({ level: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update level" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.level.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete level (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

