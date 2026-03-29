import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const secureCookie = req.url.startsWith("https://") || forwardedProto === "https";

  await createSession(user.id, { secure: secureCookie });
  return NextResponse.json({ ok: true });
}

