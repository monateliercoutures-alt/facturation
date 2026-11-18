/** File d'attente des brouillons créés hors connexion (navigateur). Une file par utilisateur. */

export type QueuedDraft = { id: string; userId: string; createdAt: number; payload: unknown; label: string; error?: string };

const KEY = "factureci:drafts";

function read(): QueuedDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedDraft[]) : [];
  } catch {
    return [];
  }
}

function write(list: QueuedDraft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("factureci:queue"));
  } catch {
    /* stockage plein ou refusé : le brouillon reste à l'écran */
  }
}

export const queuedFor = (userId: string) => read().filter((d) => d.userId === userId);

export function enqueue(userId: string, payload: unknown, label: string): boolean {
  const before = read();
  write([...before, { id: crypto.randomUUID(), userId, createdAt: Date.now(), payload, label }]);
  return read().length > before.length;
}

export const remove = (id: string) => write(read().filter((d) => d.id !== id));
export const markFailed = (id: string, error: string) => write(read().map((d) => (d.id === id ? { ...d, error } : d)));
