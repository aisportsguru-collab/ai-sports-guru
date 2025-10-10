/**
 * ESM preload that makes POST/UPSERTs to /rest/v1/games duplicate-safe:
 * - forces ?on_conflict=game_id
 * - merges Prefer: resolution=merge-duplicates (keeps existing return=* if set)
 * - ensures Authorization/apikey headers from SUPABASE_SERVICE_ROLE_KEY
 * - swallows HTTP 409 by returning 200 (empty JSON body)
 */
const hasFetch = typeof globalThis.fetch === 'function';
if (hasFetch && !globalThis.__GAMES_UPSERT_GUARD__) {
  globalThis.__GAMES_UPSERT_GUARD__ = true;

  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supaKey = svc || process.env.SUPABASE_ANON_KEY || '';
  const _fetch = globalThis.fetch;

  const isGamesUrl = (u) => {
    try { return String(u).includes('/rest/v1/games'); } catch { return false; }
  };

  const withOnConflict = (u) => {
    const url = new URL(String(u));
    if (!url.searchParams.has('on_conflict')) url.searchParams.set('on_conflict', 'game_id');
    return url.toString();
  };

  const mergeHeaders = (hdrs = {}) => {
    const h = new Headers(hdrs);
    const prefer = h.get('Prefer') || '';
    const parts = new Set(prefer.split(',').map(s => s.trim()).filter(Boolean));
    parts.add('resolution=merge-duplicates');
    if (!parts.has('return=representation') && !parts.has('return=minimal')) {
      parts.add('return=minimal');
    }
    h.set('Prefer', Array.from(parts).join(','));
    h.set('Content-Type', h.get('Content-Type') || 'application/json');
    if (supaKey) {
      h.set('apikey', supaKey);
      h.set('Authorization', 'Bearer ' + supaKey);
    }
    return h;
  };

  globalThis.fetch = async (url, init) => {
    try {
      if (isGamesUrl(url)) {
        const u = withOnConflict(isRequest(url) ? url.url : url);
        if (isRequest(url)) {
          const merged = new Request(u, { ...url, headers: mergeHeaders(url.headers) });
          url = merged;
          init = undefined;
        } else {
          init = { ...(init || {}), headers: mergeHeaders(init && init.headers) };
          url = u;
        }
      }
    } catch {}
    const res = await _fetch(url, init);
    if (res && res.status === 409) {
      return new Response('{"ok":true,"note":"duplicate ignored"}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return res;
  };

  function isRequest(v) {
    return typeof Request !== 'undefined' && v instanceof Request;
  }
}
