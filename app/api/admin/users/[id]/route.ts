import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSystemAdminApi } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { optionalEmailFieldSchema, usernameFieldSchema } from "@/lib/user-username";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const updateUserSchema = z.object({
  username: usernameFieldSchema,
  email: optionalEmailFieldSchema,
  name: z.string().min(1),
  role: z.enum(["SYSTEM_ADMIN", "FINANCE_MANAGER", "FINANCE_VIEWER", "SCHOOL_MANAGER"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined;

  try {
    const updated = await prisma.user.update({
      where: { id: parsedId.data.id },
      data: {
        username: parsed.data.username,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: userSelect,
    });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json(
      { error: "Échec de mise à jour (nom d'utilisateur ou e-mail déjà utilisé)" },
      { status: 409 },
    );
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  try {
    await prisma.user.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Échec de suppression" }, { status: 409 });
  }
}
