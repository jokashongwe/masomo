import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi, requireFinanceWriteApi } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  academicYearId: z.coerce.number().int().positive(),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const academicYearIdRaw = url.searchParams.get("academicYearId");
  const academicYearId = academicYearIdRaw ? Number(academicYearIdRaw) : null;

  const accounts = await prisma.financeAccount.findMany({
    where: academicYearId && Number.isFinite(academicYearId) ? { academicYearId } : undefined,
    orderBy: [{ academicYearId: "desc" }, { name: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      _count: { select: { fees: true, transactions: true } },
    },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      balanceUSD: a.balanceUSD.toString(),
      balanceCDF: a.balanceCDF.toString(),
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const year = await prisma.academicYear.findUnique({
    where: { id: parsed.data.academicYearId },
    select: { id: true },
  });
  if (!year) return NextResponse.json({ error: "Année scolaire introuvable" }, { status: 400 });

  try {
    const created = await prisma.financeAccount.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description,
        academicYearId: parsed.data.academicYearId,
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
    });
    return NextResponse.json(
      {
        account: {
          ...created,
          balanceUSD: created.balanceUSD.toString(),
          balanceCDF: created.balanceCDF.toString(),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Impossible de créer le compte (nom déjà utilisé pour cette année ?)" }, { status: 409 });
  }
}
