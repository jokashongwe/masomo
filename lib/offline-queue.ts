"use client";

export type QueuedOperation = {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  url: string;
  body: unknown;
  timestamp: number;
};

const QUEUE_KEY = "kela-offline-queue";

/**
 * Récupère la file d'attente des opérations depuis le localStorage.
 */
export function getOfflineQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Ajoute une opération à la file d'attente dans le localStorage.
 */
export function queueOperation(op: Omit<QueuedOperation, "id" | "timestamp">) {
  const queue = getOfflineQueue();
  const newOp: QueuedOperation = { ...op, id: crypto.randomUUID(), timestamp: Date.now() };
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, newOp]));
}
