"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminCardGrid,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminInputCompact,
  adminNestedCard,
  adminPrimaryButton,
  adminPrimaryButtonBlock,
  adminSecondaryButton,
  adminSectionTitle,
  adminSoftCard,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
} from "../../components/admin-ui";

type Currency = "USD" | "CDF";
type FeeChargeType = "TOTAL" | "BY_MODULE";

type Fee = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  chargeType: FeeChargeType;
  feeLevels: { levelId: number }[];
  // Prisma Decimal arrives as string-like (Decimal.js). Keep as string for UI.
  totalAmounts: { currency: Currency; amount: string }[];
  moduleAmounts: { moduleId: number; currency: Currency; amount: string }[];
  trancheAmounts: { trancheId: number; currency: Currency; amount: string }[];
};

type LevelOption = { id: number; label: string };
type BillingModule = { id: number; name: string; startDay: number; startMonth: number; endDay: number; endMonth: number };
type ModuleTranche = {
  id: number;
  codeTranche: string;
  moduleId: number;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
  module: BillingModule;
};

function fmtDM(day: number, month: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function toNumberString(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "toString" in v) return String((v as { toString: () => string }).toString());
  return "";
}

export default function FeesCrud({
  initialFees,
  levelOptions,
  modules,
  tranches,
}: {
  initialFees: Fee[];
  levelOptions: LevelOption[];
  modules: BillingModule[];
  tranches: ModuleTranche[];
}) {
  const router = useRouter();
  const [fees] = useState(initialFees);

  const [create, setCreate] = useState({
    code: "",
    name: "",
    description: "",
    chargeType: "TOTAL" as FeeChargeType,
    levelIds: [] as number[],
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => fees.find((f) => f.id === editingId) ?? null, [fees, editingId]);

  const [update, setUpdate] = useState({
    code: "",
    name: "",
    description: "",
    chargeType: "TOTAL" as FeeChargeType,
    levelIds: [] as number[],
  });

  const [totalUSD, setTotalUSD] = useState("");
  const [totalCDF, setTotalCDF] = useState("");

  const [moduleAmounts, setModuleAmounts] = useState<Record<string, string>>({});
  const [trancheAmounts, setTrancheAmounts] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(fee: Fee) {
    setUpdate({
      code: fee.code,
      name: fee.name,
      description: fee.description ?? "",
      chargeType: fee.chargeType,
      levelIds: fee.feeLevels.map((fl) => fl.levelId),
    });

    const usd = fee.totalAmounts.find((a) => a.currency === "USD")?.amount;
    const cdf = fee.totalAmounts.find((a) => a.currency === "CDF")?.amount;
    setTotalUSD(toNumberString(usd));
    setTotalCDF(toNumberString(cdf));

    const nextModule: Record<string, string> = {};
    for (const m of modules) {
      for (const cur of ["USD", "CDF"] as const) {
        const found = fee.moduleAmounts.find((a) => a.moduleId === m.id && a.currency === cur)?.amount;
        nextModule[`${m.id}:${cur}`] = toNumberString(found);
      }
    }
    setModuleAmounts(nextModule);

    const nextTranche: Record<string, string> = {};
    for (const t of tranches) {
      for (const cur of ["USD", "CDF"] as const) {
        const found = fee.trancheAmounts.find((a) => a.trancheId === t.id && a.currency === cur)?.amount;
        nextTranche[`${t.id}:${cur}`] = toNumberString(found);
      }
    }
    setTrancheAmounts(nextTranche);
  }

  function toggleLevel(list: number[], levelId: number) {
    return list.includes(levelId) ? list.filter((x) => x !== levelId) : [...list, levelId];
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: create.code,
          name: create.name,
          description: create.description,
          chargeType: create.chargeType,
          levelIds: create.levelIds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de création");
        return;
      }
      setCreate({ code: "", name: "", description: "", chargeType: "TOTAL", levelIds: [] });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/fees/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: update.code,
          name: update.name,
          description: update.description,
          chargeType: update.chargeType,
          levelIds: update.levelIds,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Échec de mise à jour");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAmounts() {
    if (!editing) return;
    setError(null);
    setSubmitting(true);
    try {
      if (update.chargeType === "TOTAL") {
        const totalAmounts = [
          { currency: "USD" as const, amount: totalUSD === "" ? 0 : Number(totalUSD) },
          { currency: "CDF" as const, amount: totalCDF === "" ? 0 : Number(totalCDF) },
        ];
        const res = await fetch(`/api/admin/finance/fees/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalAmounts }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Échec d’enregistrement des montants");
          return;
        }
      } else {
        const modulePayload = modules.flatMap((m) =>
          (["USD", "CDF"] as const).map((currency) => ({
            moduleId: m.id,
            currency,
            amount: Number(moduleAmounts[`${m.id}:${currency}`] || 0),
          })),
        );
        const tranchePayload = tranches.flatMap((t) =>
          (["USD", "CDF"] as const).map((currency) => ({
            trancheId: t.id,
            currency,
            amount: Number(trancheAmounts[`${t.id}:${currency}`] || 0),
          })),
        );
        const res = await fetch(`/api/admin/finance/fees/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moduleAmounts: modulePayload, trancheAmounts: tranchePayload }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Échec d’enregistrement des montants");
          return;
        }
      }

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    const ok = window.confirm("Supprimer ce frais ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/fees/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de suppression");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer un frais</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Code du frais (unique)"
            className={adminInput}
            value={create.code}
            onChange={(e) => setCreate((c) => ({ ...c, code: e.target.value }))}
          />
          <input
            required
            placeholder="Nom du frais"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            placeholder="Description (optionnel)"
            className={adminInput}
            value={create.description}
            onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))}
          />
          <select
            className={adminInput}
            value={create.chargeType}
            onChange={(e) => setCreate((c) => ({ ...c, chargeType: e.target.value as FeeChargeType }))}
          >
            <option value="TOTAL">Frais en totalité</option>
            <option value="BY_MODULE">Par module</option>
          </select>

          <div className={adminSoftCard}>
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Attacher aux niveaux</div>
            <div className="mt-2 max-h-48 overflow-auto space-y-2">
              {levelOptions.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Aucun niveau trouvé.</div>
              ) : (
                levelOptions.map((l) => (
                  <label key={l.id} className="flex items-start gap-2 text-sm text-black dark:text-white">
                    <input
                      type="checkbox"
                      checked={create.levelIds.includes(l.id)}
                      onChange={() => setCreate((c) => ({ ...c, levelIds: toggleLevel(c.levelIds, l.id) }))}
                    />
                    <span>{l.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            disabled={submitting}
            type="submit"
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Frais existants</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Code</th>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Type</th>
                <th className={adminTh}>Niveaux</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucun frais.
                  </td>
                </tr>
              ) : (
                fees.map((f) => (
                  <tr key={f.id} className={adminTr}>
                    <td className="py-3 pr-3 font-medium">{f.code}</td>
                    <td className="py-3 pr-3">{f.name}</td>
                    <td className="py-3 pr-3">{f.chargeType}</td>
                    <td className="py-3 pr-3">{f.feeLevels.length}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(f.id);
                            resetUpdateFromEditing(f);
                          }}
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(f.id)}
                          className={adminDangerButton}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editing ? (
          <div className={adminNestedCard}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier le frais : {editing.code}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Code du frais"
                className={adminInput}
                value={update.code}
                onChange={(e) => setUpdate((u) => ({ ...u, code: e.target.value }))}
              />
              <input
                required
                placeholder="Nom du frais"
                className={adminInput}
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <input
                placeholder="Description (optionnel)"
                className={adminInput}
                value={update.description}
                onChange={(e) => setUpdate((u) => ({ ...u, description: e.target.value }))}
              />
              <select
                className={adminInput}
                value={update.chargeType}
                onChange={(e) => setUpdate((u) => ({ ...u, chargeType: e.target.value as FeeChargeType }))}
              >
                <option value="TOTAL">Frais en totalité</option>
                <option value="BY_MODULE">Par module</option>
              </select>

              <div className={adminSoftCard}>
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Attacher aux niveaux</div>
                <div className="mt-2 max-h-48 overflow-auto space-y-2">
                  {levelOptions.map((l) => (
                    <label key={l.id} className="flex items-start gap-2 text-sm text-black dark:text-white">
                      <input
                        type="checkbox"
                        checked={update.levelIds.includes(l.id)}
                        onChange={() => setUpdate((u) => ({ ...u, levelIds: toggleLevel(u.levelIds, l.id) }))}
                      />
                      <span>{l.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={adminPrimaryButton}
                >
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingId(null)}
                  className={adminSecondaryButton}
                >
                  Fermer
                </button>
              </div>
            </form>

            <div className={`mt-5 ${adminSoftCard}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-black dark:text-white">Montants</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">
                    {update.chargeType === "TOTAL"
                      ? "Définir les montants en totalité (USD et CDF)."
                      : "Définir les montants par module et par tranche (USD/CDF)."}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveAmounts}
                  className={adminPrimaryButton}
                >
                  {submitting ? "Enregistrement..." : "Enregistrer les montants"}
                </button>
              </div>

              {update.chargeType === "TOTAL" ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">USD</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`mt-1 ${adminInput}`}
                      value={totalUSD}
                      onChange={(e) => setTotalUSD(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">CDF</div>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={`mt-1 ${adminInput}`}
                      value={totalCDF}
                      onChange={(e) => setTotalCDF(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  <div>
                    <div className="font-medium text-black dark:text-white">Par module</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className={adminTh}>Module</th>
                            <th className={adminTh}>USD</th>
                            <th className={adminTh}>CDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modules.map((m) => (
                            <tr key={m.id} className={adminTr}>
                              <td className="py-3 pr-3">
                                {m.name} ({fmtDM(m.startDay, m.startMonth)} → {fmtDM(m.endDay, m.endMonth)})
                              </td>
                              <td className="py-3 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className={adminInputCompact}
                                  value={moduleAmounts[`${m.id}:USD`] ?? ""}
                                  onChange={(e) =>
                                    setModuleAmounts((prev) => ({ ...prev, [`${m.id}:USD`]: e.target.value }))
                                  }
                                />
                              </td>
                              <td className="py-3 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className={adminInputCompact}
                                  value={moduleAmounts[`${m.id}:CDF`] ?? ""}
                                  onChange={(e) =>
                                    setModuleAmounts((prev) => ({ ...prev, [`${m.id}:CDF`]: e.target.value }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-black dark:text-white">Par tranche</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th className={adminTh}>Tranche</th>
                            <th className={adminTh}>Module</th>
                            <th className={adminTh}>USD</th>
                            <th className={adminTh}>CDF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tranches.map((t) => (
                            <tr key={t.id} className={adminTr}>
                              <td className="py-3 pr-3 font-medium">
                                {t.codeTranche}{" "}
                                <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                                  {fmtDM(t.startDay, t.startMonth)} → {fmtDM(t.endDay, t.endMonth)}
                                </span>
                              </td>
                              <td className="py-3 pr-3">
                                {t.module.name} ({fmtDM(t.module.startDay, t.module.startMonth)} →{" "}
                                {fmtDM(t.module.endDay, t.module.endMonth)})
                              </td>
                              <td className="py-3 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className={adminInputCompact}
                                  value={trancheAmounts[`${t.id}:USD`] ?? ""}
                                  onChange={(e) =>
                                    setTrancheAmounts((prev) => ({ ...prev, [`${t.id}:USD`]: e.target.value }))
                                  }
                                />
                              </td>
                              <td className="py-3 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className={adminInputCompact}
                                  value={trancheAmounts[`${t.id}:CDF`] ?? ""}
                                  onChange={(e) =>
                                    setTrancheAmounts((prev) => ({ ...prev, [`${t.id}:CDF`]: e.target.value }))
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {error ? <div className={adminErrorBox}>{error}</div> : null}
      </div>
    </div>
  );
}

