import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withdrawFromFinanceAccount } from "@/lib/finance-accounts";
import { requireSystemAdminApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const withdrawSchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  amount: z.coerce.number().positive(),
  note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSystemAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = await prisma.financeAccount.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true },
  });
  if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await withdrawFromFinanceAccount(tx, {
        accountId: parsedId.data.id,
        currency: parsed.data.currency,
        amount: parsed.data.amount,
        createdById: auth.user.id,
        note: parsed.data.note,
      });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec du retrait" }, { status: 409 });
  }
}
