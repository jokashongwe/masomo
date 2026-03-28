import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const levelSchema = z.object({
  codeLevel: z.string().min(1),
  name: z.string().min(1),
  nextLevel: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v && String(v).length > 0 ? String(v) : null)),
  optionId: z.coerce.number().int().positive(),
});

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const levels = await prisma.level.findMany({
    orderBy: { id: "asc" },
    include: { option: { include: { section: { include: { school: true } } } } },
  });
  return NextResponse.json({ levels });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = levelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.level.create({
      data: {
        codeLevel: parsed.data.codeLevel,
        name: parsed.data.name,
        nextLevel: parsed.data.nextLevel ?? null,
        optionId: parsed.data.optionId,
      },
    });
    return NextResponse.json({ level: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create level" }, { status: 500 });
  }
}

