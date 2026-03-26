"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ModuleTranche = { id: number; codeTranche: string; moduleId: number };
type BillingModule = {
  id: number;
  name: string;
  startDay: number;
  startMonth: number;
  endDay: number;
  endMonth: number;
  tranches: ModuleTranche[];
};

function fmtDM(day: number, month: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export default function ModulesCrud({ initialModules }: { initialModules: BillingModule[] }) {
  const router = useRouter();
  const [modules] = useState(initialModules);

  const [create, setCreate] = useState({
    name: "",
    startDay: 1,
    startMonth: 1,
    endDay: 1,
    endMonth: 1,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => modules.find((m) => m.id === editingId) ?? null, [modules, editingId]);

  const [update, setUpdate] = useState({
    name: "",
    startDay: 1,
    startMonth: 1,
    endDay: 1,
    endMonth: 1,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(target: BillingModule) {
    setUpdate({
      name: target.name,
      startDay: target.startDay,
      startMonth: target.startMonth,
      endDay: target.endDay,
      endMonth: target.endMonth,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/finance/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Create failed");
        return;
      }
      setCreate({ name: "", startDay: 1, startMonth: 1, endDay: 1, endMonth: 1 });
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
      const res = await fetch(`/api/admin/finance/modules/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message ?? data?.error ?? "Update failed");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    const ok = window.confirm("Delete this module? (This will delete its tranches too)");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/finance/modules/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Delete failed");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Create Module</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Module name"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-zinc-600 dark:text-zinc-300">Start (DD/MM)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                  value={create.startDay}
                  onChange={(e) => setCreate((c) => ({ ...c, startDay: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                  value={create.startMonth}
                  onChange={(e) => setCreate((c) => ({ ...c, startMonth: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-zinc-600 dark:text-zinc-300">End (DD/MM)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                  value={create.endDay}
                  onChange={(e) => setCreate((c) => ({ ...c, endDay: Number(e.target.value) }))}
                />
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                  value={create.endMonth}
                  onChange={(e) => setCreate((c) => ({ ...c, endMonth: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Existing Modules</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Period</th>
                <th className="py-2 pr-3">Tranches</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    No modules yet.
                  </td>
                </tr>
              ) : (
                modules.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-3 font-medium">{m.name}</td>
                    <td className="py-3 pr-3">
                      {fmtDM(m.startDay, m.startMonth)} → {fmtDM(m.endDay, m.endMonth)}
                    </td>
                    <td className="py-3 pr-3">
                      {m.tranches.length > 0 ? m.tranches.map((t) => t.codeTranche).join(", ") : "-"}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            resetUpdateFromEditing(m);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(m.id)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
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
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-black dark:text-white">Edit: {editing.name}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Module name"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Start (DD/MM)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                      value={update.startDay}
                      onChange={(e) => setUpdate((u) => ({ ...u, startDay: Number(e.target.value) }))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                      value={update.startMonth}
                      onChange={(e) => setUpdate((u) => ({ ...u, startMonth: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">End (DD/MM)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                      value={update.endDay}
                      onChange={(e) => setUpdate((u) => ({ ...u, endDay: Number(e.target.value) }))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                      value={update.endMonth}
                      onChange={(e) => setUpdate((u) => ({ ...u, endMonth: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-white/60 dark:hover:bg-black/40"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div> : null}
      </div>
    </div>
  );
}

