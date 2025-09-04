export async function fetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    throw new Error(`fetch ${url} ${res.status} ${text}`);
  }
  return res.json();
}
