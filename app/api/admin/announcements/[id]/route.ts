import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnnouncementManageApi } from "@/lib/parent-rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  /** true = publier maintenant, false = dépublier (brouillon) */
  publish: z.boolean().optional(),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAnnouncementManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const a = await prisma.announcement.findUnique({
    where: { id: parsedId.data.id },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!a) return NextResponse.json({ error: "Communiqué introuvable" }, { status: 404 });

  return NextResponse.json({
    announcement: {
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      authorName: a.createdBy.name,
    },
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAnnouncementManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.announcement.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true, publishedAt: true },
  });
  if (!existing) return NextResponse.json({ error: "Communiqué introuvable" }, { status: 404 });

  let publishedAt = existing.publishedAt;
  if (parsed.data.publish === true) {
    publishedAt = existing.publishedAt ?? new Date();
  } else if (parsed.data.publish === false) {
    publishedAt = null;
  }

  const updated = await prisma.announcement.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.title != null ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.body != null ? { body: parsed.data.body.trim() } : {}),
      publishedAt,
    },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    announcement: {
      id: updated.id,
      title: updated.title,
      body: updated.body,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      authorName: updated.createdBy.name,
    },
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAnnouncementManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  try {
    await prisma.announcement.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Communiqué introuvable" }, { status: 404 });
  }
}
