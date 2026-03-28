import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceReadApi } from "@/lib/rbac";
import { getDailyReportByFee } from "@/lib/reports";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page: z.coerce.number().int().min(1).optional().default(1),
  take: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { start, end, page, take } = parsed.data;

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  if (endDate.getTime() < startDate.getTime()) {
    return NextResponse.json({ error: "La date de fin doit être >= à la date de début" }, { status: 400 });
  }

  try {
    const report = await getDailyReportByFee({ startDate: start, endDate: end, page, take });
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to compute report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
