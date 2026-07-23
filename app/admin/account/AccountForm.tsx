"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import { roleLabelFr } from "@/lib/user-roles";
import {
  adminCard,
  adminErrorBox,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSectionTitle,
  adminSoftCard,
} from "../components/admin-ui";

type MeUser = {
  id: number;
  username: string;
  email: string | null;
  name: string;
  roles: UserRole[];
};

export default function AccountForm({ initialUser }: { initialUser: MeUser }) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    username: initialUser.username,
    email: initialUser.email ?? "",
    name: initialUser.name,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const changingPassword = Boolean(passwords.newPassword || passwords.confirmPassword || passwords.currentPassword);
    if (changingPassword) {
      if (!passwords.currentPassword) {
        setError("Indiquez votre mot de passe actuel pour le modifier.");
        return;
      }
      if (passwords.newPassword.length < 6) {
        setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
        return;
      }
      if (passwords.newPassword !== passwords.confirmPassword) {
        setError("La confirmation du mot de passe ne correspond pas.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          email: profile.email,
          name: profile.name,
          ...(changingPassword
            ? {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword,
              }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de la mise à jour");
        return;
      }

      if (data.user) {
        setProfile({
          username: data.user.username,
          email: data.user.email ?? "",
          name: data.user.name,
        });
      }
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccess(
        data.passwordChanged
          ? "Profil et mot de passe mis à jour."
          : "Profil mis à jour.",
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Informations personnelles</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={adminLabel} htmlFor="me-name">
              Nom affiché
            </label>
            <input
              id="me-name"
              required
              className={`mt-2 ${adminInput}`}
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="me-username">
              Nom d&apos;utilisateur
            </label>
            <input
              id="me-username"
              required
              autoComplete="username"
              className={`mt-2 ${adminInput}`}
              value={profile.username}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={adminLabel} htmlFor="me-email">
              E-mail (optionnel)
            </label>
            <input
              id="me-email"
              type="email"
              autoComplete="email"
              className={`mt-2 ${adminInput}`}
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
        </div>

        <div className={`${adminSoftCard} mt-4 text-sm text-zinc-600 dark:text-zinc-300`}>
          Rôles : {initialUser.roles.map((r) => roleLabelFr(r)).join(", ")}
          <span className="mt-1 block text-xs text-zinc-500">
            Les rôles sont gérés par l&apos;administrateur système.
          </span>
        </div>
      </div>

      <div className={adminCard}>
        <h2 className={adminSectionTitle}>Changer le mot de passe</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Laissez vide si vous ne souhaitez pas le modifier.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={adminLabel} htmlFor="me-current-password">
              Mot de passe actuel
            </label>
            <input
              id="me-current-password"
              type="password"
              autoComplete="current-password"
              className={`mt-2 ${adminInput}`}
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="me-new-password">
              Nouveau mot de passe
            </label>
            <input
              id="me-new-password"
              type="password"
              autoComplete="new-password"
              className={`mt-2 ${adminInput}`}
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className={adminLabel} htmlFor="me-confirm-password">
              Confirmer
            </label>
            <input
              id="me-confirm-password"
              type="password"
              autoComplete="new-password"
              className={`mt-2 ${adminInput}`}
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {error ? <div className={adminErrorBox}>{error}</div> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      <button type="submit" disabled={submitting} className={adminPrimaryButton}>
        {submitting ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
