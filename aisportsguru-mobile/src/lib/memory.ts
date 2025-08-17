import { getItemJSON, setItemJSON } from './kv';

export async function remember(key: string, val: string) {
  await setItemJSON(key, { v: val });
}
export async function recall(key: string): Promise<string | null> {
  const r = await getItemJSON<{ v: string }>(key);
  return r?.v ?? null;
}

export const MEM_LAST_LEAGUE = 'mem:lastLeague';
export const MEM_LAST_PRED_ROUTE = 'mem:lastPredRoute';
