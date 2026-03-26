"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type School = {
  id: number;
  name: string;
  logo: string | null;
  address: string;
  city: string;
  contacts: string | null;
  email: string | null;
};

export default function SchoolCrud({ initialSchools }: { initialSchools: School[] }) {
  const router = useRouter();

  const [schools] = useState<School[]>(initialSchools);
  const [create, setCreate] = useState<Omit<School, "id">>({
    name: "",
    logo: null,
    address: "",
    city: "",
    contacts: null,
    email: null,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => schools.find((s) => s.id === editingId) ?? null, [schools, editingId]);

  const [update, setUpdate] = useState<Omit<School, "id">>({
    name: "",
    logo: null,
    address: "",
    city: "",
    contacts: null,
    email: null,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(target: School) {
    setUpdate({
      name: target.name,
      logo: target.logo,
      address: target.address,
      city: target.city,
      contacts: target.contacts,
      email: target.email,
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...create,
          logo: create.logo ?? "",
          contacts: create.contacts ?? "",
          email: create.email ?? "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error?.message ?? "Create failed");
        return;
      }
      setCreate({
        name: "",
        logo: null,
        address: "",
        city: "",
        contacts: null,
        email: null,
      });
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
      const res = await fetch(`/api/admin/schools/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...update,
          logo: update.logo ?? "",
          contacts: update.contacts ?? "",
          email: update.email ?? "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error?.message ?? "Update failed");
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
    const ok = window.confirm("Delete this school?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { method: "DELETE" });
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Create School</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Name"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            placeholder="Logo (URL)"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.logo ?? ""}
            onChange={(e) => setCreate((c) => ({ ...c, logo: e.target.value || null }))}
          />
          <input
            required
            placeholder="Address"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.address}
            onChange={(e) => setCreate((c) => ({ ...c, address: e.target.value }))}
          />
          <input
            required
            placeholder="City"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.city}
            onChange={(e) => setCreate((c) => ({ ...c, city: e.target.value }))}
          />
          <input
            placeholder="Contacts"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.contacts ?? ""}
            onChange={(e) => setCreate((c) => ({ ...c, contacts: e.target.value || null }))}
          />
          <input
            placeholder="Email"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.email ?? ""}
            onChange={(e) => setCreate((c) => ({ ...c, email: e.target.value || null }))}
          />
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
        <h2 className="text-lg font-semibold text-black dark:text-white">Existing Schools</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">City</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    No schools yet.
                  </td>
                </tr>
              ) : (
                schools.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-3 font-medium">{s.name}</td>
                    <td className="py-3 pr-3">{s.city}</td>
                    <td className="py-3 pr-3">{s.email ?? "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(s.id);
                            resetUpdateFromEditing(s);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(s.id)}
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
                placeholder="Name"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <input
                placeholder="Logo (URL)"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.logo ?? ""}
                onChange={(e) => setUpdate((u) => ({ ...u, logo: e.target.value || null }))}
              />
              <input
                required
                placeholder="Address"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.address}
                onChange={(e) => setUpdate((u) => ({ ...u, address: e.target.value }))}
              />
              <input
                required
                placeholder="City"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.city}
                onChange={(e) => setUpdate((u) => ({ ...u, city: e.target.value }))}
              />
              <input
                placeholder="Contacts"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.contacts ?? ""}
                onChange={(e) => setUpdate((u) => ({ ...u, contacts: e.target.value || null }))}
              />
              <input
                placeholder="Email"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.email ?? ""}
                onChange={(e) => setUpdate((u) => ({ ...u, email: e.target.value || null }))}
              />

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

