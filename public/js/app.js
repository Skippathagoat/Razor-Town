/* Razor Town — client app */
(function () {
  'use strict';
  const $ = U.$, $$ = U.$$, esc = U.esc, money = U.money, pct = U.pct, fmtDur = U.fmtDur, timeAgo = U.timeAgo;

  const G = {
    me: null, view: 'city', meta: null, cache: {}, filters: { cat: 'all', market: 'buy', leader: 'rep' },
    prev: null, scene: null, stream: null, online: false, sound: localStorage.getItem('nsc_sound') !== '0',
    scroll: {}, busy: new Set(), touch: matchMedia('(pointer:coarse)').matches, authed: false
  };
  if (G.touch) document.body.setAttribute('data-touch', '1');

  const TABS = [
    { id: 'city', label: 'Home', ico: '🏙️', key: 'h' },
    { id: 'crime', label: 'Crimes', ico: '🧢', key: 'c', pulse: true },
    { id: 'attack', label: 'Attack', ico: '⚔️', key: 'a' },
    { id: 'gym', label: 'Train', ico: '🏋️', key: 't' },
    { id: 'job', label: 'Job', ico: '💼', key: 'j' },
    { id: 'market', label: 'Market', ico: '🛒', key: 'm' },
    { id: 'items', label: 'Items', ico: '🎒', key: 'i' },
    { id: 'bank', label: 'Finance', ico: '🏦', key: 'b' },
    { id: 'property', label: 'Property', ico: '🏠', key: 'y' },
    { id: 'college', label: 'College', ico: '🎓', key: 'u' },
    { id: 'merits', label: 'Merits', ico: '⭐', key: 'k' },
    { id: 'bounty', label: 'Bounties', ico: '🎯', key: 'w' },
    { id: 'casino', label: 'Betting', ico: '🎰', key: 'g' },
    { id: 'faction', label: 'Gang', ico: '🪓', key: 'f' },
    { id: 'ach', label: 'Feats', ico: '🏆', key: 'e' },
    { id: 'leaders', label: 'The Gallery', ico: '👑', key: 'l' },
    { id: 'msg', label: 'Messages', ico: '📨', key: 'n' },
    { id: 'profile', label: 'Profile', ico: '🧑‍🎤', key: 'p' },
    { id: 'help', label: 'Help', ico: '❔', key: '/' }
  ];
  const FINGER = { st: 'Strength', de: 'Defense', sp: 'Speed', dx: 'Dexterity' };
  const TRAIN_GAP = 10;   // keep in step with lib/game/engine.js
  const DIFF = { st: '💪', de: '🛡️', sp: '⚡', dx: '🖐️' };

  // ================================================================ JUICE
  const FX = {
    init() {
      this.cv = $('#fx-layer'); this.ctx = this.cv.getContext('2d');
      this.float = $('#float-layer'); this.parts = []; this.floats = [];
      const s = () => { this.cv.width = innerWidth; this.cv.height = innerHeight; };
      addEventListener('resize', s); s();
      const loop = () => { this.frame(); requestAnimationFrame(loop); };
      loop();
    },
    rect() { return { w: this.cv.width, h: this.cv.height }; },
    burst(x, y, colors, n, spd, size) {
      const r = this.rect();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (0.35 + Math.random()) * (spd || 4);
        this.parts.push({ x: x || r.w / 2, y: y || r.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, d: (0.6 + Math.random() * 0.5), c: colors[i % colors.length], s: (size || 3) * (0.6 + Math.random()), g: 0.22, rot: Math.random() * 6 });
      }
    },
    confetti() {
      const r = this.rect(); const colors = ['#e5b95e', '#c7a252', '#9c3228', '#8f2f28', '#b7a987', '#e9e0c9'];
      for (let i = 0; i < 140; i++) {
        this.parts.push({ x: Math.random() * r.w, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 2.4, vy: 2 + Math.random() * 3.2, life: 1, d: 2 + Math.random() * 1.6, c: colors[i % colors.length], s: 3 + Math.random() * 4, g: 0.05, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, sq: true });
      }
    },
    cashSprinkle(x, y) { this.burst(x, y, ['#ffd166', '#ff9f43', '#fff3c4'], 26, 3.6, 2.6); },
    splash(x, y) { this.burst(x, y, ['#c7a252', '#9c3228', '#e9e0c9'], 18, 2.6, 2.2); },
    floatText(txt, x, y, cls) {
      const el = document.createElement('div');
      el.className = 'floater ' + (cls || '');
      el.innerHTML = txt;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      this.float.appendChild(el);
      setTimeout(() => el.remove(), 1250);
    },
    floatAtEl(txt, el, cls) {
      const r = el.getBoundingClientRect();
      this.floatText(txt, r.left + r.width / 2 - 30, r.top - 8, cls);
    },
    frame() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      const parts = this.parts;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= 0.016 / p.d; p.vy += p.g; p.vx *= 0.985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr || 0;
        if (p.life <= 0 || p.y > this.cv.height + 40) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
  };
  function shakeAmp(el, px) {
    el.style.animation = 'none'; void el.offsetWidth;
    el.style.animation = `shake .45s ease`;
    el.style.setProperty('--shk', px + 'px');
  }
  // ================================================================ AUDIO (tiny synth)
  const SND = {
    ctx: null, on: G.sound,
    ac() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return this.ctx; },
    t(freq, dur, type, vol, when) {
      if (!this.on) return; const ac = this.ac(); if (!ac) return;
      const t0 = ac.currentTime + (when || 0);
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 0.2));
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    },
    click() { this.t(700, .05, 'square', .025); },
    win() { this.t(523, .12, 'square', .06); this.t(659, .12, 'square', .06, .09); this.t(784, .2, 'square', .07, .18); this.t(1046, .3, 'square', .06, .3); },
    big() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.t(f, .14, 'square', .07, i * .07)); },
    lose() { this.t(220, .2, 'sawtooth', .06); this.t(160, .3, 'sawtooth', .06, .16); },
    bust() { this.t(300, .15, 'sawtooth', .07); this.t(200, .2, 'sawtooth', .07, .12); this.t(140, .35, 'sawtooth', .07, .26); },
    cash() { this.t(1200, .06, 'sine', .05); this.t(1600, .09, 'sine', .05, .05); },
    lvl() { [392, 523, 659, 784, 1046].forEach((f, i) => this.t(f, .16, 'triangle', .09, i * .08)); },
    hit() { this.t(150, .08, 'sawtooth', .1); this.t(90, .12, 'square', .08, .01); },
    slice() { this.t(1800, .05, 'sawtooth', .03); }
  };

  // ================================================================ BOOT
  async function boot() {
    window.addEventListener('error', (e) => { showFatal(e.message); });
    window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason && e.reason.message || e.reason)));
    try { FX.init(); } catch (e) { showFatal('fx: ' + e.message); }
    $('#modal-root').addEventListener('click', onModalRoot);
    $('#toast-root'); document.body.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    try {
      await loadMeta();
      // try to resume a saved session (server returns {me:null} when logged out)
      try {
        const r = await Net.get('/api/me');
        if (r && r.me) enterGame(r.me);
        else showAuth();
      } catch (e) { showAuth(e.message || ''); }
      startOnlinePulse();
      authTicker();
    } catch (e) { showFatal('Could not reach the city: ' + e.message); }
  }
  let fatalShown = false;
  function showFatal(msg) {
    if (fatalShown) return; fatalShown = true;
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;background:#1a0f18;border:1px solid #b0453c;color:#f1e6c4;padding:10px 14px;border-radius:10px;font:12px/1.5 monospace;max-width:80vw;';
    d.textContent = 'Debug: ' + msg;
    document.body.appendChild(d);
    console.error(msg);
  }

  async function loadMeta() {
    G.meta = await Net.get('/api/meta');
  }
  async function authTicker() {
    try { const n = await Net.get('/api/world/news'); if (n.items && n.items.length) { const it = n.items[Math.floor(Math.random() * Math.min(3, n.items.length))]; const t = $('#auth-ticker'); if (t) t.textContent = it.icon + ' ' + it.message; } } catch (e) {}
  }

  // ================================================================ SCREENS
  function screen(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  }
  function showAuth(msg) {
    screen('auth'); G.authed = false;
    renderAuth(msg);
  }
  function renderAuth(msg) {
    const card = $('#auth-card');
    card.innerHTML = `
      <div class="auth-tabs">
        <button class="auth-tab on" data-auth="login">Log in</button>
        <button class="auth-tab" data-auth="register">New recruit</button>
      </div>
      <div data-authpanel="login">
        <form data-form="login">
          <div class="field"><label>Username</label><input name="u" autocomplete="username" placeholder="handle" maxlength="20" required></div>
          <div class="field"><label>Password</label><input name="p" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
          <div class="err"></div>
          <button class="btn primary big" style="width:100%" type="submit">Step into the yard →</button>
        </form>
        <div class="auth-links"><button data-goto="register">No ledger entry? Make one</button></div>
      </div>
      <div data-authpanel="register" style="display:none">
        <form data-form="register">
          <div class="field"><label>Username (login)</label><input name="u" autocomplete="username" maxlength="20" placeholder="e.g. cutler_street_alf" required></div>
          <div class="field"><label>Password</label><input name="p" type="password" autocomplete="new-password" placeholder="min 6 characters" required></div>
          <div class="err"></div>
          <button class="btn cyan big" style="width:100%" type="submit">Create my character →</button>
        </form>
        <div class="auth-links"><button data-goto="login">Known to the boss? Log in</button></div>
      </div>
      <div class="auth-foot">Your password is hashed and stored in the ledger.<br>Same account works on any device.</div>`;
    if (msg) { const err = $('.err', card); if (err) err.textContent = msg; }
    const tabs = $$('.auth-tab', card);
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.toggle('on', x === t));
      const which = t.dataset.auth;
      $('[data-authpanel="login"]', card).style.display = which === 'login' ? '' : 'none';
      $('[data-authpanel="register"]', card).style.display = which === 'register' ? '' : 'none';
    }));
    $$('[data-goto]', card).forEach(b => b.addEventListener('click', () => {
      const which = b.dataset.goto;
      tabs.forEach(x => x.classList.toggle('on', x.dataset.auth === which));
      $('[data-authpanel="login"]', card).style.display = which === 'login' ? '' : 'none';
      $('[data-authpanel="register"]', card).style.display = which === 'register' ? '' : 'none';
    }));
    $$('form[data-form]', card).forEach(form => form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const which = form.dataset.form;
      const errEl = $('.err', form);
      const u = form.u.value.trim(), p = form.p.value;
      errEl.textContent = '';
      if (which === 'register') {
        if (p.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
        try { await Net.post('/api/validate', { profile: { name: u } }); } catch (e) { errEl.textContent = e.message; return; }
        openCreator({ username: u, password: p });
      } else {
        try {
          const r = await Net.post('/api/login', { username: u, password: p });
          enterGame(r.me);
        } catch (e) { errEl.textContent = e.message; }
      }
    }));
  }

  // ------- character creator
  const CREATOR = { skin: 1, face: 0, hair: 2, shirt: 0, accent: 0, origin: 'street', name: '' };
  function openCreator(creds) {
    CREATOR.name = creds.username;
    G.creds = creds;
    screen('creator');
    renderCreator();
  }
  function avatarStr() { return [CREATOR.skin, CREATOR.face, CREATOR.hair, CREATOR.shirt, CREATOR.accent].join('|'); }
  function wearList(str) {
    return `<div class="weargrid" style="margin-top:10px;text-align:left">${AV.wear(str).map(w =>
      `<div class="slot"><span class="s-ico">${w.icon}</span><span><span class="s-slot">${w.slot}</span><span class="s-val">${esc(w.value)}</span></span></div>`).join('')}</div>`;
  }
  function renderCreator() {
    const w = $('#creator-wrap');
    const o = G.meta.origins;
    w.innerHTML = `
      <div class="creator-title">🎩 Make Your Name</div>
      <div class="creator-sub">Account <b style="color:var(--cyn)">@${esc(G.creds.username)}</b> — now give yourself a face and a start in the town.</div>
      <div class="creator-grid">
        <div class="creator-preview">
          <div style="margin:0 auto;width:150px" id="cpv">${AV.doll(avatarStr(), 150)}</div>
          <div class="preview-name" id="cpname">${esc(CREATOR.name || 'Name')}</div>
          <div class="preview-origin" id="cporigin">—</div>
          <div id="cpwear">${wearList(avatarStr())}</div>
          <p style="color:var(--dim);font-size:11px;margin-top:10px">This is how the town will see you — hat, coat and all.</p>
        </div>
        <div class="creator-steps">
          <div class="creator-panel">
            <h3>📛 Handle</h3>
            <div class="field"><input id="cname" maxlength="20" value="${esc(CREATOR.name)}" placeholder="What should the city call you?"></div>
            <div class="err" id="cname-err"></div>
          </div>
          <div class="creator-panel"><h3>🎨 Look</h3>
            ${swatches('skin', 'Skin', AV.SKINS, 'skin')}
            ${chips('face', 'Face / style', AV.FACE_FEAT.map(x => x.n), 'face')}
            ${chips('hair', 'Hair / headwear', AV.HAIRS.map(x => x.n), 'hair')}
            ${swatches('shirt', 'Jacket', AV.SHIRTS, 'shirt')}
            ${swatches('accent', 'Trinket', AV.ACCENTS, 'accent')}
          </div>
          <div class="creator-panel"><h3>🌱 Origin story</h3><div class="chiprow" id="originrow">
            ${o.map(orig => `<button class="chip origin-card ${CREATOR.origin === orig.id ? 'on' : ''}" data-origin="${orig.id}"><b>${orig.icon} ${orig.name}</b><span>${esc(orig.trait)}</span><span class="tag">starts with +${orig.bonus} ${FINGER[orig.stat]}</span></button>`).join('')}
          </div></div>
          <div class="creator-panel"><h3>📝 Tagline (optional)</h3>
            <input id="cbio" maxlength="120" placeholder="e.g. I steal from the rich, the poor, and everyone in between.">
          </div>
          <button class="btn primary big" style="width:100%" id="cgo">🎩 Walk into Razor Town</button>
          <div class="err" id="cerr"></div>
          <button class="btn ghost" style="width:100%;margin-top:8px" id="cback">← Back to login</button>
        </div>
      </div>`;
    const go = () => submitCreator();
    $('#cname').addEventListener('input', e => { CREATOR.name = e.target.value.trim(); $('#cpname').textContent = CREATOR.name || 'Name'; });
    $('#cgo').addEventListener('click', go);
    $('#cback').addEventListener('click', () => showAuth());
    $('#originrow').addEventListener('click', e => {
      const b = e.target.closest('[data-origin]'); if (!b) return;
      CREATOR.origin = b.dataset.origin;
      $$('#originrow .chip').forEach(x => x.classList.toggle('on', x === b));
      const or = o.find(x => x.id === CREATOR.origin);
      $('#cporigin').textContent = or.name + ' — +' + or.bonus + ' ' + FINGER[or.stat];
      $('#cpv').innerHTML = AV.doll(avatarStr(), 150);
      if ($('#cpwear')) $('#cpwear').innerHTML = wearList(avatarStr());
    });
    $$('[data-opt]', w).forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.opt, v = +b.dataset.v;
      CREATOR[f] = v;
      $$(`[data-opt="${f}"]`, w).forEach(x => x.classList.toggle('on', +x.dataset.v === v));
      $('#cpv').innerHTML = AV.doll(avatarStr(), 150);
      if ($('#cpwear')) $('#cpwear').innerHTML = wearList(avatarStr());
    }));
    const or = o.find(x => x.id === CREATOR.origin);
    $('#cporigin').textContent = or.name + ' — +' + or.bonus + ' ' + FINGER[or.stat];
    $('#cbio').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }
  function chips(kind, label, items, f) {
    return `<h3 style="margin-top:14px">${label}</h3><div class="chiprow" style="margin-top:8px">${items.map((it, i) => `<button type="button" class="chip ${CREATOR[f] === i ? 'on' : ''}" data-opt="${f}" data-v="${i}">${it}</button>`).join('')}</div>`;
  }
  function swatches(kind, label, colors, f) {
    return `<h3 style="margin-top:14px">${label}</h3><div class="chiprow" style="margin-top:8px">${colors.map((c, i) => `<button type="button" class="chip swatch ${CREATOR[f] === i ? 'on' : ''}" data-opt="${f}" data-v="${i}" style="background:${c}"><span style="opacity:0">x</span></button>`).join('')}</div>`;
  }
  async function submitCreator() {
    const go = $('#cgo'); const err = $('#cerr'); const nerr = $('#cname-err');
    err.textContent = ''; nerr.textContent = '';
    if (CREATOR.name.length < 2) { nerr.textContent = 'Your citizen needs a name (2+ characters).'; return; }
    if (G.creds.password.length < 6) { err.textContent = 'Password must be 6+ characters.'; return; }
    go.disabled = true; go.textContent = 'Walking in…';
    try {
      await Net.post('/api/validate', { profile: { name: CREATOR.name } });
      const r = await Net.post('/api/register', {
        username: G.creds.username, password: G.creds.password,
        profile: { name: CREATOR.name, origin: CREATOR.origin, avatar: avatarStr(), bio: $('#cbio').value }
      });
      enterGame(r.me);
    } catch (e) { err.textContent = e.message; go.disabled = false; go.textContent = '🎩 Walk into Razor Town'; }
  }

  // ================================================================ ENTER GAME
  function enterGame(me) {
    G.me = me; G.authed = true; G.prev = me;
    screen('game');
    renderHUD();
    nav('city');
    if (!me.seen_tutorial) { Net.post('/api/seen').catch(() => {}); }
    if (!G.me) return;
    startStream();
  }

  function startStream() {
    if (G.stream) return;
    G.stream = Net.stream((ev) => {
      if (ev === 'drop') { G.online = false; setOnline(); }
      else if (ev === 'open' || ev === 'hello') { G.online = true; setOnline(); }
      else if (ev === 'news') { if (G.cache.news) refreshNews(); }
    });
  }
  function stopStream() {
    if (G.stream) { try { G.stream.close(); } catch (e) {} G.stream = null; }
  }
  function setOnline() {
    const pill = $('#online-pill');
    if (pill) { pill.className = 'pill ' + (G.online ? 'online' : 'offline'); const t = $('.oltext', pill); if (t) t.textContent = G.online ? 'Live' : 'Reconnecting…'; }
  }
  function startOnlinePulse() {
    setInterval(async () => {
      if (!G.authed) return;
      try { const r = await Net.get('/api/world/online'); const el = $('#online-count'); if (el) el.textContent = r.online; }
      catch (e) {}
      if (G.view === 'city') refreshNews();
    }, 30000);
  }
  async function refreshNews() {
    try { const r = await Net.get('/api/world/news'); if (G.view === 'city' && $('#feed')) renderCityFeed(r.items); G.cache.news = r.items; }
    catch (e) {}
  }

  // ================================================================ HUD
  // slim points line across the top of the page — torn-grammar header: numbers first, money, wire, bells
  function renderHUD() {
    const me = G.me; if (!me) return;
    const jail = me.jail_until && me.jail_until > Date.now();
    const hosp = me.hosp_until && me.hosp_until > Date.now();
    const point = (id, icon, label, v, max, extra) => `
      <div class="hpoint ${id}" title="${label}: ${Math.round(v)} / ${Math.round(max)}${extra || ''}">
        <span class="hp-ico">${icon}</span><span class="hp-lbl">${label}</span>
        <span class="hp-val mono">${Math.round(v)}</span><span class="hp-max mono">/ ${Math.round(max)}</span>
        <span class="hp-bar"><span class="hp-fill ${id}" style="width:${pct(v, max)}%"></span></span>
      </div>`;
    $('#hud').innerHTML = `
      <button class="iconbtn side-burger" data-act="side_toggle" title="yard menu">☰</button>
      ${!jail && !hosp ? `<div class="hud-points">
        ${point('life', '❤', 'Life', me.life, me.max_life)}
        ${point('energy', '⚡', 'Energy', me.energy, me.max_energy, ' — refills every 30 minutes')}
        ${point('nerve', '🧠', 'Nerve', me.nerve, me.max_nerve, ' — refills every 30 minutes')}
        ${point('happy', '🙂', 'Happy', me.happy, 100)}
        ${point('xp', '⭐', 'XP', me.xpInto, me.xpNeed)}
      </div>` : `<div class="hud-lockchip">${hosp ? '🏥 In the hospital' : '⛓ In jail'} — the clock is your only friend here.</div>`}
      <div class="hud-spacer"></div>
      <div class="hud-money" title="cash on you (lootable) / branch balance">
        <span class="cash mono" id="cash-val">${money(me.money)}</span>
        <span class="banked mono" id="bank-val">🏦 ${money(me.bank)}</span>
      </div>
      <div class="hud-meta">
        <span class="hstat" title="Level"><span class="hl">LV</span><span class="hv">${me.level}</span></span>
        <span class="hstat" title="Battle rating"><span class="hl">RAT</span><span class="hv">${Math.floor(me.total)}</span></span>
        <span class="hstat" title="Reputation"><span class="hl">REP</span><span class="hv">${me.reputation.toLocaleString()}</span></span>
      </div>
      ${me.sub && me.sub.active ? `<button class="passchip" data-act="pass_modal" title="Wire Pass active${me.sub.founder ? ' — founder tier, never lapses' : ' — renew before ' + new Date(me.sub.until).toLocaleDateString()}"><span>WIRE&nbsp;PASS</span><b>${me.sub.founder ? '∞' : Math.max(1, Math.ceil((me.sub.until - Date.now()) / 86400000)) + 'd'}</b></button>` : `<button class="passchip dim" data-act="pass_modal" title="The Wire Pass — faster charge, steadier hand, friendlier brokers. $150,000 a week."><span>WIRE&nbsp;PASS</span><b>GO&nbsp;GOLD</b></button>`}
      <span class="pill online" id="online-pill" title="live events + city pulse"><span class="dot"></span><span class="oltext">Live</span></span>
      <span class="pill hud-online" title="players online right now">👥 <span id="online-count">…</span></span>
      <button class="iconbtn" data-act="chat_toggle" id="chat-btn" title="The Wire — live city chatter">💬<span class="unread-badge hidden" id="chat-badge"></span></button>
      <button class="iconbtn" data-nav="msg" title="Wire Messages${me.unread ? ' — ' + me.unread + ' unread' : ''}">📨${me.unread ? `<span class="unread-badge">${me.unread}</span>` : ''}</button>
      <button class="iconbtn ${(jail || hosp) ? 'warn' : ''}" data-act="menu" title="Menu (Esc)">☰</button>`;
    // regen + loan countdown strip — re-stamped every second
    const tline = $('#tickline');
    if (tline) tline.remove();
    if (!jail && !hosp && me.reftick) {
      $('#hud .hud-points').insertAdjacentHTML('afterend', `<div id="tickline">
        <span class="tchip" id="tick-energy" title="next energy">⚡ <b>--:--</b></span>
        <span class="tchip" id="tick-nerve" title="next nerve">🧠 <b>--:--</b></span>
        ${me.loan ? `<span class="tchip loan ${me.loan.due < Date.now() ? 'hot' : ''}" title="loan shark">🦈 ${'$' + (me.loan.owed || 0).toLocaleString()} <b id="tick-loan">--:--</b></span>` : ''}
      </div>`);
      tickClocks();
    }
    if (!G._chatUp) { G._chatUp = true; setTimeout(startChatPulse, 600); } else ensureChatDock();
  }
  // Torn-style status bar: icon and value sit inside the bar
  function hbar(id, v, max, icon, label) {
    const pc = pct(v, max);
    return `<div class="hbar ${id}" title="${label}: ${Math.round(v)} / ${max}">` +
      `<div class="hfill ${id}" style="width:${pc}%"></div>` +
      `<div class="htext"><span class="hicon">${icon}</span><span class="hval">${Math.round(v)}${id === 'xp' ? '/' + Math.round(max) : ''}</span></div></div>`;
  }
  function barBlock(id, v, max) {
    return hbar(id, v, max, id === 'life' ? '❤' : id === 'energy' ? '⚡' : id === 'nerve' ? '🧠' : '🙂', id);
  }

  // ==================== THE WIRE — live chat dock ====================
  const CHAT = { open: false, chan: 'city', last: 0, unseen: 0, timer: null };
  function ensureChatDock() {
    if ($('#chatdock')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="chatdock" class="closed">
        <div class="cd-head">
          <span class="cd-title">📡 THE WIRE</span>
          <button class="cd-tab on" data-cchat="city">CITY</button>
          <button class="cd-tab" data-cchat="gang">GANG</button>
          <span class="cd-grow"></span>
          <button class="cd-x" data-act="chat_toggle">—</button>
        </div>
        <div class="cd-feed" id="cd-feed"></div>
        <div class="cd-input">
          <input id="cd-text" maxlength="280" placeholder="broadcast…" autocomplete="off">
          <button class="btn sm cyan" data-act="chat_send">Send</button>
        </div>
      </div>`);
    $('#cd-text').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = document.querySelector('[data-act="chat_send"]'); if (b) b.click(); } });
    document.querySelectorAll('[data-cchat]').forEach(b => b.addEventListener('click', () => {
      CHAT.chan = b.dataset.cchat; CHAT.last = 0; $('#cd-feed').innerHTML = '';
      document.querySelectorAll('[data-cchat]').forEach(x => x.classList.toggle('on', x === b));
      chatPull(true);
    }));
  }
  function timeTiny(ts) { const d = new Date(ts); return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  async function chatPull(force) {
    try {
      const r = await Net.get('/api/chat?chan=' + CHAT.chan + '&since=' + CHAT.last);
      if (!r || !r.items) return;
      const feed = $('#cd-feed'); if (!feed) return;
      if (force) { feed.innerHTML = ''; CHAT.last = 0; }
      if (r.items.length === 0 && !CHAT.last && !feed.children.length) {
        feed.innerHTML = `<div class="cd-sys">static… the ${CHAT.chan === 'gang' ? 'crew wire is quiet — only your gang hears this channel' : 'city wire is quiet. Say something worth repeating'}</div>`;
        return;
      }
      for (const m of r.items) {
        CHAT.last = Math.max(CHAT.last, m.id);
        if (!document.querySelector(`#cd-feed [data-mid="${m.id}"]`)) {
          const mine = G.me && m.name === G.me.name;
          feed.insertAdjacentHTML('beforeend', `<div class="cd-msg ${mine ? 'mine' : ''}" data-mid="${m.id}">
            <span class="cd-t">${timeTiny(m.ts)}</span> <b>${esc(m.name)}</b> <span>${esc(m.body)}</span></div>`);
          if (!CHAT.open || document.hidden) { CHAT.unseen++; }
        }
      }
      while (feed.children.length > 120) feed.removeChild(feed.firstChild);
      feed.scrollTop = feed.scrollHeight;
      const badge = $('#chat-badge');
      if (badge) { badge.textContent = CHAT.unseen > 99 ? '99' : CHAT.unseen; badge.classList.toggle('hidden', CHAT.unseen === 0); }
    } catch (e) {}
  }
  function chatToggle() {
    ensureChatDock();
    CHAT.open = !CHAT.open;
    $('#chatdock').classList.toggle('closed', !CHAT.open);
    $('#chat-btn').classList.toggle('lit', CHAT.open);
    if (CHAT.open) { CHAT.unseen = 0; const badge = $('#chat-badge'); if (badge) badge.classList.add('hidden'); CHAT.last = 0; $('#cd-feed').innerHTML = ''; chatPull(true); const i = $('#cd-text'); if (i) i.focus(); }
  }
  function startChatPulse() {
    ensureChatDock();
    setInterval(() => chatPull(false), 6000);   // the wire hums whether or not the door is open
    chatPull(true);
  }

  function fmtClock(ms) { ms = Math.max(0, ms); const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function tickClocks() {
    const me = G.me; if (!me || !me.reftick) return;
    const eIn = (me.reftick.energyIn || 0), nIn = (me.reftick.nerveIn || 0);
    const eEl = $('#tick-energy b'); if (eEl) eEl.textContent = me.energy >= me.max_energy ? 'FULL' : fmtClock(eIn - (Date.now() - (G._tickAt || Date.now())));
    const nEl = $('#tick-nerve b'); if (nEl) nEl.textContent = me.nerve >= me.max_nerve ? 'FULL' : fmtClock(nIn - (Date.now() - (G._tickAt || Date.now())));
    if (me.loan) { const lEl = $('#tick-loan'); if (lEl) lEl.textContent = me.loan.due < Date.now() ? 'COLLECTING' : fmtClock(me.loan.due - Date.now()); }
  }

  // sidebar grammar: standalone Home, then three folded crews of tabs, player card pinned below
  const SIDE_GROUPS = [
    { id: 'hustle', name: 'The Hustle', ico: '🧢', tabs: ['crime', 'attack', 'gym', 'job', 'college', 'merits', 'bounty'] },
    { id: 'ledger', name: 'Money & Gear', ico: '💰', tabs: ['market', 'items', 'bank', 'property', 'casino'] },
    { id: 'crew',   name: 'The Crew & The Name', ico: '🪓', tabs: ['faction', 'ach', 'leaders', 'msg', 'profile', 'help'] }
  ];
  function renderRail() {
    const me = G.me;
    const jail = me.jail_until && me.jail_until > Date.now();
    const hosp = me.hosp_until && me.hosp_until > Date.now();
    const lock = (jail || hosp);
    const rail = $('#rail');
    if (!G.sideFold) G.sideFold = {};
    const tabOf = (id) => TABS.find(t => t.id === id);
    const carried = Object.values(me.items || {}).reduce((a, b) => a + b, 0);
    const itemBtn = (tid) => {
      const tb = tabOf(tid); if (!tb) return '';
      const disable = lock && ['crime', 'gym', 'job', 'attack', 'casino'].includes(tid);
      const badge = tid === 'items' && carried ? `<span class="rail-count neutral">${carried}</span>` : (tid === 'msg' && me.unread ? `<span class="rail-count">${me.unread}</span>` : '');
      return `<button class="rail-item ${G.view === tid ? 'on' : ''} ${disable ? 'rail-dis' : ''}" data-nav="${tid}" ${disable ? 'disabled' : ''}><span class="ico">${tb.ico}</span><span class="rl">${tb.label}</span>${badge}<span class="kbd">${tb.key}</span></button>`;
    };
    let html = itemBtn('city');
    for (const g of SIDE_GROUPS) {
      const hasCurrent = g.tabs.includes(G.view);
      const folded = G.sideFold[g.id] === true && !hasCurrent;
      const unreadHere = g.id === 'crew' && me.unread ? `<span class="rail-count">${me.unread}</span>` : '';
      html += `<button class="rail-group ${hasCurrent ? 'lit' : ''} ${folded ? 'folded' : ''}" data-sg="${g.id}"><span class="ico">${g.ico}</span><span class="rl">${g.name}</span>${unreadHere}<span class="chev">▾</span></button>
        <div class="rail-groupbody ${folded ? 'folded' : ''}" id="sg-${g.id}">${g.tabs.map(itemBtn).join('')}</div>`;
    }
    if (lock) html += `<div class="rail-section" style="color:var(--bad)">⛓ Locked (${hosp ? 'Hospital' : 'Jail'})</div>`;
    html += `<div class="rail-grow"></div>`;
    html += `<div class="profile-chip" data-nav="profile" title="your page">
      <div class="pc-top">${U.avatar(me, 34)}<div style="min-width:0"><b>${esc(me.name)}</b><span>⭐ ${me.level} · ${Math.floor(me.total)} rating</span></div></div>
      <div class="pc-funds mono">$${(me.money || 0).toLocaleString()}</div></div>`;
    rail.innerHTML = html;
    $$('#rail [data-nav]').forEach(b => b.addEventListener('click', () => { nav(b.dataset.nav); document.body.classList.remove('side-open'); }));
    $$('#rail [data-sg]').forEach(b => b.addEventListener('click', () => {
      G.sideFold[b.dataset.sg] = !(G.sideFold[b.dataset.sg] === true);
      renderRail();
    }));
    // mobile quick-row
    const mnav = $('#mobile-nav');
    const MOBILE_TABS = ['city', 'crime', 'items', 'bank', 'faction', 'msg'];
    mnav.innerHTML = MOBILE_TABS.map(tid => { const tb = tabOf(tid); return `<button class="mnav-item ${G.view === tid ? 'on' : ''}" data-nav="${tid}"><span class="ico">${tb.ico}</span><span>${tb.label}</span>${tid === 'msg' && me.unread ? `<span class="unread-badge">${me.unread}</span>` : ''}</button>`; }).join('')
      + `<button class="mnav-item" data-act="side_toggle"><span class="ico">☰</span><span>Menu</span></button>`;
    $$('#mobile-nav [data-nav]').forEach(b => b.addEventListener('click', () => nav(b.dataset.nav)));
  }

  // ================================================================ NAV
  function nav(view, arg) {
    if (!G.me) return;
    G.view = view;
    $$('.rail-item').forEach(x => x.classList.toggle('on', x.dataset.nav === view));
    $$('.mnav-item').forEach(x => x.classList.toggle('on', x.dataset.nav === view));
    $$('.rail-item').forEach(x => { if (x.disabled && ['crime','gym','job','attack','casino'].includes(x.dataset.nav)) return; });
    const v = $('#view');
    v.innerHTML = '<div class="skeleton"></div>';
    v.scrollTop = 0;
    const jail = G.me.jail_until && G.me.jail_until > Date.now();
    const hosp = G.me.hosp_until && G.me.hosp_until > Date.now();
    const renders = { city: renderCity, crime: renderCrime, attack: renderAttack, gym: renderGym, job: renderJob, market: renderMarket, items: renderItems, bank: renderBank, property: renderProperty, college: renderCollege, merits: renderMerits, bounty: renderBounty, casino: renderCasino, faction: renderFaction, ach: renderAch, leaders: renderLeaders, msg: renderMsg, profile: renderProfile, help: renderHelp };
    (renders[view] || renderCity)();
    renderRail();
    if (jail || hosp) maybeLockCover();
  }
  function maybeLockCover() {
    const v = $('#view'); const me = G.me;
    if (!$('#lock-cover')) {
      const jail = me.jail_until && me.jail_until > Date.now();
      const hosp = me.hosp_until && me.hosp_until > Date.now();
      if (!jail && !hosp) return;
      const el = document.createElement('div');
      el.id = 'lock-cover'; el.className = 'cover';
      v.parentElement.style.position = 'relative';
      v.parentElement.appendChild(el);
      if (jail) el.innerHTML = `<div class="cico">⛓️</div><h2 style="color:var(--gold)">IN CUSTODY</h2><p>You got busted. The gaol keeps you below stairs until your sentence is up — energy comes back while you wait. Spend the time plotting your comeback.</p>${U.timerTag('Time served', me.jail_until, 'jail')}`;
      else if (hosp) el.innerHTML = `<div class="cico">🚑</div><h2 style="color:var(--bad)">IN THE HOSPITAL</h2><p>A job gone wrong put you in the infirmary. Rest and recover — the nurses have seen worse.</p>${U.timerTag('Recovery', me.hosp_until, 'hosp')}`;
      U.bindTimers(el);
    }
  }

  // ================================================================ ACTION PIPELINE
  async function act(name, payload, sceneMode) {
    if (G.busy.has(name)) return;
    G.busy.add(name);
    try {
      const prevMoney = G.me ? G.me.money : 0;
      const started = Date.now();
      if (sceneMode === 'crime') showScene('crime', payload);
      else if (sceneMode === 'attack') showScene('attack', payload);
      // the action name goes LAST so a payload field can never overwrite it
      const r = await Net.post('/api/action', Object.assign({}, payload || {}, { name }));
      // minimum suspense so results land with a punch
      const wait = Math.max(0, 620 - (Date.now() - started));
      if (wait > 0) await new Promise(res => setTimeout(res, wait));
      // anything the action changed must be dropped BEFORE the re-render that applyMe triggers,
      // or the view paints from the cache and the result looks like it did not happen
      if (name === 'faction_create' || name === 'faction_join' || name === 'faction_leave') {
        G.cache.factions = null; G.cache.factionsAt = 0;
      }
      if (name === 'bounty_place' || name === 'attack') { G.cache.bounties = null; G.cache.bountiesAt = 0; }
      if (name.startsWith('bazaar')) { G.cache.bazaar = null; G.cache.bazaarAt = 0; }
      if (name.startsWith('auction')) { G.cache.auction = null; G.cache.auctionAt = 0; }
      if (name === 'attack') { G.cache.targets = null; G.cache.targetsAt = 0; }
      if (r.p) applyMe(r.p, r.res);
      if (sceneMode === 'crime') resolveCrimeScene(r);
      else if (sceneMode === 'attack') { r._gain = (G.me ? G.me.money : 0) - prevMoney; resolveAttackScene(r); }
      else if (sceneMode === 'casino') resolveCasinoScene(r);
    } catch (e) {
      U.toast('<span style="color:var(--bad)">⚠️</span> ' + esc(e.message), 'bad');
      if (e.code === 401) { showAuth('Your session expired. Log in again.'); return; }
      closeScene();
    } finally { G.busy.delete(name); }
  }

  function applyMe(meNew, res) {
    G._tickAt = Date.now();
    if (!G.me) { G.me = meNew; renderHUD(); return; }
    const old = G.me;
    // floaters
    if (res) {
      const cashDelta = meNew.money - old.money;
      if (cashDelta > 0) { SND.cash(); FX.floatAtEl('<span style="color:var(--gold);font-weight:700">+$' + cashDelta.toLocaleString() + '</span>', $('#cash-val') || document.body, 'gold'); }
      if (res.rep && res.rep > 0) U.toast(`<b>+${res.rep} rep</b> — the streets talk.`, 'good', 1800);
    }
    const meWasJail = old.jail_until && old.jail_until > Date.now();
    const jailNow = meNew.jail_until && meNew.jail_until > Date.now();
    G.me = meNew;
    renderHUD();
    // jail/hospital lifecycle
    if (jailNow && !meWasJail) { lockUI(); }
    else if (!jailNow && meWasJail) { unlockUI(); }
    reRenderCurrent(res);
  }

  // ================================================================ PROPERTY / COLLEGE / MERITS / BOUNTIES
  function renderProperty() {
    const me = G.me, v = $('#view');
    const pr = me.aproperty || { name: 'Back-to-back Terrace', upgrades: [], vault: 0, happy: 100, upkeep: 0, value: 0 };
    const props = (G.meta && G.meta.properties) || [];
    const hp = Math.round(100 * (me.happy || 0) / Math.max(1, me.max_happy || 1));
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏠 <span class="head">Pemberton &amp; Sons, Estate Agents</span></div>
      <div class="vdesc">Where you sleep sets how happy you can get, how much you can hide, and what the place costs you every day. Happiness makes training pay.</div></div>
      <div class="pill"><span>Max happy</span> <b style="color:var(--gold)">${me.max_happy || 100}</b></div></div>

      <div class="grid2">
        <div class="card"><div class="subhead">Where you live</div>
          <div style="display:flex;gap:12px;align-items:center">
            <div style="font-size:40px">${pr.icon || '🏚️'}</div>
            <div><div class="head" style="font-size:16px">${esc(pr.name)}</div>
            <div style="color:var(--mut);font-size:12px;margin-top:3px">${esc(pr.desc || '')}</div></div>
          </div>
          <div class="subhead" style="margin-top:14px">Happiness</div>
          ${barBlock('happy-mini', me.happy || 0, me.max_happy || 100)}
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-top:4px">
            <span>${Math.round(me.happy || 0)} / ${me.max_happy || 100}</span><span>upkeep $${(pr.upkeep || 0).toLocaleString()}/day</span></div>
        </div>
        <div class="card"><div class="subhead">The safe</div>
          <div class="bigstat"><div class="num" style="color:var(--cyn)">${money(me.vault || 0)}</div><div class="lab">of ${money(pr.vault || 0)} hidden away</div></div>
          <div class="grid2" style="align-items:end;gap:8px;margin-top:10px">
            <div class="field" style="margin:0"><label>Amount</label><input id="vault-amt" type="number" min="1" value="1000" step="500"></div>
            <div style="display:flex;gap:8px">
              <button class="btn ok" data-act="vault_in" ${pr.vault ? '' : 'disabled'}>Hide →</button>
              <button class="btn ghost" data-act="vault_out" ${pr.vault ? '' : 'disabled'}>← Take</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--dim);margin-top:10px">
            <span>On you: ${money(me.money)}</span><span>Resale value: ${money(pr.value || 0)}</span></div>
          ${props.length && (me.property !== 'shack') ? `<div style="margin-top:12px"><button class="btn sm danger" data-act="property_sell">Sell up and move out</button></div>` : ''}
        </div>
      </div>

      <div class="card"><div class="subhead">Improvements fitted here</div>
        ${(pr.upgrades || []).length === 0 ? `<p style="color:var(--mut);font-size:12.5px">There is nothing in this house to improve. Buy somewhere better and the estate agent will show you what can be done.</p>` :
        (pr.upgrades || []).map(u => `<div class="row" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)">
          <span style="font-size:20px">${u.icon}</span>
          <div style="flex:1"><b>${esc(u.name)}</b><div style="color:var(--mut);font-size:11.5px">${u.happy ? `+${u.happy} max happiness` : ''}${u.happy && u.vault ? ' · ' : ''}${u.vault ? `+${money(u.vault)} safe space` : ''}${u.gymPct ? ` · +${u.gymPct}% training` : ''}</div></div>
          ${u.owned ? `<span class="pill" style="color:var(--good)">Fitted</span>` :
            `<button class="btn sm" data-act="property_upgrade" data-up="${u.id}" ${me.money >= u.cost ? '' : 'disabled'}>${money(u.cost)}</button>`}
        </div>`).join('')}
      </div>

      <div class="card"><div class="subhead">On the market</div>
        ${props.map(x => {
          const owned = me.property === x.id;
          const afford = me.money >= x.price;
          return `<div class="row" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
            <span style="font-size:26px;width:34px;text-align:center">${x.icon}</span>
            <div style="flex:1">
              <b>${esc(x.name)}</b>${owned ? ' <span class="pill" style="color:var(--good)">Your address</span>' : ''}
              <div style="color:var(--mut);font-size:11.5px;margin-top:2px">${esc(x.desc)}</div>
              <div style="font-size:11.5px;color:var(--dim);margin-top:3px">🏠 ${x.happy} happy · 🧾 $${x.upkeep}/day upkeep · 🗄️ ${money(x.vault)} safe · ${(x.upgrades || []).length} improvements</div>
            </div>
            ${owned ? '' : (x.price === 0 ? '' : `<button class="btn sm ${afford ? 'ok' : ''}" data-act="property_buy" data-prop="${x.id}" ${afford ? '' : 'disabled'}>${money(x.price)}</button>`)}
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderCollege() {
    const me = G.me, v = $('#view');
    const data = (G.meta && G.meta.courses ? { courses: G.meta.courses } : { courses: [] });
    const done = me.courses_done || [];
    const c = me.course;
    const cur = c ? (data.courses.find(x => x.id === c.id) || {}) : null;
    const b = me.bonuses || {};
    const courseList = G.cache.courses || data.courses || [];
    const rows = courseList.map(x => {
      const passed = done.includes(x.id);
      const enrolled = c && c.id === x.id;
      const needCourse = x.req && x.req.course && !done.includes(x.req.course);
      const needLevel = x.req && x.req.level && me.level < x.req.level;
      const locked = needCourse || needLevel;
      return `<div class="row" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
        <span style="font-size:24px;width:32px;text-align:center">${x.icon}</span>
        <div style="flex:1">
          <b>${esc(x.name)}</b>${passed ? ' <span class="pill" style="color:var(--good)">Passed</span>' : ''}${enrolled ? ' <span class="pill" style="color:var(--cyn)">Attending</span>' : ''}
          <div style="color:var(--mut);font-size:11.5px;margin-top:2px">${esc(x.desc)}</div>
          <div style="font-size:11.5px;color:var(--gold);margin-top:3px">🎁 ${esc(x.grantText || '')}${locked ? ` · <span style="color:var(--dim)">needs ${x.req.level ? 'level ' + x.req.level : ''}${x.req.level && x.req.course ? ' and ' : ''}${x.req.course ? (data.courses.find(y => y.id === x.req.course) || {}).name : ''}</span>` : ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:12px;color:var(--dim)">${x.minutes} min</div>
          ${passed ? '' : enrolled ? `<span class="mono" id="course-timer" data-ends="${c.ends}" style="color:var(--cyn)">…</span>` :
            `<button class="btn sm ${!locked && !c && me.money >= x.cost ? 'ok' : ''}" data-act="course_start" data-course="${x.id}" ${(!locked && !c && me.money >= x.cost) ? '' : 'disabled'}>${money(x.cost)}</button>`}
        </div>
      </div>`;
    }).join('');
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎓 <span class="head">Wireside College</span></div>
      <div class="vdesc">Evening classes for working men. One at a time, fees up front, and what you learn stays with you for good. The clever ones get better at everything else.</div></div>
      <div class="pill"><span>Passed</span> <b style="color:var(--gold)">${done.length}/${courseList.length}</b></div></div>

      ${cur ? `<div class="card" style="border-color:var(--cyn)"><div class="subhead">You are attending</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:30px">${cur.icon || '📘'}</span>
          <div style="flex:1"><div class="head" style="font-size:16px">${esc(c.name || '')}</div>
          <div style="color:var(--gold);font-size:12px">${esc(cur.grantText || '')}</div></div>
          <div class="mono" id="course-timer" data-ends="${c.ends}" style="font-size:20px;color:var(--cyn)">…</div>
        </div>
        <div style="margin-top:12px"><button class="btn sm danger" data-act="course_quit">Walk out</button></div></div>` : ''}

      <div class="card"><div class="subhead">What your learning does for you</div>
        <div class="grid2" style="gap:8px">
          <div class="kv"><span>Crime success</span><b>+${Math.round((b.crimePct || 0) * 10) / 10}%</b></div>
          <div class="kv"><span>Training gains</span><b>+${b.gymPct || 0}%</b></div>
          <div class="kv"><span>Sentence length</span><b>${b.jailPct || 0}%</b></div>
          <div class="kv"><span>Property prices</span><b>−${b.propDiscPct || 0}%</b></div>
        </div></div>

      <div class="card"><div class="subhead">The curriculum</div>${rows}</div>`;
    tickCourse();
  }
  function tickCourse() {
    const el = $('#course-timer');
    if (!el) return;
    const ends = +el.dataset.ends;
    const left = ends - Date.now();
    el.textContent = left > 0 ? fmtDur(left) : 'finishing…';
  }

  function renderMerits() {
    const me = G.me, v = $('#view');
    const perks = (G.meta && G.meta.meritPerks) || [];
    const took = me.perks || {};
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">⭐ <span class="head">Merits</span></div>
      <div class="vdesc">A life on the make teaches a man things. Every level earns a merit; spend them here and the gain is permanent.</div></div>
      <div class="pill"><span>Unspent</span> <b style="color:var(--gold)">${me.merits || 0}</b></div></div>
      <div class="grid2">
        <div class="card"><div class="bigstat"><div class="num" style="color:var(--gold)">${me.merits || 0}</div><div class="lab">merit points to spend</div></div></div>
        <div class="card"><div class="bigstat"><div class="num" style="color:var(--cyn)">${Object.values(took).reduce((n, x) => n + x, 0)}</div><div class="lab">perks already taken</div></div></div>
      </div>
      <div class="card"><div class="subhead">Perk list</div>
        ${perks.map(k => {
          const taken = took[k.id] || 0, maxed = taken >= k.max;
          return `<div class="row" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)">
            <span style="font-size:22px;width:30px;text-align:center">${k.icon}</span>
            <div style="flex:1"><b>${esc(k.name)}</b>
              <div style="color:var(--mut);font-size:11.5px">${esc(k.desc)} · ${taken}/${k.max} taken</div></div>
            <button class="btn sm ${(me.merits || 0) > 0 && !maxed ? 'ok' : ''}" data-act="merit_buy" data-perk="${k.id}" ${(me.merits || 0) > 0 && !maxed ? '' : 'disabled'}>${maxed ? 'Maxed' : 'Take (1)'}</button>
          </div>`;
        }).join('')}
      </div>`;
  }

  async function renderBounty() {
    const me = G.me, v = $('#view');
    if (!G.cache.bounties || Date.now() - (G.cache.bountiesAt || 0) > 20000) {
      try { G.cache.bounties = await Net.get('/api/world/bounties'); G.cache.bountiesAt = Date.now(); }
      catch (e) { G.cache.bounties = { list: [], total: 0 }; }
    }
    // anyone in town can have a price put on them — this is not the strength-filtered hunt list
    if (!G.cache.citizens || Date.now() - (G.cache.citizensAt || 0) > 30000) {
      try { const r = await Net.get('/api/world/leaders?kind=rep'); G.cache.citizens = (r.list || []).filter(x => !x.isBot); G.cache.citizensAt = Date.now(); }
      catch (e) { G.cache.citizens = []; }
    }
    const targets = (G.cache.citizens || []).filter(x => x.name !== me.name);
    const data = G.cache.bounties || { list: [], total: 0 };
    const mine = data.list.find(b => b.mine);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎯 <span class="head">The Bounty Board</span></div>
      <div class="vdesc">Money on a name, paid to whoever puts that man in hospital. Take the whole pot — the board keeps a 5% cut.</div></div>
      <div class="pill"><span>On the board</span> <b style="color:var(--gold)">${money(data.total)}</b></div></div>

      ${mine ? `<div class="card" style="border-color:var(--bad)"><div class="subhead">There is money on your head</div>
        <div class="bigstat"><div class="num" style="color:var(--bad)">${money(mine.total)}</div><div class="lab">keep your life topped up and stay out of the open</div></div></div>` : ''}

      <div class="card"><div class="subhead">Post a price</div>
        <div class="grid2" style="align-items:end;gap:8px">
          <div class="field" style="margin:0"><label>Target</label><select id="bo-target">${targets.map(t => `<option value="${t.id}">${esc(t.name)} — lvl ${t.level} · ⭐${t.rep != null ? t.rep : t.total}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label>Amount (min $500)</label><input id="bo-amt" type="number" min="500" step="500" value="5000"></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12.5px;color:var(--mut)"><input id="bo-anon" type="checkbox"> Put it up anonymously</label>
        <div style="margin-top:12px"><button class="btn ok" data-act="bounty_place" ${targets.length ? '' : 'disabled'}>Place bounty</button></div>
      </div>

      <div class="card"><div class="subhead">Wanted</div>
        ${data.list.length === 0 ? `<p style="color:var(--mut);font-size:12.5px">The board is empty. Nobody has upset anybody yet — or nobody with money.</p>` :
        data.list.map(b => `<div class="row" style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--line)">
          <span style="font-size:22px">${b.status === 'hospital' ? '🏥' : b.status === 'jail' ? '🔒' : '🎯'}</span>
          <div style="flex:1"><b>${esc(b.name)}</b>${b.mine ? ' <span class="pill" style="color:var(--bad)">You</span>' : ''}
            <div style="color:var(--mut);font-size:11.5px">${b.entries.length} reward${b.entries.length === 1 ? '' : 's'} · last from ${esc(b.entries[b.entries.length - 1].from)} · ${b.status === 'hospital' ? 'in hospital — pot is collectable' : b.status === 'jail' ? 'in jail' : 'walking free'}</div></div>
          <div style="text-align:right"><b style="color:var(--gold)">${money(b.total)}</b></div>
          ${b.status === 'hospital' ? `<span class="pill" style="color:var(--dim)">in hospital</span>`
            : b.status === 'jail' ? `<span class="pill" style="color:var(--dim)">in jail</span>`
            : b.mine ? `<span class="pill" style="color:var(--bad)">your head</span>`
            : `<button class="btn sm danger" data-act="attack" data-tid="${b.id}">Collect</button>`}
        </div>`).join('')}
        <p style="color:var(--dim);font-size:11.5px;margin-top:10px">Collect by beating the target in a fight and putting them in the hospital. The pot is paid out instantly.</p>
      </div>`;
  }

  function reRenderCurrent(res) {
    const keeps = { city: renderCity, crime: renderCrime, attack: renderAttack, gym: renderGym, job: renderJob, market: renderMarket, items: renderItems, bank: renderBank, property: renderProperty, college: renderCollege, merits: renderMerits, bounty: renderBounty, casino: renderCasino, faction: renderFaction, ach: renderAch, profile: renderProfile };
    const fn = keeps[G.view];
    const v = $('#view');
    const top = v.scrollTop;
    if (fn) fn();
    if (G.view !== 'attack' && G.view !== 'leaders' && G.view !== 'msg') v.scrollTop = top;
    if (res && res.levelUps && res.levelUps > 0) levelPop(res.levelUps);
    if (res && res.ach && res.ach.length) res.ach.forEach(showAchievement);
  }
  function lockUI() { if (!$('#lock-cover')) { maybeLockCover(); renderRail(); } }
  function unlockUI() { const c = $('#lock-cover'); if (c) c.remove(); renderRail(); reRenderCurrent(); }
  function levelPop(n) {
    SND.lvl(); FX.confetti();
    const el = document.createElement('div'); el.className = 'levelpop';
    el.innerHTML = `<div class="lvl">LEVEL ${G.me.level}</div><div class="lvlsub">${n > 1 ? n + ' levels in one night!' : 'A new chapter of your legend'}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
  function showAchievement(id) {
    if (!G.meta) return;
    const d = G.meta.achievements[id]; if (!d) return;
    SND.big();
    const el = document.createElement('div'); el.className = 'ach-pop';
    el.innerHTML = `<div class="big">${d.icon}</div><div><b>Feat unlocked</b><span>${esc(d.name)} — ${esc(d.desc)}</span></div>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition = 'all .5s'; el.style.opacity = '0'; el.style.transform = 'translateX(60px)'; setTimeout(() => el.remove(), 520); }, 3800);
    if (G.view === 'ach') renderAch();
  }

  // ================================================================ SCENES
  const sceneState = { type: null, seq: null, running: false };
  function sceneEl() { return $('#modal-root'); }
  function showScene(type, payload) {
    const root = sceneEl();
    if (sceneState.running) return;
    sceneState.running = true;
    sceneState.type = type;
    root.innerHTML = '';
    const me = G.me;
    const jail = me.jail_until && me.jail_until > Date.now();
    const hosp = me.hosp_until && me.hosp_until > Date.now();
    if (type === 'crime') {
      const c = G.meta.crimes.find(x => x.id === payload.crimeId);
      root.innerHTML = `<div class="modal scene active"><div class="scene-card ${(jail||hosp)?'lose':''}"><div class="scene-title" style="font-size:26px">${c ? esc(c.name) : ''}</div>
        <div class="scene-sub">${jail ? 'Hold up — you are in custody!' : hosp ? 'You are still in the hospital!' : 'working the angle…'}</div>
        ${(jail||hosp)?'':`<button class="btn danger" data-act="skip-scene">hurry it up</button>`}
        </div></div>`;
    } else if (type === 'attack') {
      root.innerHTML = `<div class="modal scene active"><div class="scene-card"><div class="scene-title" style="font-size:24px">⚔️ Street fight</div><div class="scene-sub">Fists up. Brains out.</div><div class="spin" style="font-size:44px;display:inline-block">⚔️</div><p style="color:var(--mut);font-size:12px;margin-top:8px">reading your opponent…</p></div></div>`;
    }
  }
  function closeScene() {
    sceneState.running = false;
    sceneEl().innerHTML = '';
  }

  function resolveCrimeScene(r) {
    const root = sceneEl();
    const res = r.res;
    const c = G.meta.crimes.find(x => x.id === res.id);
    if (!c) { closeScene(); applyMe(r.p, res); return; }
    if (res.busted === 'jail') {
      SND.bust(); shakeAmp($('#game-body'), 8); FX.burst(undefined, undefined, ['#b0453c', '#e5b95e', '#e9e0c9'], 40, 5, 4);
      root.innerHTML = `<div class="modal scene active"><div class="scene-card lose"><div class="scene-title">NICKED!</div>
        <div class="scene-sub">Sirens. Cuffs. The whole crew scatters.</div>
        <p style="color:var(--bad);font-weight:700">Sent to jail for ${fmtDur(res.jailMin * 60000)}.</p>
        <p style="color:var(--mut);font-size:12.5px;margin-top:8px">Time in the holding block restores your energy — plan your next move.</p>
        <div class="scene-actions"><button class="btn primary" data-act="close-scene">Accept my fate</button></div></div></div>`;
    } else if (res.busted === 'hospital') {
      SND.bust();
      root.innerHTML = `<div class="modal scene active"><div class="scene-card lose"><div class="scene-title">IN THE INFIRMARY</div>
        <div class="scene-sub">You got caught in the crossfire.</div><p style="color:var(--bad)">Hospitalized for ${fmtDur(res.jailMin * 60000)}.</p>
        <div class="scene-actions"><button class="btn primary" data-act="close-scene">Rest up</button></div></div></div>`;
    } else if (res.ok) {
      SND.win();
      const big = res.cash >= 20000;
      FX.cashSprinkle(); if (big) { FX.confetti(); shakeAmp($('#game-body'), 5); }
      const loot = (res.loot || []).map(id => `<span class="lootchip" style="animation-delay:.1s">${G.meta.items[id].icon} ${esc(G.meta.items[id].name)}</span>`).join('');
      const spree = res.spree > 0 ? `<p style="color:var(--org);font-weight:700">🔥 Spree x${res.spree}${res.bonus ? ' <span style="color:var(--gold)">(+$' + res.bonus.toLocaleString() + ' bonus)</span>' : ''}</p>` : '';
      root.innerHTML = `<div class="modal scene active"><div class="scene-card win ${big ? 'jackpot' : ''}">
        <div class="scene-title">${big ? 'THE BIG ONE!' : 'MADE!'}</div>
        <div class="scene-sub" style="color:var(--mut)">${esc(c.name)}</div>
        <div class="scene-cash mono">+${money(res.cash)}</div>
        ${spree}
        <div class="scene-loot">${loot}</div>
        <p style="color:var(--dim);font-size:12px">+${res.xp} XP · +${Math.round(res.cash / 40)} reputation</p>
        <div class="scene-actions"><button class="btn primary" data-act="close-scene">Keep moving →</button>
        <button class="btn ghost" data-act="again-crime" data-crime="${c.id}">Do it again</button></div></div></div>`;
    } else {
      SND.lose(); FX.burst(undefined, undefined, ['#8a87a0', '#5a5a70'], 16, 2.5, 3);
      root.innerHTML = `<div class="modal scene active"><div class="scene-card lose"><div class="scene-title">CLUMSY!</div>
        <div class="scene-sub">${esc(c.name)}</div>
        <p style="color:var(--mut);font-size:13px">The moment slipped. No payout, no witnesses… this time.</p>
        <div class="scene-actions"><button class="btn primary" data-act="close-scene">Shake it off</button></div></div></div>`;
    }
  }
  function resolveAttackScene(r) {
    const res = r.res;
    const root = sceneEl();
    if (res.win) { SND.win(); FX.cashSprinkle(); }
    else { SND.lose(); shakeAmp($('#game-body'), 6); }
    const gain = r._gain || 0;
    root.innerHTML = `<div class="modal scene active"><div class="scene-card ${res.win ? 'win' : 'lose'}">
      <div class="scene-title">${res.win ? 'YOU WIN' : 'WALLOPED'}</div>
      <div class="scene-sub">${esc(res.msg)}</div>
      ${res.win && gain > 0 ? `<div class="scene-cash mono">+${money(gain)}</div>` : ''}
      <p style="color:var(--dim);font-size:12.5px">A ${res.rounds}-round scrap under the gas lamps.</p>
      <div class="scene-actions"><button class="btn primary" data-act="close-scene">Walk away</button></div></div></div>`;
  }
  function resolveCasinoScene(r) {
    const res = r.res || {};
    if (res.game && res.game !== 'greyhound') {
      // card-and-dice games resolve right on the table, not in a modal
      CAS.res = res;
      if (res.win) { SND.win(); } else SND.lose();
      if (res.stage === 'settled' && res.win && res.pay >= res.bet * 4) FX.confetti();
      renderCasino();
      const st = $('#cas-stage');
      if (st) st.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    const root = sceneEl();
    if (res.win) { SND.win(); FX.confetti(); }
    else { SND.lose(); }
    const mult = (res.mult || 0);
    root.innerHTML = `<div class="modal scene active"><div class="scene-card ${res.win ? (mult > 2.4 ? 'jackpot' : 'win') : 'lose'}">
      <div class="scene-title">${res.win ? 'CASHED OUT' : 'CRASH!'}</div>
      <div class="scene-sub">The Greyhound Dash · your run hit <b style="color:var(--cyn)">${mult.toFixed(2)}x</b> before the crash at ${(res.crash || 0).toFixed(2)}x</div>
      ${res.win ? `<div class="scene-cash">${money(res.pay)}</div>` : `<p style="color:var(--bad);font-weight:700">You lost ${money(res.bet)}.</p>`}
      <div class="scene-actions"><button class="btn primary" data-act="close-scene">Leave the floor</button></div></div></div>`;
  }

  // ================================================================ VIEWS
  // ---- HOME
  function renderCity() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const origin = m.origins.find(o => o.id === me.origin);
    const inJail = me.jail_until && me.jail_until > Date.now();
    const inHosp = me.hosp_until && me.hosp_until > Date.now();
    const ctab = G.filters.city || 'yard';
    if (ctab === 'shops') { renderShopsInto(v); return; }
    if (ctab === 'board') { renderMissionsInto(v); return; }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏙️ <span class="head">RAZOR TOWN</span></div>
      <div class="vdesc">${inJail ? 'You are behind bars — your time will pass.' : inHosp ? 'You are recovering in the hospital.' : 'The night is young and the yards are full of opportunity.'}</div></div>
      <div class="pill online"><span class="dot"></span><span class="oltext">The yard, live</span></div>
      <div class="filterrow">
        <button class="minitab ${ctab === 'yard' ? 'on' : ''}" data-fil="city" data-v="yard">🏙️ The Yard</button>
        <button class="minitab ${ctab === 'shops' ? 'on' : ''}" data-fil="city" data-v="shops">🏬 Corner Shops</button>
        <button class="minitab ${ctab === 'board' ? 'on' : ''}" data-fil="city" data-v="board">🗃️ Mission Board</button>
      </div></div>

      ${!me.seen_tutorial ? `
      <div class="card tut"><div class="vtitle" style="font-size:15px">🎯 <span class="head" style="font-size:15px">Your first 60 seconds</span></div>
        <p style="color:var(--mut);font-size:13px;margin:8px 0 12px">Every legend starts somewhere. Start a street crime — if you have the nerve. Crude but profitable.</p>
        <button class="btn cyan" data-nav="crime">Hit the streets now →</button></div>` : ''}

      <div class="grid2">
        <div class="card"><div class="kv"><span class="k">Level</span><span class="v">${me.level}</span></div>
          <div style="margin:6px 0 10px">${hbar('xp', me.xpInto, me.xpNeed, '⭐', 'Experience')}</div>
          <div class="kv"><span class="k">Reputation (score)</span><span class="v" style="color:var(--gold)">${me.reputation.toLocaleString()}</span></div>
          <div class="kv"><span class="k">Rank on city</span><span class="v" style="color:var(--cyn)" id="rank-self">…</span></div>
          <div class="kv"><span class="k">Gang</span><span class="v">${me.faction ? 'member' : '<span style="color:var(--dim)">— join or found one</span>'}</span></div></div>

        <div class="card"><div style="display:flex;align-items:center;gap:14px">
          <div style="width:86px;flex-shrink:0" data-act="editlook" role="button" title="Change your look">${AV.doll(me.avatar, 86)}</div>
          <div style="min-width:0"><div class="head" style="font-size:17px">${esc(me.name)}</div>
          <div style="color:var(--cyn);font-size:11px;text-transform:uppercase;letter-spacing:1px">${origin ? origin.icon + ' ' + origin.name : ''}</div>
          <div style="color:var(--dim);font-size:11.5px;margin-top:3px">${esc(me.bio || 'No tagline. Mysterious.')}</div></div></div>
          <div style="margin-top:10px"><span class="adv"><i></i> Boosters ${me.boosters && Object.keys(me.boosters).length ? 'active' : 'inactive'}</span></div>
        </div>
      </div>

      <div class="grid2">
        <div class="card"><div class="subhead" style="margin-bottom:8px">Combat stats</div>
          ${statLine('st', me.stats.st)}${statLine('de', me.stats.de)}${statLine('sp', me.stats.sp)}${statLine('dx', me.stats.dx)}
          <div class="kv"><span class="k">Battle rating</span><span class="v" style="color:var(--cyn)">⭐ ${me.total}</span></div></div>
        <div class="card"><div class="subhead" style="margin-bottom:8px">This life, so far</div>
          <div class="kv"><span class="k">Crimes committed</span><span class="v">${me.total_crimes}</span></div>
          <div class="kv"><span class="k">Successful</span><span class="v" style="color:var(--ok)">${me.total_success}</span></div>
          <div class="kv"><span class="k">Busted</span><span class="v" style="color:var(--bad)">${me.total_fail}</span></div>
          <div class="kv"><span class="k">Fights won</span><span class="v">${me.wins}<span style="color:var(--dim)"> / ${me.losses}</span></span></div>
          <div class="kv"><span class="k">Net worth</span><span class="v" style="color:var(--gold)">${money(me.money + me.bank)}</span></div></div>
      </div>

      <div class="card"><div class="subhead" style="margin-bottom:4px">Town wire</div><div id="feed"></div></div>`;
    // rank chip
    Net.get('/api/world/leaders?kind=rep').then(r => {
      const el = $('#rank-self'); if (!el) return;
      if (r.me) el.textContent = '#' + r.me.rank + ' of ' + r.me.of;
      else el.textContent = 'unranked';
    }).catch(() => {});
    renderCityFeed();
    U.bindTimers(v);
  }
  function statLine(k, val) {
    const eff = G.me.boosters && G.me.boosters[k];
    const b = eff ? ` <span class="adv" style="font-size:9.5px"><i></i>×1.5</span>` : '';
    return `<div class="kv"><span class="k">${DIFF[k]} ${FINGER[k]}</span><span class="v">${Math.floor(val)}${b}</span></div>`;
  }
  function renderCityFeed(items) {
    const el = $('#feed'); if (!el) return;
    const list = items || (G.cache.news || []);
    if (!list.length) { el.innerHTML = '<p style="color:var(--dim);font-size:12px">The wire is quiet… too quiet.</p>'; return; }
    el.innerHTML = list.slice(0, 9).map(n => `<div class="feed-item"><span class="fi">${n.icon || '📰'}</span><div><div>${esc(n.message)}</div><div style="color:var(--dim);font-size:10.5px">${timeAgo(n.ts)}</div></div></div>`).join('');
  }

  // ---- CRIMES
  function renderCrime() {
    const me = G.me, m = G.meta;
    const cats = [['all', 'All jobs', '🃏'], ...Object.entries(m.crimeCats).map(([id, c]) => [id, (c && c.name) || id, (c && c.icon) || '•'])];
    const cat = G.filters.cat;
    const v = $('#view');
    const jail = me.jail_until && me.jail_until > Date.now();
    const hosp = me.hosp_until && me.hosp_until > Date.now();
    const list = m.crimes.filter(c => cat === 'all' || c.cat === cat);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🧢 <span class="head">Crime Ring</span></div>
      <div class="vdesc">Every job costs nerve + energy. Higher skills raise your odds and payout. Success keeps a spree alive — busts end it.</div></div>
      ${!jail && !hosp ? `<div class="pill"><span style="color:var(--mut)">🧠 Nerve</span> <b class="mono" style="color:var(--ok)">${Math.floor(me.nerve)}</b><span style="color:var(--dim)">/</span><b class="mono">${me.max_nerve}</b></div>` : ''}</div>
      <div class="filterrow">${cats.map(([id, name, ic]) => `<button class="minitab ${cat === id ? 'on' : ''}" data-fil="cat" data-v="${id}">${ic} ${name}</button>`).join('')}</div>
      <div class="card" style="background:none;border:none;padding:0">
      ${list.map((c) => crimeRow(c, me)).join('') || '<p style="color:var(--dim)">Nothing here yet.</p>'}
      </div>`;
    U.bindTimers(v);
  }
  function crimeRow(c, me) {
    const nerveCost = c.nerve;
    const energyCost = 3 + c.nerve * 2;
    const needs = [];
    const eff = {};
    if (c.req.st) eff.st = Math.max(0, me.stats.st - c.req.st);
    if (c.req.de) eff.de = Math.max(0, me.stats.de - c.req.de);
    if (c.req.sp) eff.sp = Math.max(0, me.stats.sp - c.req.sp);
    if (c.req.dx) eff.dx = Math.max(0, me.stats.dx - c.req.dx);
    const reqStats = ['st', 'de', 'sp', 'dx'].filter(k => c.req[k]).map(k => `${c.req[k]} ${FINGER[k].slice(0, 3)}`).join(' · ');
    const meetLvl = me.level >= (c.lvl || 1);
    const hasNerve = me.nerve >= nerveCost;
    const hasEnergy = me.energy >= energyCost;
    const canDo = meetLvl && hasNerve && hasEnergy && !(me.jail_until) && !(me.hosp_until);
    const chance = crimeChance(me, c);
    const highRisk = !meetLvl && (c.req.dx || 0) > me.stats.dx + 40;
    const banner = !meetLvl ? 'lvl ' + c.lvl : '';
    return `<button class="crime ${canDo ? '' : 'dim'}" data-act="crime" data-crime="${c.id}" ${canDo ? '' : 'disabled'}>
      <div class="req ${meetLvl ? 'reqmeet' : 'reqmiss'}"><span>${c.nerve}</span><small>nerve</small></div>
      <div class="main"><b>${esc(c.name)}${banner ? ` <span style="color:var(--bad)">(${banner})</span>` : ''}</b>
      <span>${esc(c.blurb)}</span>
      <span style="color:var(--dim)">⚡ ${energyCost} energy · ${reqStats ? 'needs ' + reqStats : 'no stat req'}</span></div>
      <div class="cmeta"><div class="pay mono">${money(c.cash[0])}–${money(c.cash[1])}</div>
      <div class="chance"><i class="${chance >= 60 ? 'ok' : chance >= 35 ? 'gold' : 'bad'}" style="width:${Math.min(100, chance)}%;background:${chance >= 60 ? 'var(--ok)' : chance >= 35 ? 'var(--gold)' : 'var(--bad)'}"></i></div>
      <div class="cost" style="color:${chance >= 60 ? 'var(--ok)' : chance >= 35 ? 'var(--gold)' : 'var(--bad)'}">${Math.round(chance)}% odds</div></div></button>`;
  }
  function crimeChance(me, c) {
    let ch = c.base;
    if (c.req.dx) ch += Math.min(30, (me.stats.dx - c.req.dx) * 0.9);
    if (c.req.sp) ch += Math.min(20, (me.stats.sp - c.req.sp) * 0.8);
    if (c.req.st) ch += Math.min(15, (me.stats.st - c.req.st) * 0.6);
    if (c.req.de) ch += Math.min(12, (me.stats.de - c.req.de) * 0.5);
    return Math.max(4, Math.min(98, ch));
  }

  // ---- ATTACK
  async function renderAttack() {
    const v = $('#view');
    const me = G.me;
    if (!G.cache.targets || Date.now() - (G.cache.targetsAt || 0) > 15000) {
      v.innerHTML = U.spinner('Scanning the streets for rivals…');
      try { const r = await Net.get('/api/attacks'); G.cache.targets = r.targets; G.cache.targetsAt = Date.now(); }
      catch (e) { v.innerHTML = `<div class="card"><p style="color:var(--bad)">${esc(e.message)}</p></div>`; return; }
    }
    const list = G.cache.targets;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">⚔️ <span class="head">Hunt</span></div>
      <div class="vdesc">Pick a target close to your strength. Winners take a cut of the loser's cash. Getting jumped by a real player hurts twice.</div></div>
      <div class="pill"><span>Your rating</span> <b style="color:var(--cyn)">⭐ ${me.total}</b></div></div>
      ${list.length === 0 ? `<div class="card" style="text-align:center">
        <div style="font-size:34px">🥊</div>
        <div class="head" style="font-size:16px;margin-top:6px">Nobody worth hitting</div>
        <p style="color:var(--mut);font-size:13px;margin-top:8px">There is nobody else in town right now — the yards are empty. Rivals show up here the moment another player walks in. Until then, keep working jobs and building your name.</p>
        <div style="margin-top:12px"><button class="btn cyan" data-nav="crime">Run some jobs instead →</button></div>
      </div>` : ''}
      <div class="card" style="background:none;border:none;padding:0">
        ${list.map(t => {
          const gap = t.total - me.total;
          const lvl = t.level;
          const d = gap <= 3 ? 'easy' : gap <= 12 ? 'med' : 'hard';
          const dl = gap <= 3 ? 'winnable' : gap <= 12 ? 'even fight' : 'dangerous';
          return `<button class="targetrow" data-act="attack" data-tid="${t.acc_id}">
            <span style="width:44px;height:44px;flex-shrink:0">${AV.svgFor(t.avatar, 44)}</span>
            <div class="nm"><b>${esc(t.name)}${t.isBot ? '' : ' <span style="color:var(--cyn);font-size:9px;letter-spacing:1px">● ONLINE</span>'}</b>
            <span>lvl ${t.level} · ⭐${t.total} · ${t.wins} wins</span></div>
            <div class="cmeta" style="text-align:right"><div class="pay" style="color:var(--gold)">${t.isBot ? money(t.cash) + ' loot' : 'player'}</div>
            <span class="pdiff ${d}">${dl}</span></div>
          </button>`;
        }).join('')}
      </div>`;
  }

  // ---- GYM
  function renderGym() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const gym = m.gyms.filter(g => me.level >= g.lvl).map(g => g).pop() || m.gyms[0];
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏋️ <span class="head">The Gym</span></div>
      <div class="vdesc">$250 and 12 energy a session. Since the yards emptied there is no easy money in fighting — a harder body is how you survive the ones who come looking.</div></div>
      <div class="pill"><span>Energy</span> <b class="mono" style="color:var(--gold)">${Math.floor(me.energy)}</b><span style="color:var(--dim)">/</span><b>${me.max_energy}</b></div></div>
      <div class="card"><div class="subhead">Where are you training?</div><p style="color:var(--mut);font-size:13px">${esc(gym.name)} — ${esc(gym.desc)}</p>
      <p style="color:var(--dim);font-size:11.5px;margin-top:4px">Better gyms unlock as you level (${m.gyms.map(g => g.name + ' lvl ' + g.lvl).join(' · ')}).</p>
      <p style="color:var(--mut);font-size:12px;margin-top:6px">The house rule: you can push one skill up to <b>${TRAIN_GAP}</b> ahead of your best other skill. Past that the trainers send you away until the rest have caught up — so train everything, not just your favourite.</p></div>
      <div class="grid2">
        ${['st','de','sp','dx'].map(k => {
          const others = ['st','de','sp','dx'].filter(o => o !== k);
          const lagging = others.reduce((a, o) => (me.stats[a] <= me.stats[o] ? a : o), others[0]);
          const ahead = Math.round(me.stats[k] - Math.max(...others.map(o => me.stats[o])));
          const lvlOk = me.stats[k] <= Math.max(...others.map(o => me.stats[o])) + TRAIN_GAP;
          const myEff = me.boosters && me.boosters[k];
          const note = lvlOk
            ? (ahead > 0 ? `${ahead} ahead of the pack — worth evening out soon.` : 'In step with the rest. Every session pays full.')
            : `${FINGER[k]} is ${ahead} ahead of the rest. Train ${FINGER[lagging]} next, then come back to this.`;
          return `<div class="card" style="text-align:center"><div style="font-size:30px">${DIFF[k]}</div>
          <div class="head" style="font-size:16px">${FINGER[k]}</div>
          <div class="bigstat" style="padding:8px"><div class="num" style="font-size:40px">${Math.floor(me.stats[k])}</div></div>
          ${myEff ? `<span class="adv" style="margin-bottom:8px"><i></i> boosted ×${myEff.mult}</span>` : ''}
          <div style="margin:6px 0"><button class="btn primary" data-act="train" data-stat="${k}" data-gym="${gym.id}" ${lvlOk && !(me.jail_until) && !(me.hosp_until) ? '' : 'disabled'}>Train ${FINGER[k].slice(0,3)}</button></div>
          <p style="color:${lvlOk ? 'var(--mut)' : 'var(--bad)'};font-size:11px">${note}</p></div>`;
        }).join('')}
      </div>`;
  }

  // ---- JOB
  function renderJob() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const job = me.job ? m.jobs.find(j => j.id === me.job) : null;
    let html = '<div class="vhead"><div><div class="vtitle">💼 <span class="head">Day Jobs</span></div>' +
      '<div class="vdesc">Honest money to bankroll the dishonest kind. Working a shift costs 12 energy.</div></div></div>';
    if (job) {
      html += '<div class="card panel-gold"><div class="subhead" style="color:var(--gold)">Current job</div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin:8px 0"><span style="font-size:28px">🧾</span><b style="font-size:17px">' + esc(job.name) + '</b></div>' +
        '<div class="kv"><span class="k">Shift pay</span><span class="v" style="color:var(--gold)">~' + money(job.base) + '</span></div>' +
        '<div class="kv"><span class="k">Shifts worked here</span><span class="v">' + me.total_shift + '</span></div>' +
        '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn ok" data-act="work">Work a shift (⚡12)</button>' +
        '<button class="btn ghost" data-act="job_quit">Quit</button></div></div>';
    } else {
      html += '<div class="card"><div class="subhead">Available jobs</div>' +
        '<p style="color:var(--mut);font-size:12.5px;margin:4px 0 8px">Higher-tier jobs pay better and open as you level.</p></div>';
      for (const j of m.jobs) {
        const apply = me.level >= j.minLvl
          ? '<button class="btn sm buybtn" data-act="job_apply" data-job="' + j.id + '">Apply</button>'
          : '<span class="pdiff hard">lvl ' + j.minLvl + '</span>';
        html += '<div class="itemrow"><span class="ic">' + (j.tier === 'white' ? '👔' : '🔧') + '</span>' +
          '<div class="nm"><b>' + esc(j.name) + '</b><small>' + esc(j.desc) + ' · requires level ' + j.minLvl + '</small></div>' +
          '<div class="qtychip" style="color:var(--gold)">' + money(j.base) + '/shift</div>' + apply + '</div>';
      }
    }
    v.innerHTML = html;
  }

  // ---- MARKET
  function renderMarket() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const tab = G.filters.market;
    if (tab === 'pawn') { renderPawnInto(v, me, m); return; }
    const ids = Object.keys(m.items);
    const goods = ids.filter(id => tab === 'buy' ? typeof m.items[id].buy === 'number' : typeof m.items[id].sell === 'number' && me.items[id]);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🛒 <span class="head">Black Market</span></div>
      <div class="vdesc">Everything is legal somewhere. Prices are set by the fences — no refunds, no receipts.</div></div>
      <div class="pill"><span>Cash</span> <b class="mono" style="color:var(--gold)">${money(me.money)}</b></div></div>
      <div class="filterrow"><button class="minitab ${tab === 'buy' ? 'on' : ''}" data-fil="market" data-v="buy">🛒 Buy</button>
      <button class="minitab ${tab === 'sell' ? 'on' : ''}" data-fil="market" data-v="sell">💰 Sell loot</button>
      <button class="minitab ${tab === 'bazaar' ? 'on' : ''}" data-fil="market" data-v="bazaar">🧺 Bazaar</button>
      <button class="minitab ${tab === 'auction' ? 'on' : ''}" data-fil="market" data-v="auction">🔨 Auction</button>
      <button class="minitab ${tab === 'pawn' ? 'on' : ''}" data-fil="market" data-v="pawn">🏷️ Pawn</button></div>
      ${tab === 'bazaar' ? '<div id="bz-wrap"></div>' : tab === 'auction' ? '<div id="auc-wrap"></div>' : `<div class="card" style="background:none;border:none;padding:0">
      ${goods.map(id => marketRow(id, tab, me)).join('') || '<p style="color:var(--dim)">Nothing here. Keep crime-ing.</p>'}</div>`}`;
    if (tab === 'bazaar') renderBazaarInto($('#bz-wrap'));
    if (tab === 'auction') renderAuctionInto($('#auc-wrap'));
  }

  // ---- BAZAAR (player stalls)
  async function renderBazaarInto(wrap) {
    const me = G.me;
    try {
      if (!G.cache.bazaar || Date.now() - (G.cache.bazaarAt || 0) > 15000) {
        const r = await Net.get('/api/world/bazaar'); G.cache.bazaar = r.listings; G.cache.bazaarAt = Date.now();
      }
    } catch (e) { G.cache.bazaar = null; }
    const ls = G.cache.bazaar || [];
    const mine = ls.filter(x => x.mine);
    const others = ls.filter(x => !x.mine);
    const inv = Object.entries(me.items || {}).filter(([, q]) => q > 0);
    wrap.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div class="subhead" style="color:var(--gold)">🧺 The Bazaar</div>
        <p style="color:var(--mut);font-size:12px;margin:4px 0 10px">Stalls run by citizens, set your own prices. The fence skims <b>5%</b> of every sale — a bookkeeping class trims a point. Buy is the whole lot.</p>
        ${others.length ? others.map(x => `
          <div class="itemrow">
            <span class="ic">${x.icon}</span>
            <div class="nm"><b>${esc(x.name)}</b><small>×${x.qty} · ${esc(x.seller)}${x.anon ? ' 🎭' : ''}</small></div>
            <div class="qtychip" style="color:var(--cyn)">${money(x.each)}<small style="display:block;font-size:9.5px;color:var(--dim)">each</small></div>
            <button class="btn sm" data-act="bazaar_buy" data-lid="${x.id}" ${me.money < x.qty * x.each ? 'disabled' : ''}>Buy lot ${money(x.qty * x.each)}</button>
          </div>`).join('') : '<p style="color:var(--dim)">The stalls are bare. Be the first to hang a price.</p>'}
      </div>
      <div class="card">
        <div class="subhead" style="color:var(--cyn)">Your stall ${mine.length ? `(${mine.length}/8)` : ''}</div>
        ${mine.length ? mine.map(x => `
          <div class="itemrow">
            <span class="ic">${x.icon}</span>
            <div class="nm"><b>${esc(x.name)}</b><small>×${x.qty} at ${money(x.each)} each${x.anon ? ' · quiet sale 🎭' : ''}</small></div>
            <button class="btn sm danger" data-act="bazaar_cancel" data-lid="${x.id}">Take down</button>
          </div>`).join('') : '<p style="color:var(--dim);font-size:12.5px">Nothing on your stall yet.</p>'}
        <div style="border-top:1px dashed var(--line);margin-top:10px;padding-top:10px">
          <div class="kv"><span class="k">What</span><span class="v"><select id="bz-item" style="max-width:230px">${inv.length ? inv.map(([id, q]) => `<option value="${id}">${(G.meta.items[id] || {}).icon || ''} ${esc((G.meta.items[id] || {}).name || id)} ×${q}</option>`).join('') : '<option value="">— bag is empty —</option>'}</select></span></div>
          <div class="kv"><span class="k">How many</span><span class="v"><input id="bz-qty" type="number" min="1" value="1" style="width:80px;text-align:right"></span></div>
          <div class="kv"><span class="k">Price each</span><span class="v"><input id="bz-each" type="number" min="1" value="500" step="50" style="width:110px;text-align:right"></span></div>
          <div class="kv"><span class="k">Quiet sale</span><span class="v"><label style="display:flex;gap:6px;align-items:center;color:var(--mut);font-size:12.5px"><input id="bz-anon" type="checkbox"> stay a hooded figure 🎭</label></span></div>
          <button class="btn gold" style="width:100%;margin-top:8px" data-act="bazaar_list" ${inv.length ? '' : 'disabled'}>Hang the price tag</button>
        </div>
      </div>`;
  }
  function marketRow(id, tab, me) {
    const it = G.meta.items[id];
    const owned = me.items[id] || 0;
    const desc = tab === 'buy' ? (it.desc || '') : (it.desc || '');
    const price = tab === 'buy' ? it.buy : it.sell;
    return `<div class="itemrow"><span class="ic">${it.icon}</span>
      <div class="nm"><b>${esc(it.name)}</b><small>${esc(desc)}</small></div>
      <div class="acts" style="display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-shrink:0">
        ${tab === 'sell' ? `<span class="qtychip">owned ×${owned}</span>` : ''}
        <span class="qtychip" style="color:${tab === 'buy' ? 'var(--cyn)' : 'var(--gold)'}">${money(price)}</span>
        ${tab === 'buy'
          ? `<button class="btn sm buybtn" data-act="buy" data-item="${id}" data-qty="1">Buy 1</button>${it.type === 'use' && owned < 99 ? `<button class="btn sm" data-act="buy" data-item="${id}" data-qty="10">×10</button>` : ''}`
          : `<button class="btn sm" data-act="sell" data-item="${id}">Sell all ×${owned}</button>`}
      </div>
      </div>`;
  }

  // ---- ITEMS (inventory)
  function renderGearPanel(me) {
    const eq = (me.equip) || {};
    const slotRow = (slot, icon, label) => {
      const cur = eq[slot] && (G.meta.items[eq[slot]] || {}).name ? (G.meta.items[eq[slot]].icon + ' ' + G.meta.items[eq[slot]].name) : null;
      return `<div class="kv"><span class="k">${icon} ${label}</span><span class="v" style="display:flex;gap:6px;align-items:center">${cur ? `<b style="color:var(--ink)">${cur}</b><button class="btn sm ghost" data-act="unequip" data-slot="${slot}">Strip</button>` : '<span style="color:var(--dim)">— nothing</span>'}</span></div>`;
    };
    return `<div class="card" style="margin-bottom:10px"><div class="subhead" style="color:var(--gold)">What you're carrying on you</div>
      ${slotRow('weapon', '🔫', 'Iron')}${slotRow('armour', '🦺', 'Plate')}</div>`;
  }

  function renderItems() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const owned = Object.keys(me.items || {}).filter(id => me.items[id] > 0);
    const grouped = Object.entries(me.items || {}).filter(([, q]) => q > 0);
    const worth = grouped.reduce((s, [id, q]) => s + (m.items[id].sell || 0) * q, 0);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎒 <span class="head">Inventory</span></div>
      <div class="vdesc">Loot, consumables and boosters. Unused gear can be fenced for cash.</div></div>
      <div class="pill"><span>Total resale</span> <b class="mono" style="color:var(--gold)">${money(worth)}</b></div></div>
      ${renderGearPanel(me)}
      ${owned.length === 0 ? `<div class="card"><p style="color:var(--dim);text-align:center">You're carrying nothing. Head down the market.</p></div>` : ''}
      <div class="card" style="background:none;border:none;padding:0">
      ${grouped.map(([id, q]) => {
        const it = m.items[id];
        const canUse = it.type !== 'loot' && it.type !== 'gear';
        return `<div class="itemrow"><span class="ic">${it.icon}</span>
        <div class="nm"><b>${esc(it.name)}</b>${it.equip ? ` <small style="color:var(--cyn)">${it.equip.slot === 'weapon' ? '+' + it.equip.atk + '% attack' : '+' + it.equip.def + '% defense'}</small>` : ''}<small>${esc(it.desc)}</small></div>
        <span class="qtychip">×${q}</span>
        ${typeof it.sell === 'number' ? `<span class="qtychip" style="color:var(--gold)">${money(it.sell * q)}</span>` : ''}
        ${it.equip ? `<button class="btn sm ok" data-act="equip" data-item="${id}">${it.equip.slot === 'weapon' ? 'Carry' : 'Wear'}</button>` : ''}
        ${canUse ? `<button class="btn sm" data-act="use" data-item="${id}">Use</button>` : ''}
        ${typeof it.sell === 'number' ? `<button class="btn sm ghost" data-act="sell" data-item="${id}">Sell</button>` : ''}
        </div>`;
      }).join('')}</div>`;
  }

  function renderGearPanel(me) {
    const eq = (me.equip) || {};
    const slotRow = (slot, icon, label) => {
      const curId = eq[slot];
      const cur = curId && (G.meta.items[curId] || {}).name ? (G.meta.items[curId].icon + ' ' + G.meta.items[curId].name) : null;
      return `<div class="kv"><span class="k">${icon} ${label}</span><span class="v" style="display:flex;gap:6px;align-items:center">${cur ? `<b style="color:var(--ink)">${cur}</b><button class="btn sm ghost" data-act="unequip" data-slot="${slot}">Strip</button>` : '<span style="color:var(--dim)">— nothing</span>'}</span></div>`;
    };
    return `<div class="card" style="margin-bottom:10px"><div class="subhead" style="color:var(--gold)">Iron & plate</div>
      ${slotRow('weapon', '🔫', 'Weapon')}${slotRow('armour', '🦺', 'Armour')}</div>`;
  }

  // ---- BANK
  // ---- FINANCE: branch, the big board, and the chains
  const FIN = { sub: 'bank' };
  function spark(hist) {
    if (!hist || hist.length < 2) return '';
    const w = 96, h = 30, min = Math.min(...hist), max = Math.max(...hist), span = (max - min) || 1;
    const pts = hist.map((v, i) => `${(i / (hist.length - 1) * w).toFixed(1)},${(h - 2 - (v - min) / span * (h - 4)).toFixed(1)}`).join(' ');
    const up = hist[hist.length - 1] >= hist[0];
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;opacity:.9"><polyline fill="none" stroke="${up ? 'var(--ok)' : 'var(--mag)'}" stroke-width="1.8" points="${pts}"/></svg>`;
  }
  function renderBank() {
    const me = G.me;
    const v = $('#view');
    const sub = FIN.sub || 'bank';
    if (sub === 'stocks') { renderStocksInto(v); return; }
    if (sub === 'crypto') { renderCryptoInto(v); return; }
    const ir = (0.04 * (me.bonuses && (1 + 0) ? 1 : 1));
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏦 <span class="head">The Wire Exchange Bank</span></div>
      <div class="vdesc">Your branch, the big board and the chains — every balance in one chair.</div></div>
      <div class="filterrow">
        <button class="minitab on" data-fil="finance" data-v="bank">Branch</button>
        <button class="minitab" data-fil="finance" data-v="stocks">📈 Stocks</button>
        <button class="minitab" data-fil="finance" data-v="crypto">🪙 Crypto</button>
      </div></div>
      <div class="grid2">
        <div class="card"><div class="subhead">On you</div><div class="bigstat"><div class="num" style="color:var(--gold)">${money(me.money)}</div><div class="lab">carrying cash — lootable</div></div></div>
        <div class="card"><div class="subhead">Safe deposit</div><div class="bigstat"><div class="num" style="color:var(--cyn)">${money(me.bank)}</div><div class="lab">earning ~4%/hour interest</div></div></div>
      </div>
      <div class="card"><div class="subhead">Move money</div>
        <div class="grid2" style="align-items:end;gap:8px">
          <div class="field" style="margin:0"><label>Amount</label><input id="bank-amt" type="number" min="1" value="10000" step="1000"></div>
          <div style="display:flex;gap:8px">
            <button class="btn ok" data-act="deposit">Deposit →</button>
            <button class="btn ghost" data-act="withdraw">← Withdraw</button>
          </div>
        </div>
        <p style="color:var(--dim);font-size:11.5px;margin-top:10px">Total deposited over time: ${money(me.total_deposits)}</p></div>
      <div class="grid2">
        <div class="card" style="border-color:rgba(229,72,94,.25)"><div class="subhead" style="color:var(--mag)">🦈 The Shark's Window</div>
          ${me.loan ? `<p style="font-size:13px;margin:8px 0">You owe <b class="mono" style="color:${me.loan.due < Date.now() ? 'var(--bad)' : 'var(--gold)'}">${'$' + me.loan.owed.toLocaleString()}</b>
            ${me.loan.due < Date.now() ? '<b style="color:var(--bad)">— past due. The collector is already walking.</b>' : 'due ' + new Date(me.loan.due).toLocaleString() + '.'}</p>
          <div style="display:flex;gap:6px"><input id="loan-amt" type="number" min="1" value="${me.loan.owed}" style="width:120px"><button class="btn sm warn" data-act="loan_repay">Pay down</button></div>
          <p style="color:var(--dim);font-size:11px;margin-top:6px">Late paper gets collected from your cash, then your vault — without asking.</p>`
          : `<p style="color:var(--mut);font-size:12.5px;margin:8px 0">Fast paper when the branch says no: up to <b class="mono">${'$' + Math.max(10000, me.level * 10000).toLocaleString()}</b> at your level, <b>+25% vig</b>, 48 hours to make it good.</p>
          <div style="display:flex;gap:6px"><input id="loan-amt" type="number" min="1000" placeholder="amount" style="width:120px"><button class="btn sm warn" data-act="loan_take">Take the money</button></div>`}
        </div>
        <div class="card panel-gold"><div class="subhead" style="color:var(--gold)">⚡ The Wire Pass</div>
          ${me.sub && me.sub.active
            ? `<p style="font-size:13px;margin:8px 0">Gold on the ledger${me.sub.founder ? ' — <b>founder tier, never lapses ∞</b>' : ' until <b>' + new Date(me.sub.until).toLocaleDateString() + '</b>'}.</p>
               <p style="color:var(--mut);font-size:12px">+60% energy charge · +25 max energy · +5 max nerve · +8% crime success · +15% gym gains · half broker fees.</p>
               ${me.sub.founder ? '' : '<button class="btn sm gold" data-act="pass_buy">Extend another week · $150,000</button>'}`
            : `<p style="color:var(--mut);font-size:12.5px;margin:8px 0">Seven days running hot: <b>+60% energy charge</b>, <b>+25 max energy</b>, <b>+5 nerve cap</b>, <b>+8% crime success</b>, <b>+15% gym</b>, <b>half broker fees</b>.</p>
               <button class="btn gold" data-act="pass_buy" ${me.money < 150000 ? 'disabled' : ''}>Go gold · $150,000</button>`}
        </div>
      </div>
      <div class="card"><div class="subhead">Security tip</div><p style="color:var(--mut);font-size:12.5px">Attackers can only take a cut of the cash you're carrying. The branch is armour — interest is the reward for using it.</p></div>`;
  }
  function cityTabsHTML(tab) {
    return `<div class="filterrow">
      <button class="minitab ${tab === 'yard' ? 'on' : ''}" data-fil="city" data-v="yard">🏙️ The Yard</button>
      <button class="minitab ${tab === 'shops' ? 'on' : ''}" data-fil="city" data-v="shops">🏬 Corner Shops</button>
      <button class="minitab ${tab === 'board' ? 'on' : ''}" data-fil="city" data-v="board">🗃️ Mission Board</button>
    </div>`;
  }
  async function renderShopsInto(v) {
    let d = null;
    try { d = await Net.get('/api/shops'); } catch (e) {}
    if (!d) { v.innerHTML = `<div class="card"><p style="color:var(--dim)">Shutters down. Try again.</p></div>`; return; }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏬 <span class="head">Corner Shops</span></div>
      <div class="vdesc">Three counters, three neighbourhoods. Shelves restock for you at midnight — what's gone is gone until then.</div></div>
      ${cityTabsHTML('shops')}</div>
      <div class="grid3">${d.shops.map(s => `
        <div class="card shopcard"><div style="display:flex;justify-content:space-between;align-items:center">
          <b>${s.icon} ${esc(s.name)}</b><span class="qtychip" style="color:var(--cyn)">${esc(s.area)}</span></div>
          <p style="color:var(--dim);font-size:11.5px;margin:6px 0 10px">${esc(s.blurb)}</p>
          ${s.stock.map(r => `<div class="itemrow" style="padding:7px 0">
            <span class="ic">${r.icon || '📦'}</span>
            <div class="nm"><b>${esc(r.name)}</b><small>${esc(r.desc || '')}</small></div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <b class="mono" style="color:var(--gold)">${money(r.price)}</b>
              ${r.left > 0 ? `<button class="btn sm ok" data-act="shop_buy" data-shop="${s.id}" data-item="${r.item}">Buy <small style="opacity:.7">(${r.left}/${r.max} left)</small></button>`
                           : '<span class="qtychip" style="color:var(--bad)">sold out</span>'}
            </div></div>`).join('')}
        </div>`).join('')}</div>`;
  }
  async function renderMissionsInto(v) {
    let d = null;
    try { d = await Net.get('/api/missions'); } catch (e) {}
    if (!d) { v.innerHTML = `<div class="card"><p style="color:var(--dim)">The board is bare. Try again.</p></div>`; return; }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🗃️ <span class="head">The Mission Board</span></div>
      <div class="vdesc">Postings from the Wire itself. Do the job, collect the pay — some notes only unlock after the rest are burned.</div></div>
      ${cityTabsHTML('board')}</div>
      <div class="card" style="background:none;border:none;padding:0">${d.board.map(m => `
        <div class="itemrow mission ${m.claimed ? 'claimed' : ''}">
          <span class="ic">${m.icon}</span>
          <div class="nm"><b>${esc(m.name)}</b> ${m.claimed ? '<span class="qtychip" style="color:var(--ok)">PAID</span>' : ''}
            <small>${esc(m.desc)}</small>
            <div class="prog"><div class="progfill" style="width:${Math.min(100, (m.prog / m.need) * 100).toFixed(0)}%"></div><span class="progtext">${m.prog}/${m.need} · pays ${money(m.reward.cash || 0)}${m.reward.item ? ' + hardware' : ''}</span></div>
          </div>
          ${m.claimed ? '' : (m.done ? `<button class="btn sm gold" data-act="mission_claim" data-mid="${m.id}">Collect</button>` : `<span class="qtychip">${m.prog}/${m.need}</span>`)}
        </div>`).join('')}</div>`;
  }
  function marketTabsHTML(tab) {
    return `<button class="minitab ${tab === 'buy' ? 'on' : ''}" data-fil="market" data-v="buy">🛒 Buy</button>
      <button class="minitab ${tab === 'sell' ? 'on' : ''}" data-fil="market" data-v="sell">💰 Sell loot</button>
      <button class="minitab ${tab === 'bazaar' ? 'on' : ''}" data-fil="market" data-v="bazaar">🧺 Bazaar</button>
      <button class="minitab ${tab === 'auction' ? 'on' : ''}" data-fil="market" data-v="auction">🔨 Auction</button>
      <button class="minitab ${tab === 'pawn' ? 'on' : ''}" data-fil="market" data-v="pawn">🏷️ Pawn</button>`;
  }
  function renderPawnInto(v, me, m) {
    // instant money at 85% of fence — the broker pays now, not when a buyer wanders by
    const rows = Object.keys(me.items || {}).map(id => {
      const it = m.items[id];
      if (!it || !it.sell) return '';
      const each = Math.max(1, Math.floor(it.sell * 0.85));
      const qty = me.items[id];
      return `<div class="itemrow"><span class="ic">${it.icon || '📦'}</span>
        <div class="nm"><b>${esc(it.name)}</b> <small>×${qty}</small><small>${esc(it.desc || '')}</small></div>
        <span class="qtychip" style="color:var(--gold)">${money(each)}/ea</span>
        <button class="btn sm warn" data-act="pawn_sell" data-item="${id}" title="pawn the lot for ${money(each * qty)} right now">Pawn ×${qty}</button></div>`;
    }).filter(Boolean).join('');
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏷️ <span class="head">The Pawn Window</span></div>
      <div class="vdesc">Cash in hand, no questions, no waiting on a buyer. The broker pays 85% of fence value on the spot — the stall pays better if you can wait.</div></div>
      <div class="filterrow">${marketTabsHTML('pawn')}</div></div>
      ${rows || '<div class="card"><p style="color:var(--dim)">Nothing in the bag the broker wants. Steal better.</p></div>'}`;
  }
  async function renderStocksInto(v) {
    const me = G.me;
    let d = null;
    try { d = await Net.get('/api/world/stocks'); } catch (e) {}
    if (!d) { v.innerHTML = `<div class="card"><p style="color:var(--dim)">The big board is dark. Try again.</p></div>`; return; }
    const rows = d.stocks.map(s => `
      <div class="itemrow">
        <span class="ic">${s.icon}</span>
        <div class="nm"><b>${s.sym}</b> <small style="display:block">${esc(s.name)}</small>
          <small>held <b>${s.held}</b>${s.held ? ' (' + money(s.heldValue) + ')' : ''} · <span style="color:${s.chg >= 0 ? 'var(--ok)' : 'var(--mag)'}">${s.chg >= 0 ? '▲' : '▼'} ${Math.abs(s.chg)}%</span> on the session</small></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <b class="mono" data-price="${s.price}">${money(s.price)}</b>${spark(s.hist)}
          <div style="display:flex;gap:4px">
            <input data-qty="${s.sym}" type="number" min="1" value="10" style="width:64px;text-align:right">
            <button class="btn sm ok" data-act="stock_buy" data-sym="${s.sym}" ${me.money < s.price * 1.01 ? 'disabled' : ''}>Buy</button>
            ${s.held ? `<button class="btn sm ghost" data-act="stock_sell" data-sym="${s.sym}">Sell</button>` : ''}
          </div>
        </div>
      </div>`).join('');
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">📈 <span class="head">The Big Board</span></div>
      <div class="vdesc">Six listed firms, one tape, five-minute ticks. Broker takes ${(d.fee * 100).toFixed(1)}% each way. Portfolio: <b style="color:var(--gold)">${money(d.portValue)}</b></div></div>
      <div class="filterrow">
        <button class="minitab" data-fil="finance" data-v="bank">Branch</button>
        <button class="minitab on" data-fil="finance" data-v="stocks">📈 Stocks</button>
        <button class="minitab" data-fil="finance" data-v="crypto">🪙 Crypto</button>
      </div></div>
      <div class="card" style="background:none;border:none;padding:0">${rows}</div>`;
  }
  async function renderCryptoInto(v) {
    const me = G.me;
    let d = null;
    try { d = await Net.get('/api/world/crypto'); } catch (e) {}
    if (!d) { v.innerHTML = `<div class="card"><p style="color:var(--dim)">The chains are quiet. Try again.</p></div>`; return; }
    const rows = d.coins.map(s => `
      <div class="itemrow">
        <span class="ic">${s.icon}</span>
        <div class="nm"><b>${s.sym}</b> <small style="display:block">${esc(s.name)}</small>
          <small>wallet <b>${s.held}</b>${s.held ? ' (' + money(s.heldValue) + ')' : ''} · <span style="color:${s.chg >= 0 ? 'var(--ok)' : 'var(--mag)'}">${s.chg >= 0 ? '▲' : '▼'} ${Math.abs(s.chg)}%</span>, ten-minute ticks</small></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <b class="mono">${money(s.price)}</b>${spark(s.hist)}
          <div style="display:flex;gap:4px">
            <input data-amt="${s.sym}" type="number" min="1" value="100" style="width:84px;text-align:right">
            <button class="btn sm ok" data-act="crypto_buy" data-sym="${s.sym}">Buy $</button>
            ${s.held ? `<input data-sqty="${s.sym}" type="number" min="0" value="${s.held}" step="0.0001" style="width:84px;text-align:right"><button class="btn sm ghost" data-act="crypto_sell" data-sym="${s.sym}">Settle</button>` : ''}
          </div>
        </div>
      </div>`).join('');
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🪙 <span class="head">The Cage — crypto exchange</span></div>
      <div class="vdesc">Chain settlement through the Cage at ${(d.fee * 100).toFixed(1)}% friction. Wallet: <b style="color:var(--gold)">${money(d.walletValue)}</b>${d.rigs ? ` · ${d.rigs} mining rig${d.rigs > 1 ? 's' : ''} hashing ${d.mineRate} NGT/h each` : ''}</div></div>
      <div class="filterrow">
        <button class="minitab" data-fil="finance" data-v="bank">Branch</button>
        <button class="minitab" data-fil="finance" data-v="stocks">📈 Stocks</button>
        <button class="minitab on" data-fil="finance" data-v="crypto">🪙 Crypto</button>
      </div></div>
      ${d.rigs === 0 ? '<div class="card" style="margin-bottom:8px"><p style="color:var(--dim);font-size:12.5px;margin:0">A <b>Crypto Mining Rig</b> in your bag hashes NGT straight into your wallet around the clock. The rigs surface in heists and on the market.</p></div>' : ''}
      <div class="card" style="background:none;border:none;padding:0">${rows}</div>`;
  }

  // ---- CASINO
  // ================================================================ CASINO
  const CAS = { game: 'pontoon', spot: 'red', pick: 'crown', guess: 'higher', res: null };
  const CAS_GAMES = [
    { id: 'pontoon', ico: '♠️', n: 'Pontoon', blurb: 'Beat the dealer to 21. Naturals pay 3:2 — five cards under 21 pays 2:1.' },
    { id: 'greyhound', ico: '🐕', n: 'The Dog', blurb: 'The Greyhound Dash. Your multiplier climbs... until the dog falls over.' },
    { id: 'wheel', ico: '🎡', n: 'The Wheel', blurb: 'Single zero on the drum. Colours and odds pay 1:1, dozens and columns 2:1, a number 35:1.' },
    { id: 'bandit', ico: '🎰', n: 'The Bandit', blurb: 'Three reels. A pair returns your stake — three sevens pay 60 to 1.' },
    { id: 'crown', ico: '⚓', n: 'Crown & Anchor', blurb: 'Back one of the six signs. Every die that lands on it pays your stake again.' },
    { id: 'hilow', ico: '🎴', n: 'High-Low', blurb: 'One card shows. Call the next higher or lower and double your money. Ties go to the house.' }
  ];
  function pcard(c, back) {
    if (back) return `<div class="pcard back"><span>✦</span></div>`;
    const red = c.s === '♥' || c.s === '♦';
    return `<div class="pcard ${red ? 'red' : ''}"><b>${c.r}</b><span>${c.s}</span></div>`;
  }
  function casOptions() {
    const g = CAS.game;
    const chip = (k, v, label, on) => `<button class="chip sm ${CAS[k] === v ? 'on' : ''}" data-act="casino-opt" data-k="${k}" data-v="${v}">${label}</button>`;
    if (g === 'wheel') {
      const nums = [['0', 'green0']];
      for (let i = 1; i <= 36; i++) nums.push([String(i), [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i) ? 'rn' : 'bn']);
      return `<div class="chiprow" style="margin-bottom:8px">
          ${chip('spot', 'red', '🔴 Red')}${chip('spot', 'black', '⚫ Black')}${chip('spot', 'odd', 'Odd')}${chip('spot', 'even', 'Even')}${chip('spot', 'low', '1–18')}${chip('spot', 'high', '19–36')}
          ${chip('spot', 'dozen1', '1st 12')}${chip('spot', 'dozen2', '2nd 12')}${chip('spot', 'dozen3', '3rd 12')}${chip('spot', 'col1', 'Col Ⅰ')}${chip('spot', 'col2', 'Col Ⅱ')}${chip('spot', 'col3', 'Col Ⅲ')}
        </div>
        <div class="numgrid">${nums.map(([n, cls]) => `<button class="numchip ${cls} ${CAS.spot === 'n:' + n ? 'on' : ''}" data-act="casino-opt" data-k="spot" data-v="${'n:' + n}">${n}</button>`).join('')}</div>`;
    }
    if (g === 'crown') {
      const sigs = [['crown', '👑'], ['anchor', '⚓'], ['heart', '♥️'], ['diamond', '♦️'], ['club', '♣️'], ['spade', '♠️']];
      return `<div class="chiprow">${sigs.map(([id, gy]) => chip('pick', id, `${gy} ${id[0].toUpperCase() + id.slice(1)}`)).join('')}</div>`;
    }
    if (g === 'hilow') return `<div class="chiprow">${chip('guess', 'higher', '⬆ Higher')}${chip('guess', 'lower', '⬇ Lower')}</div>`;
    return '';
  }
  function pontoonHandHtml(h, settledRes) {
    if (settledRes) {
      const lab = { 'pontoon': '♠️ PONTOON! Naturals pay 3:2', 'five-card-trick': '✋ FIVE-CARD TRICK! Pays 2:1', 'dealer-bust': 'The dealer went bust', win: 'You beat the house', push: 'Push — stake returned', bust: 'BUST — over the 21', lose: 'The house takes it', 'house-pontoon': 'The dealer had a pontoon' }[settledRes.outcome] || settledRes.outcome;
      return `<div style="text-align:center">
        <div class="scene-sub" style="margin-bottom:6px">The house shows <b class="mono">${settledRes.dv}</b></div>
        <div class="pcard-row">${settledRes.dealer.map(c => pcard(c)).join('')}</div>
        <div class="pcard-row" style="margin-top:10px">${settledRes.player.map(c => pcard(c)).join('')}</div>
        <div class="scene-sub" style="margin-top:6px">You hold <b class="mono">${settledRes.pv}</b>${settledRes.doubled ? ' · doubled to $' + settledRes.bet.toLocaleString() : ''}</div>
        <div style="font-size:19px;font-weight:800;margin:10px 0 2px;color:${settledRes.win ? 'var(--gold)' : settledRes.push ? 'var(--mut)' : 'var(--bad)'}">${lab}</div>
        ${settledRes.win ? `<div class="scene-cash" style="font-size:30px">${money(settledRes.pay)}</div>` : settledRes.push ? `<div style="color:var(--mut);font-weight:700">$${settledRes.bet.toLocaleString()} back in your pocket</div>` : `<div style="color:var(--bad)">−$${settledRes.bet.toLocaleString()}</div>`}
      </div>`;
    }
    const canDouble = h.player.length === 2 && !h.doubled && G.me.money >= h.bet;
    return `<div style="text-align:center">
      <div class="scene-sub" style="margin-bottom:6px">The house shows <b class="mono">${h.dv}</b></div>
      <div class="pcard-row">${h.dealer.map(c => pcard(c)).join('')}${pcard(null, true)}</div>
      <div class="pcard-row" style="margin-top:10px">${h.player.map(c => pcard(c)).join('')}</div>
      <div class="scene-sub" style="margin-top:6px">You hold <b class="mono">${h.pv}</b> · stake <b class="mono">$${h.bet.toLocaleString()}</b></div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
        <button class="btn cyan sm" data-act="casino-move" data-move="hit">Hit</button>
        <button class="btn ghost sm" data-act="casino-move" data-move="stand">Stand</button>
        ${canDouble ? `<button class="btn gold sm" data-act="casino-move" data-move="double">Double</button>` : ''}
      </div>
    </div>`;
  }
  function casStageHtml(me) {
    const res = CAS.res && CAS.res.game === CAS.game ? CAS.res : null;
    if (CAS.game === 'pontoon') {
      if (res) return res.stage === 'settled' ? pontoonHandHtml(null, res) : pontoonHandHtml(res);
      if (me.pontoon) return pontoonHandHtml({ player: me.pontoon.player, dealer: me.pontoon.dealer, pv: me.pontoon.pv, dv: '…', bet: me.pontoon.bet, doubled: me.pontoon.doubled });
      return `<div class="scene-sub" style="text-align:center;color:var(--dim)">Lay a bet and the cards are yours.</div>`;
    }
    if (!res) return `<div class="scene-sub" style="text-align:center;color:var(--dim)">The table is quiet. Your move.</div>`;
    if (res.game === 'wheel') {
      const bg = res.color === 'red' ? '#8f2f28' : res.color === 'black' ? '#262429' : '#2e5126';
      return `<div style="text-align:center">
        <div style="width:74px;height:74px;border-radius:50%;background:${bg};border:3px solid var(--line2);margin:8px auto;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.5)">${res.n}</div>
        <div class="scene-sub">${res.n} ${res.color} · you backed <b style="color:var(--cyn)">${spotName(res.spot)}</b></div>
        ${casResultLine(res)}
      </div>`;
    }
    if (res.game === 'bandit') {
      return `<div style="text-align:center">
        <div class="pcard-row" style="gap:14px">${res.glyphs.map(g => `<div class="reelt">${g}</div>`).join('')}</div>
        <div class="scene-sub" style="margin-top:6px">${res.mult > 1 ? res.mult + '× on three of a kind' : res.mult === 1 ? 'A pair — your stake comes back' : 'Dead reels'}</div>
        ${casResultLine(res)}
      </div>`;
    }
    if (res.game === 'crown') {
      return `<div style="text-align:center">
        <div class="pcard-row" style="gap:14px">${res.glyphs.map(g => `<div class="reelt">${g}</div>`).join('')}</div>
        <div class="scene-sub" style="margin-top:6px">You backed the ${res.pick} · ${res.matches} landed</div>
        ${casResultLine(res)}
      </div>`;
    }
    if (res.game === 'hilow') {
      return `<div style="text-align:center">
        <div class="pcard-row">${pcard(res.first)}<div style="align-self:center;font-size:22px;color:var(--mut)">${res.guess === 'higher' ? '→⬆' : '→⬇'}</div>${pcard(res.second)}</div>
        <div class="scene-sub" style="margin-top:6px">${res.first.r} then ${res.second.r} — you called ${res.guess}</div>
        ${casResultLine(res)}
      </div>`;
    }
    return '';
  }
  function casResultLine(res) {
    if (res.win) return `<div style="font-size:20px;font-weight:800;color:var(--gold);margin-top:8px">+${money(res.pay)}</div>`;
    return `<div style="font-weight:700;color:var(--bad);margin-top:8px">−${money(res.bet)}</div>`;
  }
  function spotName(spot) {
    if (/^n:/.test(spot)) return 'number ' + spot.slice(2);
    return { red: 'red', black: 'black', odd: 'odd', even: 'even', low: '1–18', high: '19–36', dozen1: '1st twelve', dozen2: '2nd twelve', dozen3: '3rd twelve', col1: 'column Ⅰ', col2: 'column Ⅱ', col3: 'column Ⅲ' }[spot] || spot;
  }
  function renderCasino() {
    const me = G.me;
    const v = $('#view');
    const gm = CAS_GAMES.find(x => x.id === CAS.game);
    const handOpen = CAS.game === 'pontoon' && ((CAS.res && CAS.res.game === 'pontoon' && CAS.res.stage === 'hand') || (!CAS.res && me.pontoon));
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎰 <span class="head">The Corner Betting Shop</span></div>
      <div class="vdesc">Six tables, one rule: the house always has an edge. The trick is knowing when to walk out the door.</div></div>
      <div class="pill"><span>Cash</span> <b class="mono" style="color:var(--gold)">${money(me.money)}</b></div></div>
      <div class="chiprow" style="margin-bottom:12px" id="cas-tabs">
        ${CAS_GAMES.map(x => `<button class="chip ${CAS.game === x.id ? 'on' : ''}" data-act="casino-game" data-game="${x.id}">${x.ico} ${x.n}</button>`).join('')}
      </div>
      <div class="card">
        <div class="subhead" style="color:var(--gold)">${gm.ico} ${gm.n}</div>
        <p style="color:var(--mut);font-size:12.5px;margin:4px 0 12px">${gm.blurb}</p>
        ${casOptions()}
        ${handOpen ? '' : `<div class="kv" style="max-width:330px;margin:10px auto 0"><span class="k">Bet</span><span class="v" style="display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap">
          <input id="cas-bet" type="number" min="10" value="1000" step="100" style="width:110px;text-align:right">
          ${[100, 1000, 10000].map(a => `<button class="chip sm qb" data-act="casino-bet" data-v="${a}">${a >= 1000 ? (a / 1000) + 'k' : a}</button>`).join('')}
        </span></div>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn gold big" id="cas-go" data-act="casino">${CAS.game === 'pontoon' ? '♠️ Deal the cards' : CAS.game === 'greyhound' ? '🎲 Back the dog' : CAS.game === 'wheel' ? '🎡 Spin the wheel' : CAS.game === 'bandit' ? '🎰 Pull the lever' : CAS.game === 'crown' ? '⚓ Roll the dice' : '🎴 Call the card'}</button>
        </div>`}
        <div id="cas-stage" style="margin-top:16px;min-height:110px;display:flex;align-items:center;justify-content:center;border-top:1px dashed var(--line);padding-top:14px">${casStageHtml(me)}</div>
        <p style="color:var(--dim);font-size:11px;margin-top:10px;text-align:center">Bets from $10 to $1,000,000. Wins put money on your name — the street keeps score.</p>
      </div>`;
  }

  // ---- FACTION
  async function renderFaction() {
    const v = $('#view');
    const me = G.me;
    let fs = [];
    try {
      if (!G.cache.factions || Date.now() - (G.cache.factionsAt || 0) > 15000) {
        const r = await Net.get('/api/world/factions'); G.cache.factions = r.factions; G.cache.factionsAt = Date.now();
      }
      fs = G.cache.factions;
    } catch (e) { fs = []; }
    if (me.faction) { await renderFactionCockpit(v); return; }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🪓 <span class="head">The Gangs</span></div>
      <div class="vdesc">Strength in numbers. Found your own crew for \$200,000 at level 5+, or throw in with an existing one.</div></div></div>
      ${me.faction ? '' : `
      <div class="card panel-gold"><div class="subhead" style="color:var(--gold)">Found your own</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <input placeholder="Gang name" id="fac-name" maxlength="24" style="flex:1;min-width:150px">
          <input placeholder="TAG" id="fac-tag" maxlength="4" style="width:90px;text-transform:uppercase">
          <button class="btn gold" data-act="faction_create">Found it</button></div>
        <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Founding needs level 5${me.level >= 5 ? ' ✓' : ' · <span style=\"color:var(--bad)\">you are level ' + me.level + '</span>'} and a \$200,000 fee${me.money >= 200000 ? ' ✓' : ' · <span style="color:var(--bad)">you are short</span>'}
        </p></div>`}
      <div class="grid2">${fs.map(f => `
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <b style="font-size:16px">${esc(f.name)}</b><span class="qtychip" style="color:var(--cyn)">[${esc(f.tag)}]</span></div>
        <div class="kv"><span class="k">Members</span><span class="v">${f.members}</span></div>
        <div class="kv"><span class="k">Power</span><span class="v">${f.power}</span></div>
        <div class="kv"><span class="k">Run by</span><span class="v">${esc(f.owner)}</span></div>
        ${me.faction ? '' : `<button class="btn cyan sm" style="margin-top:10px" data-act="faction_join" data-fid="${f.id}">Join ${esc(f.tag)}</button>`}
        </div>`).join('') || `<div class="card" style="text-align:center"><div style="font-size:30px">🪓</div>
          <div class="head" style="font-size:15px;margin-top:6px">No gangs yet</div>
          <p style="color:var(--mut);font-size:13px;margin-top:8px">Nobody has claimed this town yet. Found your own crew — \$200,000 and level 5 is all it takes — and your name goes on it.</p></div>`}</div>`;
  }

  async function renderFactionCockpit(v) {
    let d = null;
    try { d = await Net.get('/api/faction/detail'); } catch (e) {}
    if (!d || !d.faction) { nav('city'); return; }
    const f = d.faction;
    const meOfficer = f.myRole === 'leader' || f.myRole === 'officer';
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🪓 <span class="head">${esc(f.name)}</span> <span class="qtychip" style="color:var(--cyn)">[${esc(f.tag)}]</span></div>
      <div class="vdesc">You ride as <b style="text-transform:capitalize">${f.myRole}</b> of this crew. ${rosterCount(f)} of ${f.cap} beds filled.</div></div></div>
      ${f.announce ? `<div class="card panel-gold gangwire"><div class="subhead" style="color:var(--gold)">📣 The boss's wire <small style="color:var(--dim)">· ${esc(f.announce.by)} · ${new Date(f.announce.at).toLocaleDateString()}</small></div>
        <p style="margin:8px 0 0;font-size:13.5px">${esc(f.announce.text)}</p></div>` : ''}
      <div class="grid2">
        <div class="card panel-gold"><div class="subhead" style="color:var(--gold)">🏦 The War Chest <b class="mono" style="float:right;color:var(--gold)">${money(f.bank)}</b></div>
          <p style="color:var(--mut);font-size:12px;margin:8px 0">Everybody chips in; officers spend it on arrangements below. Upgrades bought from the chest run for the whole crew.</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <input id="fbank-amt" type="number" min="1" placeholder="amount" style="width:110px">
            <button class="btn sm ok" data-act="fbank_in">Chip in</button>
            ${meOfficer ? '<button class="btn sm ghost" data-act="fbank_out">Draw out</button>' : ''}
          </div></div>
        <div class="card"><div class="subhead">The Roster</div>
          <div style="max-height:220px;overflow:auto">${f.roster.map(r => `
            <div class="itemrow"><span class="ic">${r.role === 'leader' ? '👑' : r.role === 'officer' ? '🎖' : '🕶'}</span>
              <div class="nm"><b>${esc(r.name)}</b><small>${r.role}${r.jailed ? ' · <b style="color:var(--bad)">INSIDE</b>' : ''} · lvl ${r.level}</small></div>
              ${r.jailed && r.id !== G.me.id ? `<button class="btn sm warn" data-act="bust_out" data-tid="${r.id}" title="12 nerve · risky">Bust</button>` : ''}
              ${f.myRole === 'leader' && r.id !== G.me.id ? `<button class="btn sm ghost" data-act="fpromote" data-tid="${r.id}" title="give / pull the stripe">${r.role === 'officer' ? 'Demote' : 'Promote'}</button>` : ''}
            </div>`).join('')}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
            <small style="color:var(--dim)">Busting springs a crewmate off the block — costs 12 nerve, jail risk if it goes wrong.</small>
            <button class="btn sm bad" data-act="faction_leave">Walk away</button>
          </div></div>
      </div>
      <div class="card"><div class="subhead">🛠️ Crew Arrangements <small style="color:var(--dim)">paid from the war chest · every member feels them</small></div>
        <div class="upgrid" style="margin-top:10px">${f.upgrades.map(u => `
          <div class="upcard ${u.owned ? 'owned' : ''}">
            <div class="upic">${u.icon}</div>
            <div class="upnm"><b>${esc(u.name)}</b><small>${esc(u.desc)}</small></div>
            ${u.owned ? '<span class="qtychip" style="color:var(--ok)">ACTIVE</span>'
              : (meOfficer ? `<button class="btn sm gold" data-act="fupgrade" data-up="${u.id}" ${f.bank < u.cost ? 'disabled' : ''}>${money(u.cost)}</button>` : `<span class="qtychip">${money(u.cost)}</span>`)}
          </div>`).join('')}</div></div>
      ${f.myRole === 'leader' ? `<div class="card"><div class="subhead">📣 Put the word out</div>
        <div style="display:flex;gap:8px;margin-top:8px"><input id="fannounce" maxlength="200" placeholder="one line, the whole crew sees it" style="flex:1"><button class="btn sm cyan" data-act="fannounce">Pin it</button></div></div>` : ''}`;
  }
  function rosterCount(f) { return (f.roster || []).length; }

  // ---- ACHIEVEMENTS
  function renderAch() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const list = Object.entries(m.achievements);
    const unlocked = Object.keys(me.achievements).length;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏆 <span class="head">Feats</span></div>
      <div class="vdesc">Big moments get carved into the city's memory. ${unlocked}/${list.length} earned.</div></div></div>
      <div class="grid3">${list.map(([id, a]) => {
        const got = me.achievements[id];
        return `<div class="card" style="text-align:center;opacity:${got ? 1 : .45}">
          <div style="font-size:34px;${got ? 'filter:none' : 'filter:grayscale(1) brightness(.6)'}">${a.icon}</div>
          <div class="head" style="font-size:13px;margin-top:4px">${esc(a.name)}</div>
          <div style="color:var(--dim);font-size:11px;margin-top:4px">${esc(a.desc)}</div>
          <div style="font-size:10px;color:${got ? 'var(--ok)' : 'var(--dim)'};margin-top:6px;letter-spacing:1px">${got ? '✓ ' + timeAgo(me.achievements[id]) : 'LOCKED'}</div></div>`;
      }).join('')}</div>`;
  }

  // ---- LEADERS
  async function renderLeaders() {
    const v = $('#view');
    const kind = G.filters.leader;
    const kinds = [['rep', 'Reputation', '🔥'], ['level', 'Level', '⭐'], ['crime', 'Crimes', '🧢'], ['fight', 'Fights', '⚔️'], ['wealth', 'Wealth', '💰']];
    let list = [];
    if (G.cache['lb_' + kind] && Date.now() - (G.cache['lbAt_' + kind] || 0) < 45000) list = G.cache['lb_' + kind];
    else {
      v.innerHTML = U.spinner("Counting the city's legends…");
      try {
        const r = await Net.get('/api/world/leaders?kind=' + kind);
        list = r.list; G.cache['lb_' + kind] = list; G.cache['lbAt_' + kind] = Date.now();
        G.myRank = r.me;
      } catch (e) {}
    }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">👑 <span class="head">The Gallery</span></div>
      <div class="vdesc">The city keeps score. Reputation is earned by jobs, fights and cashouts — this is your local high-score table.</div></div></div>
      <div class="filterrow">${kinds.map(([id, n, ic]) => `<button class="minitab ${kind === id ? 'on' : ''}" data-fil="leader" data-v="${id}">${ic} ${n}</button>`).join('')}</div>
      ${G.myRank ? `<p style="color:var(--mut);font-size:12.5px;margin-bottom:10px">You are <b style="color:var(--cyn)">#${G.myRank.rank}</b> of ${G.myRank.of} tracked citizens.</p>` : ''}
      <div class="card" style="background:none;border:none;padding:0">
      ${list.slice(0, 25).map(t => `
        <div class="lbrow ${t.isBot ? '' : 'real'} ${t.id === G.me.id ? 'me' : ''} top${t.rank}">
          <span class="rank">${t.rank}</span>
          <span style="width:36px;height:36px;flex-shrink:0">${AV.svgFor(t.avatar, 36)}</span>
          <b style="flex:1;font-size:14px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}${!t.isBot ? ' <span style="color:var(--cyn);font-size:9px">●</span>' : ''}</b>
          ${kind === 'rep' ? `<span style="color:var(--gold);font-weight:700" class="mono">${t.rep.toLocaleString()}</span>` : ''}
          ${kind === 'level' ? `<span class="mono" style="color:var(--cyn);font-weight:700">lvl ${t.level}</span>` : ''}
          ${kind === 'crime' ? `<span class="mono" style="color:var(--cyn);font-weight:700">${t.crimes}</span>` : ''}
          ${kind === 'fight' ? `<span class="mono" style="color:var(--cyn);font-weight:700">${t.wins} wins</span>` : ''}
          ${kind === 'wealth' ? `<span class="mono" style="color:var(--gold);font-weight:700">${money(t.wealth)}</span>` : ''}
        </div>`).join('') || '<p style="color:var(--dim)">No one on the board yet. Be the first.</p>'}
      </div>`;
    if (G.me.id) {}
  }

  // ---- MESSAGES
  async function renderMsg() {
    const v = $('#view');
    let inbox = [], sent = [];
    try {
      if (!G.cache.msgs || Date.now() - (G.cache.msgsAt || 0) > 20000) {
        const r = await Net.get('/api/messages'); G.cache.msgs = r; G.cache.msgsAt = Date.now();
      }
      inbox = G.cache.msgs.inbox; sent = G.cache.msgs.sent;
    } catch (e) {}
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">📨 <span class="head">Wire Messages</span></div>
      <div class="vdesc">Telegrams and notes, slipped under the door. Send a note to any citizen by their character name.</div></div></div>
      <div class="card"><div class="subhead">Send a message</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <input placeholder="Recipient character name" id="msg-to" maxlength="20" style="flex:1;min-width:140px">
          <input placeholder="Message" id="msg-body" maxlength="400" style="flex:2;min-width:200px">
          <button class="btn cyan" data-act="msg">Send</button></div></div>
      <div class="grid2">
        <div class="card"><div class="subhead">Inbox (${inbox.length})</div><div style="margin-top:6px">
          ${inbox.length ? inbox.map(m => `<div class="feed-item"><span class="fi">📩</span><div><b>${esc(m.from)}</b><div>${esc(m.body)}</div><div style="color:var(--dim);font-size:10.5px">${timeAgo(m.ts)}</div></div></div>`).join('') : '<p style="color:var(--dim);font-size:12px">Silence. The best kind of silence.</p>'}
        </div></div>
        <div class="card"><div class="subhead">Sent</div><div style="margin-top:6px">
          ${sent.length ? sent.map(m => `<div class="feed-item"><span class="fi">📤</span><div><b>to ${esc(m.to)}</b><div>${esc(m.body)}</div><div style="color:var(--dim);font-size:10.5px">${timeAgo(m.ts)}</div></div></div>`).join('') : '<p style="color:var(--dim);font-size:12px">Nothing sent yet.</p>'}
        </div></div>
      </div>`;
  }

  // ---- PROFILE
  function renderProfile() {
    const me = G.me, m = G.meta;
    const origin = m.origins.find(o => o.id === me.origin);
    const v = $('#view');
    const inJail = me.jail_until && me.jail_until > Date.now();
    const inHosp = me.hosp_until && me.hosp_until > Date.now();
    const worn = AV.wear(me.avatar);
    const F = k => FINGER[k];
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🧑‍🎤 <span class="head">Your File</span></div>
      <div class="vdesc">Every citizen in this town is a real player. This is the file the rest of them see.</div></div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="qtychip">${me.wins}W · ${me.losses}L</span>
        ${!inJail && !inHosp ? `<button class="btn ghost sm" data-act="editlook">✏️ Change your look</button>` : ''}
      </div></div>
      <div class="grid2 profile-grid">
        <div class="dollframe">
          ${AV.doll(me.avatar, 210)}
          <div class="dollname">${esc(me.name)}</div>
          <div class="dollsub">${origin ? esc(origin.name) : ''} · Level ${me.level}</div>
          <div class="dollbio">${esc(me.bio || '')}</div>
          <div class="statgrid" style="margin-top:10px">
            ${['st','de','sp','dx'].map(k => `<div class="statcell"><div class="snum">${Math.floor(me.stats[k])}</div><div class="slab">${F[k]}</div></div>`).join('')}
          </div>
        </div>
        <div>
          <div class="card"><div class="subhead">🎩 What you're wearing</div>
            <div class="weargrid">
              ${worn.map(w => `<div class="slot"><span class="s-ico">${w.icon}</span><span><span class="s-slot">${w.slot}</span><span class="s-val">${esc(w.value)}</span></span></div>`).join('')}
            </div>
            ${!inJail && !inHosp ? `<div style="margin-top:10px"><button class="btn ghost sm" data-act="editlook">Change it in the character editor</button></div>` : ''}
          </div>
          <div class="card"><div class="subhead">📊 Standing</div>
            <div class="kv"><span class="k">Battle rating</span><span class="v" style="color:var(--cyn)">⭐ ${Math.floor(me.total)}</span></div>
            <div class="kv"><span class="k">Health</span><span class="v">${Math.floor(me.life)} / ${me.max_life}</span></div>
            <div class="kv"><span class="k">Energy</span><span class="v">${Math.round(me.energy)} / ${me.max_energy}</span></div>
            <div class="kv"><span class="k">Nerve</span><span class="v">${Math.round(me.nerve)} / ${me.max_nerve}</span></div>
            <div class="kv"><span class="k">Happiness</span><span class="v">${me.happy} / 100</span></div>
            <div class="kv"><span class="k">Reputation</span><span class="v">🔥 ${me.reputation.toLocaleString()}</span></div>
            <div class="kv"><span class="k">Experience</span><span class="v">${Math.round(me.xpInto)} / ${Math.round(me.xpNeed)}</span></div>
          </div>
        </div>
      </div>
      <div class="grid2">
        <div class="card"><div class="subhead">💼 Career</div>
          <div class="kv"><span class="k">Crimes pulled off</span><span class="v">${me.total_success}</span></div>
          <div class="kv"><span class="k">Times nicked</span><span class="v">${me.total_fail}</span></div>
          <div class="kv"><span class="k">Job</span><span class="v">${me.job ? esc((m.jobs.find(j => j.id === me.job) || {}).name || me.job) : '— unemployed —'}</span></div>
          <div class="kv"><span class="k">Gang</span><span class="v">${me.faction ? 'member' : '— none —'}</span></div>
          <div class="kv"><span class="k">Items carried</span><span class="v">${Object.values(me.items || {}).reduce((s, q) => s + q, 0)}</span></div>
        </div>
        <div class="card"><div class="subhead">🗄️ Extras</div>
          <div class="kv"><span class="k">Feats earned</span><span class="v">${Object.keys(me.achievements).length} / ${Object.keys(m.achievements).length}</span></div>
          <div class="kv"><span class="k">Market spend</span><span class="v">${money(me.total_market_spend)}</span></div>
          <div class="kv"><span class="k">Bank deposits</span><span class="v">${money(me.total_deposits)}</span></div>
          <div style="margin-top:12px"><button class="btn ghost sm" data-act="logout">Log out of the city</button></div></div>
      </div>`;
  }

  // ---- HELP
  function renderHelp() {
    const v = $('#view');
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">❔ <span class="head">How the city works</span></div>
      <div class="vdesc">Razor Town is an open online life of crime, 2026. There's no finish line — the Wire keeps score and your legend grows.</div></div></div>
      <div class="grid2">
        <div class="card"><div class="subhead">The daily rhythm</div>
          <ul style="color:var(--mut);font-size:13px;line-height:2;list-style:none;padding:0">
            <li>⚡ <b style="color:var(--ink)">Energy</b> fuels every action. It refills over time (max 100).</li>
            <li>🧠 <b style="color:var(--ink)">Nerve</b> is spent on crimes. It refills slowly — spend it wisely.</li>
            <li>❤️ <b style="color:var(--ink)">Life</b> drops in fights and rough jobs. Trauma kits heal you.</li>
            <li>🔥 <b style="color:var(--ink)">Reputation</b> is your score — crimes, wins and betting wins add to it.</li>
          </ul></div>
        <div class="card"><div class="subhead">Make money fast</div>
          <p style="color:var(--mut);font-size:13px;line-height:1.9">Start with <b style="color:var(--ink)">Street Crimes</b> (nerve 1), then work up to <b style="color:var(--ink)">black market and organized jobs</b>. Bank big cash so attackers can't take it. Train at the gym to survive fights, and take a <b style="color:var(--ink)">day job</b> to fund your habits.</p></div>
        <div class="card"><div class="subhead">Keyboard shortcuts</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;color:var(--mut);font-size:13px;margin-top:6px">
            ${TABS.map(t => `<span><span class="kbd" style="display:inline-block;min-width:18px;text-align:center;border:1px solid var(--line2);border-radius:5px;padding:0 5px">${t.key}</span></span><span>${t.label}</span>`).join('')}
            <span><span class="kbd" style="border:1px solid var(--line2);border-radius:5px;padding:0 5px">Esc</span></span><span>Menu</span></div></div>
        <div class="card"><div class="subhead">Build a life</div>
          <ul style="color:var(--mut);font-size:13px;line-height:2;list-style:none;padding:0">
            <li>🎓 <b style="color:var(--ink)">College</b> — evening classes at Wireside College. Pass a course and the gain never leaves you.</li>
            <li>🏠 <b style="color:var(--ink)">Property</b> — a better address raises how happy you can get (and happy men train harder). Rent is charged daily.</li>
            <li>⭐ <b style="color:var(--ink)">Merits</b> — one point per level. Spend them on permanent perks.</li>
            <li>🎯 <b style="color:var(--ink)">Bounties</b> — post money on a name. Whoever puts that man in hospital collects the pot, less a 5% cut.</li>
          </ul></div>
        <div class="card"><div class="subhead">Play on any device</div>
          <p style="color:var(--mut);font-size:13px">Log in with the same account on your phone or PC — your character, items and reputation follow you. Touch and keyboard both fully supported.</p></div>
      </div>
      <div class="card"><div class="subhead">Sound</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn sm" data-act="sound">${G.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
          <button class="btn sm ghost" data-act="menu">☰ Game menu</button></div>
        <p style="color:var(--dim);font-size:11px;margin-top:10px">Razor Town is an original work — styled after classic crime-city browser games, with 100% our own names, jobs and fiction.</p></div>`;
  }

  // ================================================================ EDIT LOOK (modal)
  function openEditLook() {
    const me = G.me;
    const parts = AV.parts(me.avatar);
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal"><div class="modal-card">
      <div class="modal-title">✏️ <span class="head">Edit your look</span></div>
      <div style="display:flex;gap:14px;align-items:center;margin:14px 0">
        <div style="width:120px;flex-shrink:0;text-align:center" id="el-prev">${AV.doll(me.avatar, 120)}</div>
        <div style="flex:1">${editChips('skin', 'Skin', AV.SKINS.map((_, i) => i + ''), parts.skin, true)}</div>
      </div>
      ${editChips('face', 'Face', AV.FACE_FEAT.map(x => x.n), parts.face)}
      ${editChips('hair', 'Hair / headwear', AV.HAIRS.map(x => x.n), parts.hair)}
      ${editChips('shirt', 'Jacket', AV.SHIRTS.map((_, i) => i + ''), parts.shirt, true)}
      ${editChips('accent', 'Trinket', AV.ACCENTS.map((_, i) => i + ''), parts.accent, true)}
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" data-act="close-modal">Cancel</button>
        <button class="btn cyan" data-act="save-look">Save look</button></div></div></div>`;
    const els = { skin: parts.skin, face: parts.face, hair: parts.hair, shirt: parts.shirt, accent: parts.accent };
    const cur = { ...parts };
    $$('[data-el-opt]', root).forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.elOpt, val = +b.dataset.v;
      cur[f] = val;
      const str = [cur.skin, cur.face, cur.hair, cur.shirt, cur.accent].join('|');
      $('#el-prev').innerHTML = AV.doll(str, 120);
      $$(`[data-el-opt="${f}"]`, root).forEach(x => x.classList.toggle('on', +x.dataset.v === val));
    }));
  }
  function editChips(field, label, values, active, swatch) {
    const items = values.map((v, i) => swatch
      ? `<button class="chip swatch ${active === i ? 'on' : ''}" data-el-opt="${field}" data-v="${i}" style="background:${field === 'skin' ? AV.SKINS[i] : field === 'shirt' ? AV.SHIRTS[i] : field === 'accent' ? AV.ACCENTS[i] : '#333'}"></button>`
      : `<button class="chip ${active === i ? 'on' : ''}" data-el-opt="${field}" data-v="${i}">${v}</button>`).join('');
    return `<div style="margin-top:10px"><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);font-weight:700;margin-bottom:6px">${label}</div><div class="chiprow">${items}</div></div>`;
  }

  // ================================================================ MENU MODAL
  function openMenu() {
    const me = G.me;
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal"><div class="modal-card">
      <div class="modal-title">☰ <span class="head">City Menu</span></div>
      <div style="margin:12px 0" class="kv"><span class="k">Citizen</span><span class="v">${esc(me.name)}</span></div>
      <div class="kv"><span class="k">Reputation score</span><span class="v" style="color:var(--gold)">${me.reputation.toLocaleString()}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
        <button class="btn ghost sm" data-act="sound">${G.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
        <button class="btn ghost sm" data-act="close-modal">Resume</button>
        <button class="btn danger sm" data-act="logout">Log out</button>
        <button class="btn cyan sm" data-nav="help">Help</button></div>
      <p style="color:var(--dim);font-size:10.5px;margin-top:14px;text-align:center">v1.0 · online crime sim · your saves live in the ledger</p></div></div>`;
  }

  // ---- BOULTON'S AUCTION ROOMS
  function fmtLeft(ms) {
    const m = Math.ceil(ms / 60000);
    if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
    return Math.max(1, m) + 'm';
  }
  async function renderAuctionInto(wrap) {
    const me = G.me;
    let data = null;
    try {
      if (!G.cache.auction || Date.now() - (G.cache.auctionAt || 0) > 12000) {
        data = await Net.get('/api/world/auctions'); G.cache.auction = data; G.cache.auctionAt = Date.now();
      } else data = G.cache.auction;
    } catch (e) {}
    if (!data) { wrap.innerHTML = '<div class="card"><p style="color:var(--dim)">The rooms are closed today. Try again.</p></div>'; return; }
    const open = data.listings.filter(x => !x.mine);
    const mine = data.listings.filter(x => x.mine);
    const inv = Object.entries(me.items || {}).filter(([, q]) => q > 0);
    wrap.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div class="subhead" style="color:var(--gold)">🔨 The Wire Auction House · Central Yard</div>
        <p style="color:var(--mut);font-size:12px;margin:4px 0 10px">Gavel and estate sales. A bid leaves your hand the moment it lands; if you are outbid it walks straight back. Hammer still: <b>${data.feePct}%</b> to the house. Sessions run ${data.hours.map(h => h + 'h').join(' / ')}.</p>
        ${open.length ? open.map(x => `
          <div class="itemrow" style="align-items:flex-start">
            <span class="ic">${x.icon}</span>
            <div class="nm"><b>${esc(x.name)}</b> <small>×${x.qty}</small>
              <small style="display:block">${esc(x.seller)} · ${x.bid ? 'stands at <b style="color:var(--gold)">' + money(x.bid) + '</b>' + (x.leading ? ' (held by ' + esc(x.leading) + ')' : '') : 'opens at ' + money(x.min)} · ${x.imWinning ? '<b style="color:var(--cyn)">your bid leads</b> · ' : ''}closes in ${fmtLeft(x.remaining)}</small></div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
              <div style="display:flex;gap:4px"><input id="auc-amt-${x.id}" type="number" value="${x.nextMin}" min="${x.nextMin}" step="10" style="width:92px;text-align:right"><button class="btn sm" data-act="auction_bid" data-aid="${x.id}" ${x.canBid || (x.buyout && me.money >= x.buyout) ? '' : 'disabled'}>Bid</button></div>
              ${x.buyout ? `<button class="btn sm ghost" data-act="auction_buyout" data-aid="${x.id}" data-amt="${x.buyout}" ${me.money >= x.buyout ? '' : 'disabled'}>Buy outright ${money(x.buyout)}</button>` : ''}
            </div>
          </div>`).join('') : '<p style="color:var(--dim)">Nothing on the block. Nobody wants to part with anything today.</p>'}
      </div>
      <div class="card">
        <div class="subhead" style="color:var(--cyn)">Your lots ${mine.length ? '(' + data.active + '/' + data.maxActive + ')' : ''}</div>
        ${mine.length ? mine.map(x => `
          <div class="itemrow">
            <span class="ic">${x.icon}</span>
            <div class="nm"><b>${esc(x.name)}</b><small>×${x.qty} · ${x.bid ? 'book at <b style="color:var(--gold)">' + money(x.bid) + '</b> by ' + esc(x.leading) : 'no takers yet'} · closes ${fmtLeft(x.remaining)}</small></div>
            ${x.bid ? '<span class="qtychip" style="color:var(--gold)">' + money(x.bid) + '</span>' : `<button class="btn sm danger" data-act="auction_cancel" data-aid="${x.id}">Pull lot</button>`}
          </div>`).join('') : '<p style="color:var(--dim);font-size:12.5px">You have nothing on the block.</p>'}
        <div style="border-top:1px dashed var(--line);margin-top:10px;padding-top:10px">
          <div class="kv"><span class="k">What</span><span class="v"><select id="auc-item" style="max-width:220px">${inv.length ? inv.map(([id, q]) => '<option value="' + id + '">' + ((G.meta.items[id] || {}).icon || '') + ' ' + esc((G.meta.items[id] || {}).name || id) + ' ×' + q + '</option>').join('') : '<option value="">— bag is empty —</option>'}</select></span></div>
          <div class="kv"><span class="k">How many</span><span class="v"><input id="auc-qty" type="number" min="1" value="1" style="width:80px;text-align:right"></span></div>
          <div class="kv"><span class="k">Opening book</span><span class="v"><input id="auc-min" type="number" min="100" value="1000" step="100" style="width:110px;text-align:right"></span></div>
          <div class="kv"><span class="k">Buy outright</span><span class="v"><input id="auc-buyout" type="number" min="0" placeholder="optional" style="width:110px;text-align:right"></span></div>
          <div class="kv"><span class="k">Session</span><span class="v"><select id="auc-hours">${data.hours.map(h => '<option value="' + h + '"' + (h === 3 ? ' selected' : '') + '>' + h + ' hours</option>').join('')}</select></span></div>
          <button class="btn gold" style="width:100%;margin-top:8px" data-act="auction_create" ${inv.length ? '' : 'disabled'}>Send it to the block</button>
        </div>
      </div>`;
  }

  // ================================================================ GLOBAL HANDLERS
  function onModalRoot(e) {
    const act = (e.target.closest('[data-act]') || {}).dataset && e.target.closest('[data-act]').dataset.act;
    if (act === 'close-scene') { SND.slice(); closeScene(); }
    if (act === 'skip-scene') { closeScene(); }
    if (act === 'again-crime') {
      const cid = e.target.closest('[data-crime]').dataset.crime;
      closeScene(); act('crime', { crimeId: cid }, 'crime');
    }
    if (act === 'close-modal') { $('#modal-root').innerHTML = ''; }
    if (act === 'save-look') { saveLook(); }
    if (act === 'sound') { G.sound = !G.sound; localStorage.setItem('nsc_sound', G.sound ? '1' : '0'); SND.on = G.sound; openMenu(); }
    if (act === 'logout') { doLogout(); }
  }
  async function saveLook() {
    const me = G.me;
    const parts = AV.parts(me.avatar);
    const root = $('#modal-root');
    const cur = {};
    $$('[data-el-opt]', root).forEach(b => { if (b.classList.contains('on')) cur[b.dataset.elOpt] = +b.dataset.v; });
    const str = [cur.skin ?? parts.skin, cur.face ?? parts.face, cur.hair ?? parts.hair, cur.shirt ?? parts.shirt, cur.accent ?? parts.accent].join('|');
    try {
      const r = await Net.post('/api/updateprofile', { avatar: str });
      G.me = r.p; root.innerHTML = ''; renderHUD(); reRenderCurrent();
      U.toast('New look applied. Looking sharp.', 'good');
    } catch (e) { U.toast(esc(e.message), 'bad'); }
  }
  async function doLogout() {
    try { await Net.post('/api/logout'); } catch (e) {}
    stopStream();
    G.authed = false; G.me = null; G.cache = {};
    $('#modal-root').innerHTML = '';
    showAuth();
  }

  async function onClick(e) {
    const btn = e.target.closest('[data-act], [data-nav], [data-fil]');
    if (!btn) return;
    if (btn.dataset.nav) { if (!G.authed) return; SND.click(); nav(btn.dataset.nav); return; }
    if (btn.dataset.fil) {
      G.filters[btn.dataset.fil] = btn.dataset.v;
      if (btn.dataset.fil === 'leader') { G.filters.leader = btn.dataset.v; renderLeaders(); }
      else if (btn.dataset.fil === 'finance') { FIN.sub = btn.dataset.v; reRenderCurrent(); }
      else reRenderCurrent();
      return;
    }
    const actN = btn.dataset.act;
    if (!actN) return;
    SND.click();
    const v = $('#view');
    switch (actN) {
      case 'crime': { const id = btn.dataset.crime; act('crime', { crimeId: id }, 'crime'); break; }
      case 'attack': {
        const tid = btn.dataset.tid;
        FX.splash(innerWidth / 2, innerHeight / 2);
        const btns = $$('[data-act="attack"]'); btns.forEach(x => x.disabled = true);
        act('attack', { targetId: +tid }, 'attack');
        break;
      }
      case 'train': act('train', { stat: btn.dataset.stat, gymId: btn.dataset.gym || 'abandoned_gym' }); break;
      case 'job_apply': act('job_apply', { jobId: btn.dataset.job }); break;
      case 'job_quit': act('job_quit', {}); break;
      case 'work': act('work', {}); break;
      case 'buy': act('buy', { itemId: btn.dataset.item, qty: +btn.dataset.qty }); break;
      case 'bazaar_list': {
        const itemId = ($('#bz-item') || {}).value, qty = parseInt(($('#bz-qty') || {}).value, 10) || 1, each = parseInt(($('#bz-each') || {}).value, 10) || 0;
        act('bazaar_list', { itemId, qty, each, anon: !!($('#bz-anon') || {}).checked }); break;
      }
      case 'bazaar_buy': act('bazaar_buy', { listingId: +btn.dataset.lid }); break;
      case 'bazaar_cancel': act('bazaar_cancel', { listingId: +btn.dataset.lid }); break;
      case 'auction_create': {
        const itemId = ($('#auc-item') || {}).value;
        const qty = parseInt(($('#auc-qty') || {}).value, 10) || 1;
        const minBid = parseInt(($('#auc-min') || {}).value, 10) || 0;
        const buyout = parseInt(($('#auc-buyout') || {}).value, 10) || 0;
        const hours = parseInt(($('#auc-hours') || {}).value, 10) || 3;
        act('auction_create', { itemId, qty, minBid, buyout, hours }); break;
      }
      case 'auction_bid': {
        const amount = parseInt(($('#auc-amt-' + btn.dataset.aid) || {}).value, 10) || 0;
        act('auction_bid', { auctionId: +btn.dataset.aid, amount }); break;
      }
      case 'auction_buyout': act('auction_bid', { auctionId: +btn.dataset.aid, amount: +btn.dataset.amt }); break;
      case 'auction_cancel': act('auction_cancel', { auctionId: +btn.dataset.aid }); break;
      case 'sell': act('sell', { itemId: btn.dataset.item, qty: 999 }); break;
      case 'equip': act('equip', { itemId: btn.dataset.item }); break;
      case 'unequip': act('unequip', { slot: btn.dataset.slot }); break;
      case 'stock_buy': case 'stock_sell': {
        const qty = parseInt((document.querySelector(`[data-qty=\"${btn.dataset.sym}\"]`) || {}).value, 10) || 0;
        act(actN, { sym: btn.dataset.sym, qty }); break;
      }
      case 'crypto_buy': {
        const amount = parseFloat((document.querySelector(`[data-amt=\"${btn.dataset.sym}\"]`) || {}).value) || 0;
        act(actN, { sym: btn.dataset.sym, amount }); break;
      }
      case 'crypto_sell': {
        const qty = parseFloat((document.querySelector(`[data-sqty=\"${btn.dataset.sym}\"]`) || {}).value) || 0;
        act(actN, { sym: btn.dataset.sym, qty }); break;
      }
  async function actCatch(name, payload) {
    const r = await Net.post('/api/action', Object.assign({}, payload || {}, { name })).catch(err => { U.toast(esc(err && err.message || 'The city shrugged.'), 'bad'); return null; });
    if (r && (r.ok || r.p)) { if (r.p) applyMe(r.p, r.res); return r; }
    if (r && r.err) { U.toast(esc(r.err), 'bad'); return null; }
    return r;
  }
  function openPassModal() {
    const me = G.me; if (!me) return;
    const on = me.sub && me.sub.active;
    $('#modal-root').innerHTML = `<div class="modal-back" data-act="close-modal"></div>
      <div class="modal card" style="max-width:430px">
        <div class="subhead" style="color:var(--gold);font-size:15px">⚡ THE WIRE PASS</div>
        <p style="color:var(--mut);font-size:13px;margin:10px 0">Seven days on the gold ledger. Serious people buy it because the maths is serious:</p>
        <div class="passbuffs">
          <div class="pb"><b>+60%</b><span>energy charge speed</span></div>
          <div class="pb"><b>+25</b><span>maximum energy</span></div>
          <div class="pb"><b>+5</b><span>nerve ceiling</span></div>
          <div class="pb"><b>+8%</b><span>crime success</span></div>
          <div class="pb"><b>+15%</b><span>gym gains</span></div>
          <div class="pb"><b>−50%</b><span>stock & chain broker fees</span></div>
        </div>
        <p style="font-size:12.5px;margin:10px 0;color:${on ? 'var(--ok)' : 'var(--dim)'}">${on ? (me.sub.founder ? 'You carry the founder tier — it never lapses. ∞' : 'Active until ' + new Date(me.sub.until).toLocaleString() + '. Renewals stack on top.') : 'Not running. $150,000 a week, plain and simple.'}</p>
        <div style="display:flex;gap:8px">
          ${me.sub && me.sub.founder ? '' : `<button class="btn gold" data-act="pass_buy" ${me.money < 150000 ? 'disabled' : ''}>${on ? 'Extend a week' : 'Go gold'} · $150,000</button>`}
          <button class="btn ghost" data-act="close-modal">Later</button>
        </div></div>`;
  }

      case 'use': act('use', { itemId: btn.dataset.item }); break;
      case 'deposit': case 'withdraw': {
        const amt = parseInt($('#bank-amt').value, 10) || 1000;
        act(actN, { amount: amt }); break;
      }
      case 'casino-game': CAS.game = btn.dataset.game; CAS.res = null; renderCasino(); break;
      case 'casino-opt': {
        CAS[btn.dataset.k] = btn.dataset.v;
        const row = btn.parentElement;
        Array.from(row.querySelectorAll(`[data-k="${btn.dataset.k}"]`)).forEach(x => x.classList.toggle('on', x === btn));
        break;
      }
      case 'casino-bet': { const bi = $('#cas-bet'); if (bi) { bi.value = btn.dataset.v; bi.focus(); } break; }
      case 'casino-move': act('casino', { game: 'pontoon', move: btn.dataset.move }, 'casino'); break;
      case 'casino': {
        const bet = parseInt(($('#cas-bet') || {}).value, 10) || 100;
        const go = $('#cas-go'); if (go) go.disabled = true;
        const g = CAS.game;
        const payload = { game: g, bet };
        if (g === 'wheel') payload.spot = CAS.spot;
        if (g === 'crown') payload.pick = CAS.pick;
        if (g === 'hilow') payload.guess = CAS.guess;
        if (g === 'greyhound') casinoDrama(bet).then(() => act('casino', payload, 'casino'));
        else act('casino', payload, 'casino');
        break;
      }
      case 'faction_create': {
        const factionName = $('#fac-name') && $('#fac-name').value; const tag = $('#fac-tag') && $('#fac-tag').value;
        act('faction_create', { factionName, tag, desc: '' }); break;
      }
      case 'faction_join': act('faction_join', { fid: +btn.dataset.fid }); break;
      case 'faction_leave': act('faction_leave', {}); break;
      case 'side_toggle': document.body.classList.toggle('side-open'); break;
      case 'chat_toggle': chatToggle(); break;
      case 'chat_send': {
        const inp = $('#cd-text');
        const body = inp ? inp.value.trim() : '';
        if (!body) break;
        const r = await Net.post('/api/action', { name: 'chat_msg', chan: CHAT.chan, body }).catch(err => { U.toast(esc(err.message), 'bad'); return null; });
        if (r && r.ok) { inp.value = ''; CHAT.last = CHAT.last; await chatPull(false); }
        break;
      }
      case 'pass_modal': openPassModal(); break;
      case 'pass_buy': act('pass_buy', {}); break;
      case 'pawn_sell': act('pawn_sell', { itemId: btn.dataset.item, qty: 999 }); break;
      case 'loan_take': { const amt = parseInt(($('#loan-amt') || {}).value, 10) || 0; act('loan_take', { amount: amt }); break; }
      case 'loan_repay': { const amt = parseInt(($('#loan-amt') || {}).value, 10) || 0; act('loan_repay', { amount: amt }); break; }
      case 'shop_buy': act('shop_buy', { shopId: btn.dataset.shop, itemId: btn.dataset.item }); break;
      case 'mission_claim': act('mission_claim', { mid: btn.dataset.mid }); break;
      case 'fbank_in': { const amt = parseInt(($('#fbank-amt') || {}).value, 10) || 0; const r = await actCatch('fbank_in', { amount: amt }); if (r) renderFaction(); break; }
      case 'fbank_out': { const amt = parseInt(($('#fbank-amt') || {}).value, 10) || 0; const r = await actCatch('fbank_out', { amount: amt }); if (r) renderFaction(); break; }
      case 'fupgrade': { const r = await actCatch('fupgrade', { upId: btn.dataset.up }); if (r) { U.toast('Arrangement locked in.', 'good'); renderFaction(); } break; }
      case 'fannounce': { const text = ($('#fannounce') || {}).value || ''; const r = await actCatch('fannounce', { text }); if (r) renderFaction(); break; }
      case 'fpromote': { const r = await actCatch('fpromote', { targetId: +btn.dataset.tid }); if (r) renderFaction(); break; }
      case 'bust_out': act('bust_out', { targetId: +btn.dataset.tid }); break;
      case 'msg': {
        const to = $('#msg-to') && $('#msg-to').value, body = $('#msg-body') && $('#msg-body').value;
        const ok = await Net.post('/api/action', { name: 'msg', to, body }).catch(err => { U.toast(esc(err.message), 'bad'); return null; });
        if (ok) { G.cache.msgs = null; U.toast('Message sent into the wire.', 'good'); renderMsg(); }
        break;
      }
      case 'property_buy': act('property_buy', { propertyId: btn.dataset.prop }); break;
      case 'property_upgrade': act('property_upgrade', { upgradeId: btn.dataset.up }); break;
      case 'property_sell': act('property_sell', {}); break;
      case 'vault_in': case 'vault_out': {
        const amt = parseInt(($('#vault-amt') || {}).value, 10) || 0;
        act(actN, { amount: amt }); break;
      }
      case 'course_start': act('course_start', { courseId: btn.dataset.course }); break;
      case 'course_quit': act('course_quit', {}); break;
      case 'merit_buy': act('merit_buy', { perkId: btn.dataset.perk }); break;
      case 'bounty_place': {
        const sel = $('#bo-target'), amtEl = $('#bo-amt'), anonEl = $('#bo-anon');
        const targetId = sel ? +sel.value : 0;
        if (!targetId) { U.toast('Pick somebody first.', 'bad'); break; }
        act('bounty_place', { targetId, amount: parseInt(amtEl && amtEl.value, 10) || 0, anon: !!(anonEl && anonEl.checked) });
        break;
      }
      case 'menu': openMenu(); break;
      case 'sound': { G.sound = !G.sound; localStorage.setItem('nsc_sound', G.sound ? '1' : '0'); SND.on = G.sound; break; }
      case 'logout': doLogout(); break;
      case 'editlook': openEditLook(); break;
    }
  }

  // casino dramatic multi animation before showing result
  function casinoDrama(bet) {
    return new Promise((resolve) => {
      const el = $('#cd-mult'); const st = $('#cd-status');
      if (!el) { resolve(); return; }
      let t = 0;
      const iv = setInterval(() => {
        t += 0.05 + Math.random() * 0.08;
        const m = 1 + Math.pow(t, 1.25) * (0.5 + Math.random() * 0.12);
        el.innerHTML = `<span class="mono" style="color:${m > 2.4 ? 'var(--gold)' : 'var(--cyn)'};text-shadow:0 0 30px ${m > 2.4 ? 'rgba(229,185,94,.85)' : 'rgba(199,162,82,.6)'}">${m.toFixed(2)}×</span>`;
        if (t > 1.9) { clearInterval(iv); resolve(); }
      }, 110);
    });
  }

  function onKey(e) {
    if (!G.authed) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if ($('#modal-root').innerHTML) $('#modal-root').innerHTML = ''; else openMenu(); return; }
    if (k === '/') { e.preventDefault(); nav('help'); return; }
    const tab = TABS.find(t => t.key === k && ['h', 'c', 'a', 't', 'j', 'm', 'i', 'b', 'y', 'u', 'k', 'w', 'g', 'f', 'e', 'l', 'n', 'p'].includes(k));
    if (tab) { e.preventDefault(); nav(tab.id); }
  }

  // timers loop
  setInterval(() => {
    if (!G.authed) return;
    const cc = $('#lock-cover');
    if (cc) U.updateTimers(cc);
    if (G.view === 'college') tickCourse();
    tickClocks();
    // re-render hud bars periodically (regeneration display)
  }, 1000);
  setInterval(() => {
    if (!G.authed || !G.me) return;
    Net.get('/api/me').then(r => {
      if (!r || !r.me) { stopStream(); G.authed = false; G.me = null; $('#modal-root').innerHTML = ''; showAuth('Your session expired. Log in again.'); return; }
      const wasJ = G.me.jail_until && G.me.jail_until > Date.now();
      const isJ = r.me.jail_until && r.me.jail_until > Date.now();
      const now = { money: r.me.money };
      // lightweight: only update numbers/bars, no content churn every 5s
      const bagBefore = JSON.stringify((G.me && G.me.items) || {});
      G.me = Object.assign({}, G.me, r.me);
      G._tickAt = Date.now();
      renderHUD();
      if (wasJ && !isJ) { unlockUI(); }
      if ($('#lock-cover')) U.updateTimers($('#lock-cover'));
      // the bag can change without this window lifting a finger (sales through the stall,
      // wires from the rooms, a buy on another device) — repaint the shelf when it does
      if (G.view === 'items' && JSON.stringify(G.me.items || {}) !== bagBefore) renderItems();
    }).catch(() => {});
  }, 6000);

  window.addEventListener('beforeunload', () => { if (G.stream) G.stream.close(); });
  boot();
})();
