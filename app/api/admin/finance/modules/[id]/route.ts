import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceWriteApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const moduleSchema = z.object({
  name: z.string().min(1),
  startDay: z.coerce.number().int().min(1).max(31),
  startMonth: z.coerce.number().int().min(1).max(12),
  endDay: z.coerce.number().int().min(1).max(31),
  endMonth: z.coerce.number().int().min(1).max(12),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.billingModule.update({
      where: { id: parsedId.data.id },
      data: parsed.data,
    });
    return NextResponse.json({ module: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.billingModule.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete module (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

