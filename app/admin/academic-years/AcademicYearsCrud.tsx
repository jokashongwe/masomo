"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AcademicYear = {
  id: number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isCurrent: boolean;
};

function toInputDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function AcademicYearsCrud({ initialYears }: { initialYears: AcademicYear[] }) {
  const router = useRouter();

  const [years] = useState(initialYears);
  const [create, setCreate] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => years.find((y) => y.id === editingId) ?? null, [years, editingId]);

  const [update, setUpdate] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(y: AcademicYear) {
    setUpdate({
      name: y.name,
      startDate: toInputDate(y.startDate),
      endDate: toInputDate(y.endDate),
      isCurrent: y.isCurrent,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: create.name,
          startDate: new Date(create.startDate),
          endDate: new Date(create.endDate),
          isCurrent: create.isCurrent,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to create academic year");
        return;
      }
      setCreate({ name: "", startDate: "", endDate: "", isCurrent: false });
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
      const res = await fetch(`/api/admin/academic-years/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: update.name,
          startDate: new Date(update.startDate),
          endDate: new Date(update.endDate),
          isCurrent: update.isCurrent,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to update academic year");
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
    const ok = window.confirm("Delete this academic year?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/academic-years/${id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Create</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Name (unique)"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              type="date"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={create.startDate}
              onChange={(e) => setCreate((c) => ({ ...c, startDate: e.target.value }))}
            />
            <input
              required
              type="date"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={create.endDate}
              onChange={(e) => setCreate((c) => ({ ...c, endDate: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={create.isCurrent}
              onChange={(e) => setCreate((c) => ({ ...c, isCurrent: e.target.checked }))}
            />
            Mark as current
          </label>
          <button
            disabled={submitting}
            type="submit"
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create year"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Existing Years</h2>
        <div className="mt-3 space-y-3">
          {years.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">No years yet.</div>
          ) : (
            years.map((y) => (
              <div key={y.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-black dark:text-white">{y.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {toInputDate(y.startDate)} → {toInputDate(y.endDate)}
                    </div>
                    <div className="text-xs mt-1">
                      {y.isCurrent ? (
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">Current</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-zinc-100 text-zinc-700 px-2 py-0.5">Not current</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(y.id);
                        resetUpdateFromEditing(y);
                      }}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={y.isCurrent || submitting}
                      onClick={() => handleDelete(y.id)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {editing ? (
          <form onSubmit={handleUpdate} className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/60 dark:bg-black/40 space-y-3">
            <h3 className="font-semibold text-black dark:text-white">Edit: {editing.name}</h3>
            <input
              required
              placeholder="Name"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={update.name}
              onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                required
                type="date"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.startDate}
                onChange={(e) => setUpdate((u) => ({ ...u, startDate: e.target.value }))}
              />
              <input
                required
                type="date"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.endDate}
                onChange={(e) => setUpdate((u) => ({ ...u, endDate: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={update.isCurrent}
                onChange={(e) => setUpdate((u) => ({ ...u, isCurrent: e.target.checked }))}
              />
              Mark as current
            </label>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-zinc-900 text-white px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
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
        ) : null}

        {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{error}</div> : null}
      </div>
    </div>
  );
}

