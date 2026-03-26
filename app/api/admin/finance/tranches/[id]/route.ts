import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceWriteApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const trancheSchema = z.object({
  codeTranche: z.string().min(1),
  moduleId: z.coerce.number().int().positive(),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = trancheSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.moduleTranche.update({
      where: { id: parsedId.data.id },
      data: {
        codeTranche: parsed.data.codeTranche,
        moduleId: parsed.data.moduleId,
      },
    });
    return NextResponse.json({ tranche: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update tranche" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.moduleTranche.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete tranche (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

