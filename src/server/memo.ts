/*
  Tiny in-process TTL cache for hot catalog reads (games, services, counts).
  Railway runs a long-lived Node server, so this saves database round trips;
  each replica keeps its own copy. Call `invalidate(prefix)` after admin edits.
*/

const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: Date.now(), value });
  return value;
}

export function invalidate(prefix = "") {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
