"use client";

import { useEffect, useState } from "react";
import { getStudentOfflineOperationCount, subscribeToStudentOfflineQueue, synchronizeStudentOfflineOperations } from "@/lib/student-offline-queue";

export default function StudentSyncButton() {
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => { setCount(getStudentOfflineOperationCount()); setOnline(navigator.onLine); };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const unsubscribe = subscribeToStudentOfflineQueue(refresh);
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); unsubscribe(); };
  }, []);

  async function synchronize() {
    setSyncing(true);
    setMessage(null);
    const result = await synchronizeStudentOfflineOperations();
    setCount(result.remaining);
    setMessage(result.error ?? (result.synchronized > 0 ? "Synchronisation terminée." : "Aucun changement en attente."));
    setSyncing(false);
  }

  return <div className="w-full px-2" aria-live="polite">
    <button type="button" onClick={synchronize} disabled={!online || syncing || count === 0} className="w-full rounded-xl bg-white px-2 py-2 text-[10px] font-bold text-[#1e7bb8] shadow-sm disabled:cursor-not-allowed disabled:opacity-60" title={!online ? "Connexion indisponible" : "Synchroniser les changements d'élèves"}>
      {syncing ? "Synchronisation…" : `Synchroniser${count ? ` (${count})` : ""}`}
    </button>
    {message ? <p className="mt-1 text-center text-[9px] text-white/90">{message}</p> : null}
    {!online && count > 0 ? <p className="mt-1 text-center text-[9px] text-white/90">Hors ligne : changements conservés.</p> : null}
  </div>;
}
