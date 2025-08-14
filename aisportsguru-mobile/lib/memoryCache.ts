type Entry<T> = { at: number, data: T };
const store = new Map<string, Entry<unknown>>();
const TTL = 60_000;

export async function memo60s<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  const now = Date.now();
  if (hit && now - hit.at < TTL) return hit.data;
  const data = await loader();
  store.set(key, { at: now, data });
  return data;
}
