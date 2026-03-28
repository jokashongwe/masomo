import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

const schoolSchema = z.object({
  name: z.string().min(1),
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
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const parsed = schoolSchema.safeParse({
    name: form.get("name"),
    address: form.get("address"),
    city: form.get("city"),
    contacts: form.get("contacts"),
    email: form.get("email"),
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const logoFile = form.get("logo");
  let logoPath: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Logo must be an image" }, { status: 400 });
    }
    const ext = path.extname(logoFile.name || "").slice(0, 10) || ".png";
    const fileName = `${crypto.randomUUID()}${ext}`;
    const relative = `/uploads/schools/${fileName}`;
    const destDir = path.join(process.cwd(), "public", "uploads", "schools");
    await mkdir(destDir, { recursive: true });
    const arrayBuffer = await logoFile.arrayBuffer();
    await writeFile(path.join(destDir, fileName), Buffer.from(arrayBuffer));
    logoPath = relative;
  }

  try {
    const created = await prisma.school.create({
      data: {
        name: parsed.data.name,
        logo: logoPath,
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

