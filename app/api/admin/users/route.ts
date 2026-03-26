import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSystemAdminApi } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["SYSTEM_ADMIN", "FINANCE_MANAGER", "FINANCE_VIEWER", "SCHOOL_MANAGER"]),
});

export async function GET() {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const created = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create user (email must be unique)" }, { status: 409 });
  }
}

