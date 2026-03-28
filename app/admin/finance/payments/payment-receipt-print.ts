export type ReceiptPayment = {
  receiptNumber: string;
  source: "BANK_SLIP" | "MANUAL" | "IMPORT";
  bankSlipReference: string | null;
  currency: "USD" | "CDF";
  amount: string | number;
  paidAt: string;
  note: string | null;
  student: { firstName: string; name: string; postnom: string };
  fee: { code: string; name: string };
  allocations?: {
    amount: string | number;
    currency?: string;
    tranche: { codeTranche: string } | null;
    module: { name: string } | null;
  }[];
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(n: string | number, currency: string) {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return String(n);
  try {
    return (
      new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) +
      ` ${currency}`
    );
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

function sourceLabel(source: ReceiptPayment["source"]) {
  switch (source) {
    case "BANK_SLIP":
      return "Bordereau banque";
    case "IMPORT":
      return "Import";
    default:
      return "Manuel";
  }
}

function allocationLabel(a: NonNullable<ReceiptPayment["allocations"]>[number]) {
  if (a.tranche) return `Tranche ${a.tranche.codeTranche}`;
  if (a.module) return a.module.name;
  return "Montant forfaitaire";
}

function buildReceiptHtml(p: ReceiptPayment, schoolName: string) {
  const studentLine = escapeHtml(`${p.student.firstName} ${p.student.name} ${p.student.postnom}`.trim());
  const feeLine = escapeHtml(`${p.fee.code} — ${p.fee.name}`);
  const dateStr = escapeHtml(p.paidAt.slice(0, 10));
  const receiptNo = escapeHtml(p.receiptNumber);
  const totalStr = escapeHtml(fmtMoney(p.amount, p.currency));
  const src = escapeHtml(sourceLabel(p.source));
  const school = escapeHtml(schoolName);

  let detailRows = "";
  const allocs = (p.allocations ?? []).filter(
    (a) => a.amount != null && String(a.amount).trim() !== "" && Number.isFinite(Number(a.amount)),
  );
  if (allocs.length > 0) {
    for (const a of allocs) {
      const label = escapeHtml(allocationLabel(a));
      const cur = (a.currency as string | undefined) ?? p.currency;
      const amt = escapeHtml(fmtMoney(a.amount, cur));
      detailRows += `<tr><td>${label}</td><td class="right">${amt}</td></tr>`;
    }
  }

  const refBlock =
    p.bankSlipReference && p.bankSlipReference.trim()
      ? `<p><strong>Réf. bordereau :</strong> ${escapeHtml(p.bankSlipReference.trim())}</p>`
      : "";

  const noteBlock =
    p.note && p.note.trim() ? `<p><strong>Note :</strong> ${escapeHtml(p.note.trim())}</p>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Reçu ${receiptNo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; color: #111; }
    .receipt { max-width: 520px; margin: 0 auto; border: 1px solid #ccc; padding: 28px; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; text-align: center; }
    .school { text-align: center; font-size: 0.95rem; color: #444; margin-bottom: 20px; }
    .meta { font-size: 0.9rem; margin: 12px 0; }
    .meta strong { display: inline-block; min-width: 140px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
    .right { text-align: right; }
    .total { margin-top: 16px; font-size: 1.1rem; font-weight: 700; text-align: right; }
    @media print {
      body { padding: 0; }
      .receipt { border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <h1>Reçu de paiement</h1>
    <div class="school">${school}</div>
    <div class="meta"><strong>N° reçu</strong> ${receiptNo}</div>
    <div class="meta"><strong>Date</strong> ${dateStr}</div>
    <div class="meta"><strong>Élève</strong> ${studentLine}</div>
    <div class="meta"><strong>Frais</strong> ${feeLine}</div>
    <div class="meta"><strong>Source</strong> ${src}</div>
    ${refBlock}
    ${noteBlock}
    ${
      detailRows
        ? `<table><thead><tr><th>Détail</th><th class="right">Montant</th></tr></thead><tbody>${detailRows}</tbody></table>`
        : ""
    }
    <div class="total">Total : ${totalStr}</div>
  </div>
</body>
</html>`;
}

/** Ouvre une fenêtre d’aperçu et lance l’impression du reçu (données déjà chargées dans la liste). */
export function printFeePaymentReceipt(p: ReceiptPayment, schoolName: string) {
  if (typeof window === "undefined") return;
  const html = buildReceiptHtml(p, schoolName || "Établissement");
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 200);
}
