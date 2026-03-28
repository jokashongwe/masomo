"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminPrimaryButton,
  adminSegmentActive,
  adminSegmentInactive,
  adminTable,
  adminTh,
  adminTr,
} from "../../components/admin-ui";

type StudentOpt = { id: number; label: string };
type FeeOpt = { id: number; code: string; name: string; chargeType: "TOTAL" | "BY_MODULE" };
type ModuleOpt = { id: number; name: string; startDay: number; startMonth: number; endDay: number; endMonth: number };
type TrancheOpt = {
  id: number;
  codeTranche: string;
  moduleId: number;
  moduleName: string;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
};

type PaymentListItem = {
  id: number;
  receiptNumber: string;
  source: "BANK_SLIP" | "MANUAL" | "IMPORT";
  bankSlipReference: string | null;
  currency: "USD" | "CDF";
  amount: string;
  paidAt: string;
  student: { id: number; name: string; postnom: string; firstName: string };
  fee: { id: number; code: string; name: string; chargeType: "TOTAL" | "BY_MODULE" };
};

function fmtDM(d: number, m: number) {
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export default function PaymentsClient({
  students,
  fees,
  modules,
  tranches,
}: {
  students: StudentOpt[];
  fees: FeeOpt[];
  modules: ModuleOpt[];
  tranches: TrancheOpt[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"BANK" | "DIRECT" | "IMPORT">("BANK");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentId, setStudentId] = useState<number>(students[0]?.id ?? 0);
  const [feeId, setFeeId] = useState<number>(fees[0]?.id ?? 0);
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [bankSlipReference, setBankSlipReference] = useState("");
  const [note, setNote] = useState("");
  const [allocationMode, setAllocationMode] = useState<"AUTO" | "MODULE" | "TRANCHE">("AUTO");
  const [moduleId, setModuleId] = useState<number>(modules[0]?.id ?? 0);
  const [trancheId, setTrancheId] = useState<number>(tranches[0]?.id ?? 0);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PaymentListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const selectedFee = useMemo(() => fees.find((f) => f.id === feeId) ?? null, [fees, feeId]);

  async function loadList() {
    setListLoading(true);
    setError(null);
    try {
      const q = search.trim();
      const res = await fetch(`/api/admin/finance/payments?take=50${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec du chargement");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setListLoading(false);
    }
  }

  async function createPayment(source: "BANK_SLIP" | "MANUAL", mode: "AUTO" | "MODULE" | "TRANCHE" | "TOTAL_DIRECT") {
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        studentId,
        feeId,
        currency,
        amount: Number(amount),
        source,
        allocationMode: mode,
        note: note || undefined,
        bankSlipReference: bankSlipReference || undefined,
      };
      if (paidAt) payload.paidAt = new Date(paidAt);
      if (mode === "MODULE") payload.moduleId = moduleId;
      if (mode === "TRANCHE") payload.trancheId = trancheId;

      const res = await fetch("/api/admin/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec création paiement");

      setAmount("");
      setNote("");
      setBankSlipReference("");
      await loadList();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitImport() {
    if (!importFile) return;
    setError(null);
    setSubmitting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.set("file", importFile);
      const res = await fetch("/api/admin/finance/payments/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Échec import");
      setImportResult(`Import terminé: ${data.successCount} succès, ${data.failedCount} échecs.`);
      await loadList();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setTab("BANK")} className={tab === "BANK" ? adminSegmentActive : adminSegmentInactive}>
          Bordereau banque
        </button>
        <button type="button" onClick={() => setTab("DIRECT")} className={tab === "DIRECT" ? adminSegmentActive : adminSegmentInactive}>
          Paiement direct (non-tranche)
        </button>
        <button type="button" onClick={() => setTab("IMPORT")} className={tab === "IMPORT" ? adminSegmentActive : adminSegmentInactive}>
          Import Excel
        </button>
      </div>

      {tab !== "IMPORT" ? (
        <div className={`${adminCard} space-y-3`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select className={adminInput} value={studentId} onChange={(e) => setStudentId(Number(e.target.value))}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select className={adminInput} value={feeId} onChange={(e) => setFeeId(Number(e.target.value))}>
              {fees.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.name} ({f.chargeType})
                </option>
              ))}
            </select>
            <select className={adminInput} value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "CDF")}>
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className={adminInput} placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" />
            <input className={adminInput} type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            <input className={adminInput} placeholder="Référence bordereau (optionnel)" value={bankSlipReference} onChange={(e) => setBankSlipReference(e.target.value)} />
            <input className={adminInput} placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {tab === "BANK" && selectedFee?.chargeType === "BY_MODULE" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className={adminInput} value={allocationMode} onChange={(e) => setAllocationMode(e.target.value as "AUTO" | "MODULE" | "TRANCHE")}>
                <option value="AUTO">Répartition auto sur modules/tranches impayés</option>
                <option value="MODULE">Payer un module</option>
                <option value="TRANCHE">Payer une tranche</option>
              </select>

              <select className={adminInput} value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))} disabled={allocationMode !== "MODULE"}>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({fmtDM(m.startDay, m.startMonth)}-{fmtDM(m.endDay, m.endMonth)})
                  </option>
                ))}
              </select>

              <select className={adminInput} value={trancheId} onChange={(e) => setTrancheId(Number(e.target.value))} disabled={allocationMode !== "TRANCHE"}>
                {tranches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codeTranche} — {t.moduleName} ({fmtDM(t.startDay, t.startMonth)}→{fmtDM(t.endDay, t.endMonth)})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex gap-3">
            {tab === "BANK" ? (
              <button type="button" disabled={submitting} onClick={() => createPayment("BANK_SLIP", selectedFee?.chargeType === "TOTAL" ? "TOTAL_DIRECT" : allocationMode)} className={adminPrimaryButton}>
                {submitting ? "Enregistrement..." : "Enregistrer paiement banque + générer reçu"}
              </button>
            ) : (
              <button type="button" disabled={submitting} onClick={() => createPayment("MANUAL", "TOTAL_DIRECT")} className={adminPrimaryButton}>
                {submitting ? "Enregistrement..." : "Enregistrer paiement direct"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`${adminCard} space-y-3`}>
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            Colonnes attendues: <code>studentId</code>, <code>feeCode</code>, <code>amount</code>, <code>currency</code>, <code>paidAt</code>, <code>bankSlipReference</code>, <code>note</code>.
          </p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <button type="button" disabled={submitting || !importFile} onClick={submitImport} className={adminPrimaryButton}>
            {submitting ? "Import..." : "Importer Excel"}
          </button>
          {importResult ? <div className="text-sm rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{importResult}</div> : null}
        </div>
      )}

      {error ? <div className={adminErrorBox}>{error}</div> : null}

      <div className={adminCard}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`min-w-0 flex-1 ${adminInput}`}
            placeholder="Recherche (reçu, élève, frais...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={loadList} className={adminGhostButton}>
            Charger
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Reçu</th>
                <th className={adminTh}>Date</th>
                <th className={adminTh}>Élève</th>
                <th className={adminTh}>Frais</th>
                <th className={adminTh}>Source</th>
                <th className={adminTh}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-zinc-600 dark:text-zinc-300">
                    {listLoading ? "Chargement..." : "Aucun paiement chargé"}
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className={adminTr}>
                    <td className="py-3 pr-3 font-medium">{p.receiptNumber}</td>
                    <td className="py-3 pr-3">{p.paidAt.slice(0, 10)}</td>
                    <td className="py-3 pr-3">{p.student.firstName} {p.student.name} {p.student.postnom}</td>
                    <td className="py-3 pr-3">{p.fee.code} - {p.fee.name}</td>
                    <td className="py-3 pr-3">{p.source}</td>
                    <td className="py-3 pr-3">{p.amount} {p.currency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

