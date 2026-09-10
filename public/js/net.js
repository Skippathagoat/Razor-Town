// Razor Town — API client + live stream
(function () {
  'use strict';
  const api = {};
  async function post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      credentials: 'same-origin'
    });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(j.err || ('HTTP ' + r.status)), { code: r.status, body: j });
    return j;
  }
  async function get(path) {
    const r = await fetch(path, { credentials: 'same-origin' });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(j.err || ('HTTP ' + r.status)), { code: r.status, body: j });
    return j;
  }
  api.post = post; api.get = get;

  // Live stream: reconnect with backoff; onAuth → callback when we get 'hello'
  api.stream = function (onEvent) {
    let es = null, retry = 1000;
    function open() {
      try { es && es.close(); } catch (e) {}
      es = new EventSource('/api/stream');
      es.onopen = () => { retry = 1000; onEvent && onEvent('open', {}); };
      es.addEventListener('hello', () => onEvent && onEvent('hello', {}));
      es.addEventListener('news', (e) => onEvent && onEvent('news', JSON.parse(e.data || '{}')));
      es.addEventListener('p', (e) => onEvent && onEvent('p', JSON.parse(e.data || '{}')));
      es.addEventListener('tick', () => onEvent && onEvent('tick', {}));
      es.onerror = () => {
        es.close();
        retry = Math.min(15000, retry * 2);
        onEvent && onEvent('drop', {});
        setTimeout(open, retry + Math.random() * 500);
      };
    }
    open();
    return { close: () => { try { es && es.close(); } catch (e) {} } };
  };
  window.Net = api;
})();
