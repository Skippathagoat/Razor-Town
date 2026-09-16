// Razor Town — UI utilities & small building blocks
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function money(n) {
    n = Math.round(n || 0);
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n >= 1e9) return sign + '$' + (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return sign + '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e5) return sign + '$' + (n / 1e3).toFixed(0) + 'K';
    return sign + '$' + n.toLocaleString('en-US');
  }
  function pct(a, b) { return b <= 0 ? 0 : Math.max(0, Math.min(100, a / b * 100)); }

  function fmtDur(ms) {
    if (!ms || ms <= 0) return '00:00';
    let s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0');
    return h > 0 ? h + ':' + mm + ':' + ss : mm + ':' + ss;
  }
  function timeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60e3) return 'just now';
    if (d < 3600e3) return Math.floor(d / 60e3) + 'm ago';
    if (d < 86400e3) return Math.floor(d / 3600e3) + 'h ago';
    return Math.floor(d / 86400e3) + 'd ago';
  }

  function avatar(me, size, cls) {
    const s = me && me.avatar ? me.avatar : 'm|';
    return `<span class="avatarbox ${cls || ''}" style="width:${size}px;height:${size}px">${AV.svgFor(s, size)}</span>`;
  }
  function avatarSmall(s, size) { return AV.svgFor(s, size); }

  // stat bar row used in lists
  function statMini(k, label) {
    const meta = { st: ['STR', '💪'], de: ['DEF', '🛡️'], sp: ['SPD', '⚡'], dx: ['DEX', '✋'] }[k] || [k, '·'];
    return `<span class="stat-mini" title="${label || meta[0]}"><i>${meta[1]}</i>${meta[0]}</span>`;
  }
  function bigBar(v, max, cls, w) {
    const pc = pct(v, max);
    return `<div class="bar" style="${w ? 'width:' + w : ''}"><div class="fill ${cls}" style="width:${pc}%"></div><div class="lbl">${Math.floor(v)}/${max}</div></div>`;
  }
  function timerTag(label, until, id) {
    return `<span class="countchip" data-timer="${id}" data-until="${until}">⏳ <span class="tlbl">${label}</span> <b class="mono">${fmtDur(until - Date.now())}</b></span>`;
  }
  // returns HTML that each second refreshes timers inside container#timers
  function bindTimers(root) {
    const list = $$('[data-timer]', root);
    list.forEach(el => { el._until = +(el.dataset.until); el._lab = el.querySelector('.tlbl'); el._b = el.querySelector('b'); });
  }
  function updateTimers(root) {
    $$('[data-timer]', root).forEach(el => {
      const d = el._until - Date.now();
      if (el._b) el._b.textContent = fmtDur(d);
      if (d <= 0) el.style.opacity = '.35';
    });
  }
  function toast(msg, cls, ms) {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = msg;
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s, transform .4s'; el.style.opacity = '0'; el.style.transform = 'translateY(-10px)'; setTimeout(() => el.remove(), 420); }, ms || 2400);
  }

  function spinner(label) {
    return `<div class="skeleton" style="min-height:80px"></div>${label ? '<p class="dim" style="text-align:center;color:var(--dim);font-size:12px">' + label + '</p>' : ''}`;
  }
  function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  window.U = { esc, $, $$, money, pct, fmtDur, timeAgo, avatar, bigBar, timerTag, bindTimers, updateTimers, toast, spinner, el };
})();
