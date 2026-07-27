import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireParentApi } from "@/lib/parent-rbac";

const querySchema = z.object({
  take: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.coerce.number().int().positive().optional(),
});

export async function GET(req: Request) {
  const auth = await requireParentApi(req);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    take: url.searchParams.get("take") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const take = parsed.data.take;
  const rows = await prisma.announcement.findMany({
    where: {
      publishedAt: { not: null },
      ...(parsed.data.cursor ? { id: { lt: parsed.data.cursor } } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  const hasMore = rows.length > take;
  const announcements = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? announcements[announcements.length - 1]?.id : null;

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      authorName: a.createdBy.name,
    })),
    nextCursor,
  });
}
