const isReq = x => x && typeof x === 'object' && typeof x.url === 'string';
const toURL = x => { try { return new URL(isReq(x) ? x.url : String(x)); } catch { return null; } };

function mergePrefer(orig) {
  const h = new Headers(orig || {});
  const cur = (h.get('Prefer') || '').split(',').map(s => s.trim()).filter(Boolean);
  const set = new Set(cur);
  if (![...set].some(s => s.startsWith('resolution='))) set.add('resolution=merge-duplicates');
  if (![...set].some(s => s.startsWith('return='))) set.add('return=minimal');
  h.set('Prefer', [...set].join(','));
  return h;
}

const _fetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  try {
    const u = toURL(url);
    if (u && /\/rest\/v1\/games\b/.test(u.pathname)) {
      if (!u.searchParams.has('on_conflict')) u.searchParams.set('on_conflict', 'game_id');
      const headers = mergePrefer(init.headers);
      if (isReq(url)) {
        url = new Request(u.toString(), { ...url, headers });
        init = undefined;
      } else {
        init = { ...(init || {}), headers };
        url = u.toString();
      }
    }
  } catch {}
  const res = await _fetch(url, init);
  if (res && res.status === 409) return new Response('', { status: 200, headers: { 'content-type': 'application/json' } });
  return res;
};
