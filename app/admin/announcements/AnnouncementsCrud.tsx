"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  adminSoftCard,
} from "../components/admin-ui";

type Announcement = {
  id: number;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
};

export default function AnnouncementsCrud({ initialItems }: { initialItems: Announcement[] }) {
  const router = useRouter();
  const items = initialItems;

  const [create, setCreate] = useState({ title: "", body: "", publish: true });
  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => items.find((a) => a.id === editingId) ?? null, [items, editingId]);
  const [update, setUpdate] = useState({ title: "", body: "", publish: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(create),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de création");
        return;
      }
      setCreate({ title: "", body: "", publish: true });
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
      const res = await fetch(`/api/admin/announcements/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: update.title,
          body: update.body,
          publish: update.publish,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de mise à jour");
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish(a: Announcement) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !a.publishedAt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de publication");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = window.confirm("Supprimer ce communiqué ?");
    if (!ok) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de suppression");
        return;
      }
      if (editingId === id) setEditingId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminCrudLayout}>
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Nouveau communiqué</h2>
        <form onSubmit={handleCreate} className="mt-3 space-y-3">
          <div>
            <label className={adminLabel}>Titre</label>
            <input
              required
              className={`mt-2 ${adminInput}`}
              value={create.title}
              onChange={(e) => setCreate((c) => ({ ...c, title: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabel}>Contenu</label>
            <textarea
              required
              rows={5}
              className={`mt-2 ${adminInput}`}
              value={create.body}
              onChange={(e) => setCreate((c) => ({ ...c, body: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={create.publish}
              onChange={(e) => setCreate((c) => ({ ...c, publish: e.target.checked }))}
            />
            Publier immédiatement (visible dans l&apos;app parents)
          </label>
          <button type="submit" disabled={submitting} className={adminPrimaryButtonBlock}>
            {submitting ? "Enregistrement…" : "Créer"}
          </button>
        </form>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Communiqués</h2>
        <div className="mt-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Aucun communiqué.</p>
          ) : (
            items.map((a) => (
              <div key={a.id} className={adminSoftCard}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900 dark:text-white">{a.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{a.body}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                      <span>
                        {a.publishedAt ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
                            Publié
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                            Brouillon
                          </span>
                        )}
                      </span>
                      <span>Par {a.authorName}</span>
                      <span>
                        {a.publishedAt
                          ? new Date(a.publishedAt).toLocaleString("fr-FR")
                          : new Date(a.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      className={adminGhostButton}
                      onClick={() => {
                        setEditingId(a.id);
                        setUpdate({
                          title: a.title,
                          body: a.body,
                          publish: Boolean(a.publishedAt),
                        });
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      className={adminSecondaryButton}
                      onClick={() => togglePublish(a)}
                    >
                      {a.publishedAt ? "Dépublier" : "Publier"}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      className={adminDangerButton}
                      onClick={() => handleDelete(a.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {editing ? (
          <form onSubmit={handleUpdate} className={`${adminNestedCard} mt-4 space-y-3`}>
            <h3 className={`font-semibold ${adminSectionTitle}`}>Modifier : {editing.title}</h3>
            <div>
              <label className={adminLabel}>Titre</label>
              <input
                required
                className={`mt-2 ${adminInput}`}
                value={update.title}
                onChange={(e) => setUpdate((u) => ({ ...u, title: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabel}>Contenu</label>
              <textarea
                required
                rows={5}
                className={`mt-2 ${adminInput}`}
                value={update.body}
                onChange={(e) => setUpdate((u) => ({ ...u, body: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={update.publish}
                onChange={(e) => setUpdate((u) => ({ ...u, publish: e.target.checked }))}
              />
              Publié
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={submitting} className={adminPrimaryButton}>
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                disabled={submitting}
                className={adminSecondaryButton}
                onClick={() => setEditingId(null)}
              >
                Annuler
              </button>
            </div>
          </form>
        ) : null}

        {error ? <div className={`${adminErrorBox} mt-4`}>{error}</div> : null}
      </div>
    </div>
  );
}
