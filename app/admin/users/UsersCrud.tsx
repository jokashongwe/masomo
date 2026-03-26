"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "SYSTEM_ADMIN" | "FINANCE_MANAGER" | "FINANCE_VIEWER" | "SCHOOL_MANAGER";
type UserRow = { id: number; email: string; name: string; role: UserRole; createdAt: string | Date };

const ROLES: { value: UserRole; label: string }[] = [
  { value: "SYSTEM_ADMIN", label: "System Administrator" },
  { value: "FINANCE_MANAGER", label: "Finance Manager" },
  { value: "FINANCE_VIEWER", label: "Finance Viewer" },
  { value: "SCHOOL_MANAGER", label: "School Manager" },
];

export default function UsersCrud({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users] = useState(initialUsers);

  const [create, setCreate] = useState({
    email: "",
    name: "",
    password: "",
    role: "SCHOOL_MANAGER" as UserRole,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => users.find((u) => u.id === editingId) ?? null, [users, editingId]);

  const [update, setUpdate] = useState({
    email: "",
    name: "",
    password: "",
    role: "SCHOOL_MANAGER" as UserRole,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetUpdateFromEditing(u: UserRow) {
    setUpdate({ email: u.email, name: u.name, role: u.role, password: "" });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error ?? "Create failed");
        return;
      }
      setCreate({ email: "", name: "", password: "", role: "SCHOOL_MANAGER" });
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
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error ?? "Update failed");
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
    const ok = window.confirm("Delete this user?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Delete failed");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 p-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">Create User</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.email}
            onChange={(e) => setCreate((c) => ({ ...c, email: e.target.value }))}
          />
          <input
            required
            placeholder="Name"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            required
            type="password"
            placeholder="Password (min 6)"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.password}
            onChange={(e) => setCreate((c) => ({ ...c, password: e.target.value }))}
          />
          <select
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={create.role}
            onChange={(e) => setCreate((c) => ({ ...c, role: e.target.value as UserRole }))}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

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
        <h2 className="text-lg font-semibold text-black dark:text-white">Existing Users</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-700 dark:text-zinc-300">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-3 font-medium">{u.email}</td>
                    <td className="py-3 pr-3">{u.name}</td>
                    <td className="py-3 pr-3">{u.role}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(u.id);
                            resetUpdateFromEditing(u);
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-black/40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(u.id)}
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
            <h3 className="font-semibold text-black dark:text-white">Edit: {editing.email}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                type="email"
                placeholder="Email"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.email}
                onChange={(e) => setUpdate((x) => ({ ...x, email: e.target.value }))}
              />
              <input
                required
                placeholder="Name"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.name}
                onChange={(e) => setUpdate((x) => ({ ...x, name: e.target.value }))}
              />
              <input
                type="password"
                placeholder="New password (optional)"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.password}
                onChange={(e) => setUpdate((x) => ({ ...x, password: e.target.value }))}
              />
              <select
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                value={update.role}
                onChange={(e) => setUpdate((x) => ({ ...x, role: e.target.value as UserRole }))}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

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
                  Close
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

