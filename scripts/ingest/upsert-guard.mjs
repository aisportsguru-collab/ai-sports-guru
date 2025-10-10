(function () {
  const g = globalThis;
  if (g.__UPSERT_GUARD__) return;
  g.__UPSERT_GUARD__ = true;

  const _fetch = g.fetch;
  if (typeof _fetch !== 'function') return;

  function needsGamesUpsert(t) {
    try { return typeof t === 'string' ? t.includes('/rest/v1/games') : (t && t.url && String(t.url).includes('/rest/v1/games')); }
    catch { return false; }
  }

  function withOnConflict(u) {
    if (!u.searchParams.has('on_conflict')) u.searchParams.set('on_conflict', 'game_id');
  }

  function mergePreferHeaders(h) {
    const H = new Headers(h || {});
    const current = (H.get('Prefer') || '').split(',').map(s => s.trim()).filter(Boolean);
    const set = new Set(current);
    set.add('resolution=merge-duplicates');
    H.set('Prefer', Array.from(set).join(','));
    return H;
  }

  g.fetch = async (url, init) => {
    try {
      if (needsGamesUpsert(url)) {
        const u = new URL(typeof url === 'string' ? url : url.url);
        withOnConflict(u);

        const headers = mergePreferHeaders((init && init.headers) || (url && url.headers));
        if (url && typeof url === 'object' && 'method' in url) {
          url = new Request(u.toString(), { ...url, headers });
          init = undefined;
        } else {
          init = { ...(init || {}), headers };
          url = u.toString();
        }
      }
    } catch {}

    const res = await _fetch(url, init);
    if (res && res.status === 409) {
      return new Response('{"ok":true,"note":"duplicate ignored"}', { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return res;
  };
})();
