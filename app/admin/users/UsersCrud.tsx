"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { roleLabelFr, USER_ROLE_VALUES } from "@/lib/user-roles";
import {
  adminCard,
  adminCrudLayout,
  adminDangerButton,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminLabel,
  adminNestedCard,
  adminPrimaryButton,
  adminPrimaryButtonBlock,
  adminSecondaryButton,
  adminSectionTitle,
  adminTable,
  adminTableWrap,
  adminTh,
  adminTr,
  adminThead,
  adminTd,
  adminTdStrong,
  adminTableEmpty,
} from "../components/admin-ui";
import { useClientSort } from "../components/useClientSort";
import { SortableTh } from "../components/SortableTh";

type UserRole = (typeof USER_ROLE_VALUES)[number];
type UserRow = {
  id: number;
  username: string;
  email: string | null;
  name: string;
  roles: UserRole[];
  createdAt: string | Date;
};

const ROLES = USER_ROLE_VALUES.map((value) => ({
  value,
  label: roleLabelFr(value),
}));

function RoleCheckboxes({
  selected,
  onChange,
}: {
  selected: UserRole[];
  onChange: (roles: UserRole[]) => void;
}) {
  function toggle(role: UserRole) {
    if (selected.includes(role)) {
      if (selected.length === 1) return;
      onChange(selected.filter((r) => r !== role));
      return;
    }
    onChange([...selected, role]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className={adminLabel}>Rôles</legend>
      <div className="mt-2 flex flex-col gap-2">
        {ROLES.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={selected.includes(r.value)}
              onChange={() => toggle(r.value)}
              className="size-4 rounded border-zinc-300"
            />
            {r.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function UsersCrud({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users] = useState(initialUsers);

  const [create, setCreate] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    roles: ["SCHOOL_MANAGER"] as UserRole[],
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => users.find((u) => u.id === editingId) ?? null, [users, editingId]);

  const [update, setUpdate] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    roles: ["SCHOOL_MANAGER"] as UserRole[],
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { sortedRows, sortKey, sortDir, toggleSort } = useClientSort(users, {
    defaultKey: "username",
    getters: {
      username: (r) => r.username,
      email: (r) => r.email,
      name: (r) => r.name,
      roles: (r) => r.roles.map(roleLabelFr).join(", "),
    },
  });

  function resetUpdateFromEditing(u: UserRow) {
    setUpdate({
      username: u.username,
      email: u.email ?? "",
      name: u.name,
      roles: [...u.roles],
      password: "",
    });
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
      setCreate({ username: "", email: "", name: "", password: "", roles: ["SCHOOL_MANAGER"] });
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
    <div className={adminCrudLayout}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer un utilisateur</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Nom d'utilisateur (connexion)"
            className={adminInput}
            value={create.username}
            onChange={(e) => setCreate((c) => ({ ...c, username: e.target.value }))}
          />
          <input
            placeholder="E-mail (optionnel)"
            type="email"
            className={adminInput}
            value={create.email}
            onChange={(e) => setCreate((c) => ({ ...c, email: e.target.value }))}
          />
          <input
            required
            placeholder="Nom affiché"
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
          <RoleCheckboxes
            selected={create.roles}
            onChange={(roles) => setCreate((c) => ({ ...c, roles }))}
          />

          <button disabled={submitting} type="submit" className={adminPrimaryButtonBlock}>
            {submitting ? "Enregistrement…" : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Utilisateurs existants</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead className={adminThead}>
              <tr>
                <SortableTh column="username" label="Nom d'utilisateur" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="email" label="E-mail" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="name" label="Nom affiché" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh column="roles" label="Rôles" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className={adminTableEmpty}>
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                sortedRows.map((u) => (
                  <tr key={u.id} className={adminTr}>
                    <td className={adminTdStrong}>{u.username}</td>
                    <td className={adminTd}>{u.email ?? "—"}</td>
                    <td className={adminTd}>{u.name}</td>
                    <td className={adminTd}>{u.roles.map(roleLabelFr).join(", ")}</td>
                    <td className={adminTd}>
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.username}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Nom d'utilisateur"
                className={adminInput}
                value={update.username}
                onChange={(e) => setUpdate((x) => ({ ...x, username: e.target.value }))}
              />
              <input
                type="email"
                placeholder="E-mail (optionnel)"
                className={adminInput}
                value={update.email}
                onChange={(e) => setUpdate((x) => ({ ...x, email: e.target.value }))}
              />
              <input
                required
                placeholder="Nom affiché"
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
              <RoleCheckboxes
                selected={update.roles}
                onChange={(roles) => setUpdate((x) => ({ ...x, roles }))}
              />

              <div className="flex items-center justify-between gap-3">
                <button type="submit" disabled={submitting} className={adminPrimaryButton}>
                  {submitting ? "Enregistrement…" : "Enregistrer"}
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
