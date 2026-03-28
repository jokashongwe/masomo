import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceReadApi } from "@/lib/rbac";
import { getMonthlyFeesAndExpensesReport } from "@/lib/reports";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { start, end } = parsed.data;

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  if (endDate.getTime() < startDate.getTime()) {
    return NextResponse.json({ error: "La date de fin doit être >= à la date de début" }, { status: 400 });
  }

  try {
    const report = await getMonthlyFeesAndExpensesReport({ startDate: start, endDate: end });
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to compute report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

