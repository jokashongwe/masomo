import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";
import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const schoolSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  contacts: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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

  try {
    const logoFile = form.get("logo");
    let logoPath: string | undefined = undefined;
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

    const updated = await prisma.school.update({
      where: { id: parsedId.data.id },
      data: {
        name: parsed.data.name,
        ...(logoPath !== undefined ? { logo: logoPath } : {}),
        address: parsed.data.address,
        city: parsed.data.city,
        contacts: parsed.data.contacts ?? null,
        email: parsed.data.email ?? null,
      },
    });
    return NextResponse.json({ school: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.school.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete school (maybe due to existing related records)." },
      { status: 409 },
    );
  }
}

