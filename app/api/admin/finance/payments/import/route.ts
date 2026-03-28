import { NextResponse } from "next/server";
import { requireFinanceWriteApi } from "@/lib/rbac";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { createFeePayment } from "@/lib/fee-payments";

type ImportRow = {
  studentId?: number;
  feeCode?: string;
  amount?: number;
  currency?: "USD" | "CDF";
  paidAt?: string;
  bankSlipReference?: string;
  note?: string;
};

export async function POST(req: Request) {
  const auth = await requireFinanceWriteApi();
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier Excel requis (champ: file)" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: undefined });

  if (!rows.length) return NextResponse.json({ error: "Le fichier est vide" }, { status: 400 });

  const feeCodeSet = Array.from(new Set(rows.map((r) => String(r.feeCode ?? "").trim()).filter(Boolean)));
  const fees = await prisma.fee.findMany({
    where: { code: { in: feeCodeSet } },
    select: { id: true, code: true },
  });
  const feeByCode = new Map(fees.map((f) => [f.code, f.id]));

  const results: Array<{ index: number; ok: boolean; message: string; receiptNumber?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const studentId = Number(row.studentId);
      const amount = Number(row.amount);
      const feeCode = String(row.feeCode ?? "").trim();
      const feeId = feeByCode.get(feeCode);
      const currency = row.currency === "CDF" ? "CDF" : row.currency === "USD" ? "USD" : null;
      if (!Number.isFinite(studentId) || studentId <= 0) throw new Error("studentId invalide");
      if (!feeId) throw new Error(`feeCode introuvable: ${feeCode}`);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount invalide");
      if (!currency) throw new Error("currency doit être USD ou CDF");

      const created = await createFeePayment({
        studentId,
        feeId,
        amount,
        currency,
        source: "IMPORT",
        paidAt: row.paidAt ? new Date(row.paidAt) : undefined,
        bankSlipReference: row.bankSlipReference ? String(row.bankSlipReference) : undefined,
        note: row.note ? String(row.note) : undefined,
        allocationMode: "AUTO",
      });

      results.push({ index: i + 1, ok: true, message: "OK", receiptNumber: created.receiptNumber });
    } catch (e) {
      results.push({ index: i + 1, ok: false, message: e instanceof Error ? e.message : "Erreur inconnue" });
    }
  }

  const successCount = results.filter((r) => r.ok).length;
  const failedCount = results.length - successCount;

  return NextResponse.json({
    successCount,
    failedCount,
    results,
    templateColumns: ["studentId", "feeCode", "amount", "currency", "paidAt", "bankSlipReference", "note"],
  });
}

