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
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [updateLogoFile, setUpdateLogoFile] = useState<File | null>(null);
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
      const form = new FormData();
      form.set("name", create.name);
      form.set("address", create.address);
      form.set("city", create.city);
      form.set("contacts", create.contacts ?? "");
      form.set("email", create.email ?? "");
      if (createLogoFile) form.set("logo", createLogoFile);

      const res = await fetch("/api/admin/schools", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error?.formErrors ? String(data.error.formErrors) : data?.error?.message ?? "Échec de création",
        );
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
      setCreateLogoFile(null);
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
      const form = new FormData();
      form.set("name", update.name);
      form.set("address", update.address);
      form.set("city", update.city);
      form.set("contacts", update.contacts ?? "");
      form.set("email", update.email ?? "");
      if (updateLogoFile) form.set("logo", updateLogoFile);

      const res = await fetch(`/api/admin/schools/${editing.id}`, {
        method: "PUT",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error?.formErrors ? String(data.error.formErrors) : data?.error?.message ?? "Échec de mise à jour",
        );
        return;
      }
      setEditingId(null);
      setUpdateLogoFile(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    const ok = window.confirm("Supprimer cette école ?");
    if (!ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de suppression");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCardGrid}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Créer une école</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <input
            required
            placeholder="Nom"
            className={adminInput}
            value={create.name}
            onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Logo (upload)</div>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-zinc-700 dark:text-zinc-200"
              onChange={(e) => setCreateLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <input
            required
            placeholder="Adresse"
            className={adminInput}
            value={create.address}
            onChange={(e) => setCreate((c) => ({ ...c, address: e.target.value }))}
          />
          <input
            required
            placeholder="Ville"
            className={adminInput}
            value={create.city}
            onChange={(e) => setCreate((c) => ({ ...c, city: e.target.value }))}
          />
          <input
            placeholder="Contacts"
            className={adminInput}
            value={create.contacts ?? ""}
            onChange={(e) => setCreate((c) => ({ ...c, contacts: e.target.value || null }))}
          />
          <input
            placeholder="Email"
            className={adminInput}
            value={create.email ?? ""}
            onChange={(e) => setCreate((c) => ({ ...c, email: e.target.value || null }))}
          />
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
        <h2 className={adminSectionTitle}>Écoles existantes</h2>
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr>
                <th className={adminTh}>Nom</th>
                <th className={adminTh}>Ville</th>
                <th className={adminTh}>Email</th>
                <th className={adminTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-600 dark:text-zinc-300">
                    Aucune école.
                  </td>
                </tr>
              ) : (
                schools.map((s) => (
                  <tr key={s.id} className={adminTr}>
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
                          className={adminGhostButton}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDelete(s.id)}
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
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.name}</h3>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3">
              <input
                required
                placeholder="Nom"
                className={adminInput}
                value={update.name}
                onChange={(e) => setUpdate((u) => ({ ...u, name: e.target.value }))}
              />
              <div className="space-y-1">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Logo (upload)</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300">
                  Logo actuel : {update.logo ? update.logo : "Aucun"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-sm text-zinc-700 dark:text-zinc-200"
                  onChange={(e) => setUpdateLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <input
                required
                placeholder="Adresse"
                className={adminInput}
                value={update.address}
                onChange={(e) => setUpdate((u) => ({ ...u, address: e.target.value }))}
              />
              <input
                required
                placeholder="Ville"
                className={adminInput}
                value={update.city}
                onChange={(e) => setUpdate((u) => ({ ...u, city: e.target.value }))}
              />
              <input
                placeholder="Contacts"
                className={adminInput}
                value={update.contacts ?? ""}
                onChange={(e) => setUpdate((u) => ({ ...u, contacts: e.target.value || null }))}
              />
              <input
                placeholder="Email"
                className={adminInput}
                value={update.email ?? ""}
                onChange={(e) => setUpdate((u) => ({ ...u, email: e.target.value || null }))}
              />

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
                  Annuler
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

