import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSystemAdminApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const academicYearUpdateSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean(),
});

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = academicYearUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.endDate.getTime() < parsed.data.startDate.getTime()) {
    return NextResponse.json({ error: "endDate must be >= startDate" }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.isCurrent) {
        await tx.academicYear.updateMany({ where: {}, data: { isCurrent: false } });
      }

      const currentCount = await tx.academicYear.count({ where: { isCurrent: true } });
      if (!parsed.data.isCurrent && currentCount === 1) {
        throw new Error("Cannot deactivate the last current academic year.");
      }

      return tx.academicYear.update({
        where: { id: parsedId.data.id },
        data: parsed.data,
      });
    });

    return NextResponse.json({ academicYear: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update academic year" }, { status: 409 });
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const existing = await prisma.academicYear.findUnique({ where: { id: parsedId.data.id }, select: { isCurrent: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.isCurrent) return NextResponse.json({ error: "Cannot delete current academic year" }, { status: 409 });

    await prisma.academicYear.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete academic year" }, { status: 409 });
  }
}

