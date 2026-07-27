import { NextResponse } from "next/server";
import { z } from "zod";
import { loginTutorWithPin } from "@/lib/parent-auth";

const loginSchema = z.object({
  phone: z.string().min(1),
  pin: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 400 });
  }

  const result = await loginTutorWithPin(parsed.data.phone, parsed.data.pin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    token: result.token,
    tutor: result.tutor,
    mustChangePin: result.tutor.mustChangePin,
  });
}
