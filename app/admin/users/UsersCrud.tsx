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
  adminNestedCard,
  adminPrimaryButton,
  adminPrimaryButtonBlock,
  adminSecondaryButton,
  adminSectionTitle,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
} from "../components/admin-ui";

type UserRole = "SYSTEM_ADMIN" | "FINANCE_MANAGER" | "FINANCE_VIEWER" | "SCHOOL_MANAGER";
type UserRow = { id: number; email: string; name: string; role: UserRole; createdAt: string | Date };

const ROLES: { value: UserRole; label: string }[] = [
  { value: "SYSTEM_ADMIN", label: "Administrateur système" },
  { value: "FINANCE_MANAGER", label: "Responsable finances" },
  { value: "FINANCE_VIEWER", label: "Lecteur finances" },
  { value: "SCHOOL_MANAGER", label: "Responsable scolaire" },
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
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error ?? "Échec de création");
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
        setError(data?.error?.formErrors ? String(data.error.formErrors) : data?.error ?? "Échec de mise à jour");
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
    const ok = window.confirm("Supprimer cet utilisateur ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
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
        <h2 className={adminSectionTitle}>Créer un utilisateur</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            className={adminInput}
            value={create.email}
            onChange={(e) => setCreate((c) => ({ ...c, email: e.target.value }))}
          />
          <input
            required
            placeholder="Nom"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <input
            required
            type="password"
            placeholder="Mot de passe (min 6)"
            className={adminInput}
            value={create.password}
            onChange={(e) => setCreate((c) => ({ ...c, password: e.target.value }))}
          />
          <select
            className={adminInput}
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
            className={adminPrimaryButtonBlock}
          >
            {submitting ? "Enregistrement..." : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Utilisateurs existants</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Email</th>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Rôle</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className={adminTr}>
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
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(u.id)}
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.email}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                type="email"
                placeholder="Email"
                className={adminInput}
                value={update.email}
                onChange={(e) => setUpdate((x) => ({ ...x, email: e.target.value }))}
              />
              <input
                required
                placeholder="Nom"
                className={adminInput}
                value={update.name}
                onChange={(e) => setUpdate((x) => ({ ...x, name: e.target.value }))}
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe (optionnel)"
                className={adminInput}
                value={update.password}
                onChange={(e) => setUpdate((x) => ({ ...x, password: e.target.value }))}
              />
              <select
                className={adminInput}
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
          </div>
        ) : null}

        {error ? <div className={adminErrorBox}>{error}</div> : null}
      </div>
    </div>
  );
}

