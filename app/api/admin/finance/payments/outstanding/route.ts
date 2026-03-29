import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFinanceReadApi } from "@/lib/rbac";
import { getTrancheOutstandingsForStudent } from "@/lib/fee-payments";

const querySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  feeId: z.coerce.number().int().positive(),
  currency: z.enum(["USD", "CDF"]),
});

export async function GET(req: Request) {
  const auth = await requireFinanceReadApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    studentId: url.searchParams.get("studentId") ?? undefined,
    feeId: url.searchParams.get("feeId") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = await getTrancheOutstandingsForStudent(parsed.data);
  return NextResponse.json({ tranches: rows });
}
