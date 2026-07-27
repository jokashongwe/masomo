import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAnnouncementManageApi } from "@/lib/parent-rbac";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  publish: z.boolean().optional().default(false),
});

export async function GET() {
  const auth = await requireAnnouncementManageApi();
  if (!auth.ok) return auth.response;

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
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
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      authorName: a.createdBy.name,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAnnouncementManageApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.announcement.create({
    data: {
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      publishedAt: parsed.data.publish ? new Date() : null,
      createdById: auth.user.id,
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
      id: created.id,
      title: created.title,
      body: created.body,
      publishedAt: created.publishedAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      authorName: created.createdBy.name,
    },
  });
}
