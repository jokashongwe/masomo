import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const sectionSchema = z.object({
  codeSection: z.string().min(1),
  nameSection: z.string().min(1),
  schoolId: z.coerce.number().int().positive(),
});

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const sections = await prisma.section.findMany({
    orderBy: { id: "asc" },
    include: { school: true },
  });
  return NextResponse.json({ sections });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.section.create({
      data: {
        codeSection: parsed.data.codeSection,
        nameSection: parsed.data.nameSection,
        schoolId: parsed.data.schoolId,
      },
    });
    return NextResponse.json({ section: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

