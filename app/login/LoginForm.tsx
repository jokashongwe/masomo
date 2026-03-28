"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminErrorBox,
  adminInput,
  adminLabel,
  adminPrimaryButtonBlock,
} from "../admin/components/admin-ui";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Échec de connexion");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className={`block ${adminLabel}`}>
          Adresse e-mail
        </label>
        <input
          id="login-email"
          required
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          className={`mt-2 ${adminInput}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="login-password" className={`block ${adminLabel}`}>
          Mot de passe
        </label>
        <input
          id="login-password"
          required
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={`mt-2 ${adminInput}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <div className={adminErrorBox}>{error}</div> : null}
      <button type="submit" disabled={submitting} className={adminPrimaryButtonBlock}>
        {submitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
