import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const updateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const account = await prisma.financeAccount.findUnique({
    where: { id: parsedId.data.id },
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      fees: { select: { id: true, code: true, name: true }, orderBy: { code: "asc" } },
      _count: { select: { transactions: true } },
    },
  });
  if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  return NextResponse.json({
    account: {
      ...account,
      balanceUSD: account.balanceUSD.toString(),
      balanceCDF: account.balanceCDF.toString(),
    },
  });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const updated = await prisma.financeAccount.update({
      where: { id: parsedId.data.id },
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description,
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
    });
    return NextResponse.json({
      account: {
        ...updated,
        balanceUSD: updated.balanceUSD.toString(),
        balanceCDF: updated.balanceCDF.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Échec de mise à jour" }, { status: 409 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const existing = await prisma.financeAccount.findUnique({
    where: { id: parsedId.data.id },
    select: { _count: { select: { transactions: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (existing._count.transactions > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer un compte qui a déjà des mouvements (dépôts ou retraits)." },
      { status: 409 },
    );
  }

  try {
    await prisma.financeAccount.delete({ where: { id: parsedId.data.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Échec de suppression (frais encore liés ?)" }, { status: 409 });
  }
}
