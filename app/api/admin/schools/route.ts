import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

const schoolSchema = z.object({
  name: z.string().min(1),
  logo: z.string().min(1).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  address: z.string().min(1),
  city: z.string().min(1),
  contacts: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

export async function GET() {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const schools = await prisma.school.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ schools });
}

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = schoolSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const created = await prisma.school.create({
      data: {
        name: parsed.data.name,
        logo: parsed.data.logo ?? null,
        address: parsed.data.address,
        city: parsed.data.city,
        contacts: parsed.data.contacts ?? null,
        email: parsed.data.email ?? null,
      },
    });
    return NextResponse.json({ school: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}

