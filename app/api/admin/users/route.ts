import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSystemAdminApi } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import { optionalEmailFieldSchema, usernameFieldSchema } from "@/lib/user-username";

import { rolesFieldSchema } from "@/lib/user-roles";

const createUserSchema = z.object({
  username: usernameFieldSchema,
  email: optionalEmailFieldSchema,
  name: z.string().min(1),
  password: z.string().min(6),
  roles: rolesFieldSchema,
});

const userSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  roles: true,
  createdAt: true,
} as const;

export async function GET() {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: userSelect,
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const created = await prisma.user.create({
      data: {
        username: parsed.data.username,
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        roles: parsed.data.roles,
      },
      select: userSelect,
    });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Échec de création (nom d'utilisateur ou e-mail déjà utilisé)" },
      { status: 409 },
    );
  }
}
