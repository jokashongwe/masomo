import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const optionSchema = z.object({
  codeOption: z.string().min(1),
  nameOption: z.string().min(1),
  sectionId: z.coerce.number().int().positive(),
});

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const options = await prisma.option.findMany({
    orderBy: { id: "asc" },
    include: { section: true },
  });
  return NextResponse.json({ options });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = optionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.option.create({
      data: {
        codeOption: parsed.data.codeOption,
        nameOption: parsed.data.nameOption,
        sectionId: parsed.data.sectionId,
      },
    });
    return NextResponse.json({ option: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create option" }, { status: 500 });
  }
}

