export type StudentOfflineOperation = {
  id: string;
  method: "POST" | "PUT";
  url: string;
  body: unknown;
  createdAt: string;
};

const STORAGE_KEY = "masomo.student-offline-operations.v1";
const CHANGE_EVENT = "masomo:student-offline-queue-change";

function readQueue(): StudentOfflineOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? (value as StudentOfflineOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: StudentOfflineOperation[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getStudentOfflineOperationCount() {
  return readQueue().length;
}

export function subscribeToStudentOfflineQueue(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function queueStudentOperation(operation: Omit<StudentOfflineOperation, "id" | "createdAt">) {
  const queue = readQueue();
  queue.push({ ...operation, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  writeQueue(queue);
}

export async function synchronizeStudentOfflineOperations() {
  const queue = readQueue();
  let synchronized = 0;
  for (let index = 0; index < queue.length; index += 1) {
    const operation = queue[index];
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation.body),
      });
      if (!response.ok) {
        return { synchronized, remaining: queue.length - synchronized, error: "Une modification doit être corrigée avant synchronisation." };
      }
      synchronized += 1;
      writeQueue(queue.slice(index + 1));
    } catch {
      return { synchronized, remaining: queue.length - synchronized, error: "Connexion indisponible." };
    }
  }
  return { synchronized, remaining: 0 };
}
