import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceReadApi } from "@/lib/rbac";
import { getFeePaymentsByClassReport } from "@/lib/fee-payments-by-class-report";

const querySchema = z.object({
  currency: z.enum(["USD", "CDF"]),
  feeId: z.coerce.number().int().positive().optional(),
  moduleId: z.coerce.number().int().positive().optional(),
  trancheId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  all: z.enum(["0", "1"]).optional(),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const raw: Record<string, string | undefined> = {
    currency: url.searchParams.get("currency") ?? undefined,
    feeId: url.searchParams.get("feeId") ?? undefined,
    moduleId: url.searchParams.get("moduleId") ?? undefined,
    trancheId: url.searchParams.get("trancheId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    all: url.searchParams.get("all") ?? undefined,
  };
  if (raw.feeId === "") delete raw.feeId;
  if (raw.moduleId === "") delete raw.moduleId;
  if (raw.trancheId === "") delete raw.trancheId;

  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { currency, feeId, moduleId, trancheId, page, pageSize, all } = parsed.data;

  try {
    const report = await getFeePaymentsByClassReport({
      currency,
      feeId: feeId ?? null,
      moduleId: moduleId ?? null,
      trancheId: trancheId ?? null,
      page: page ?? undefined,
      pageSize: pageSize ?? undefined,
      all: all === "1",
    });
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to compute report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
