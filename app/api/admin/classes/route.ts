import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const classSchema = z.object({
  codeClass: z.string().min(1),
  levelId: z.coerce.number().int().positive(),
});

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const classes = await prisma.schoolClass.findMany({
    orderBy: { id: "asc" },
    include: { level: { include: { option: { include: { section: { include: { school: true } } } } } } },
  });
  return NextResponse.json({ classes });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = classSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.schoolClass.create({
      data: {
        codeClass: parsed.data.codeClass,
        levelId: parsed.data.levelId,
      },
    });
    return NextResponse.json({ class: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

