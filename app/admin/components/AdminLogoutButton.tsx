"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogout } from "./AdminIcons";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title="Déconnexion"
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50"
    >
      <IconLogout className="h-5 w-5" />
    </button>
  );
}
