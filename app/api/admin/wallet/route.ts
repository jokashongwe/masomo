import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceReadApi } from "@/lib/rbac";

export async function GET() {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const wallet = await prisma.wallet.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, balanceUSD: true, balanceCDF: true },
  });

  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  return NextResponse.json({ wallet });
}

