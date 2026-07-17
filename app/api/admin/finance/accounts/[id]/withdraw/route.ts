import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withdrawFromFinanceAccount } from "@/lib/finance-accounts";
import { requireSystemAdminApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const withdrawSchema = z
  .object({
    currency: z.enum(["USD", "CDF"]),
    amount: z.coerce.number().positive(),
    note: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    destinationType: z.enum(["EXTERNAL", "ACCOUNT", "WALLET"]).default("EXTERNAL"),
    targetAccountId: z.coerce.number().int().positive().optional(),
    academicYearId: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.destinationType === "ACCOUNT" && !data.targetAccountId) {
      ctx.addIssue({ code: "custom", message: "Compte destinataire requis", path: ["targetAccountId"] });
    }
    if (data.destinationType === "WALLET" && !data.academicYearId) {
      ctx.addIssue({ code: "custom", message: "Année scolaire requise pour la caution", path: ["academicYearId"] });
    }
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
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const account = await prisma.financeAccount.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true, academicYearId: true },
  });
  if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  const destination =
    parsed.data.destinationType === "ACCOUNT"
      ? { type: "ACCOUNT" as const, targetAccountId: parsed.data.targetAccountId! }
      : parsed.data.destinationType === "WALLET"
        ? {
            type: "WALLET" as const,
            academicYearId: parsed.data.academicYearId ?? account.academicYearId,
          }
        : { type: "EXTERNAL" as const };

  try {
    await prisma.$transaction(async (tx) => {
      await withdrawFromFinanceAccount(tx, {
        accountId: parsedId.data.id,
        currency: parsed.data.currency,
        amount: parsed.data.amount,
        createdById: auth.user.id,
        note: parsed.data.note,
        destination,
      });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec du retrait" }, { status: 409 });
  }
}
