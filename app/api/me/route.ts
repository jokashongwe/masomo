import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { optionalEmailFieldSchema, usernameFieldSchema } from "@/lib/user-username";

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  roles: true,
  createdAt: true,
  updatedAt: true,
} as const;

const updateMeSchema = z
  .object({
    username: usernameFieldSchema,
    email: optionalEmailFieldSchema,
    name: z.string().min(1, "Le nom est requis"),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(data.newPassword);
    if (wantsPasswordChange && !data.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: "Mot de passe actuel requis pour le changer",
      });
    }
  });

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: userSelect,
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstField = Object.values(flat.fieldErrors).flat()[0];
    const message = firstField ?? flat.formErrors[0] ?? "Données invalides";
    return NextResponse.json({ error: message, details: flat }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!existing) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  let passwordHash: string | undefined;
  if (parsed.data.newPassword) {
    const ok = await verifyPassword(parsed.data.currentPassword ?? "", existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    }
    passwordHash = await hashPassword(parsed.data.newPassword);
  }

  try {
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        username: parsed.data.username,
        email: parsed.data.email,
        name: parsed.data.name,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: userSelect,
    });
    return NextResponse.json({ user, passwordChanged: Boolean(passwordHash) });
  } catch {
    return NextResponse.json(
      { error: "Échec de mise à jour (nom d'utilisateur ou e-mail déjà utilisé)" },
      { status: 409 },
    );
  }
}
