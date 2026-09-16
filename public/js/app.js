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
    { id: 'jail', label: 'Jail', ico: '⛓️', key: 'x' },
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
    { id: 'arcade', label: 'Arcade', ico: '🎮', key: '7' },
    { id: 'hustle', label: 'Side Hustles', ico: '📦', key: '8' },
    { id: 'life', label: 'Street Life', ico: '🌃', key: '6' },
    { id: 'garage', label: 'Garage', ico: '🚗', key: '9' },
    { id: 'turf', label: 'Turf', ico: '🗺️', key: '5' },
    { id: 'informants', label: 'Informants', ico: '🕵️', key: '1' },
    { id: 'faction', label: 'Gang', ico: '🪓', key: 'f' },
    { id: 'ach', label: 'Feats', ico: '🏆', key: 'e' },
    { id: 'leaders', label: 'The Gallery', ico: '👑', key: 'l' },
    { id: 'msg', label: 'Messages', ico: '📨', key: 'n' },
    { id: 'profile', label: 'Profile', ico: '🧑‍🎤', key: 'p' },
    { id: 'help', label: 'Help', ico: '❔', key: '/' },
    { id: 'dev', label: 'Founder', ico: '🛠️', key: '0' }
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
          <div class="field"><label>Username or email</label><input name="u" autocomplete="username" placeholder="handle or you@wherever.com" maxlength="120" required></div>
          <div class="field"><label>Password</label><input name="p" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
          <div class="err"></div>
          <button class="btn primary big" style="width:100%" type="submit">Step into the yard →</button>
        </form>
        <div class="auth-links"><button data-goto="register">No ledger entry? Make one</button></div>
      </div>
      <div data-authpanel="register" style="display:none">
        <form data-form="register">
          <div class="field"><label>Email</label><input name="e" type="email" autocomplete="email" placeholder="you@wherever.com" maxlength="120" required></div>
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
        const em = (form.e.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { errEl.textContent = 'That email does not look right.'; return; }
        if (p.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
        try { await Net.post('/api/validate', { profile: { name: u } }); } catch (e) { errEl.textContent = e.message; return; }
        openCreator({ username: u, password: p, email: em });
      } else {
        try {
          const r = await Net.post('/api/login', { username: u, password: p });
          enterGame(r.me);
        } catch (e) { errEl.textContent = e.message; }
      }
    }));
  }

  // ------- character creator
  const CREATOR = { skin: 3, face: 2, hair: 8, shirt: 0, accent: 1, body: 0, eyes: 3, facial: 0, origin: 'street', name: '' };
  function openCreator(creds) {
    CREATOR.name = creds.username;
    G.creds = creds;
    screen('creator');
    renderCreator();
  }
  function avatarStr() { return [CREATOR.skin, CREATOR.face, CREATOR.hair, CREATOR.shirt, CREATOR.accent, CREATOR.body, CREATOR.eyes, CREATOR.facial].join('|'); }
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
            <h3 style="margin-top:14px">Body</h3><div class="chiprow" style="margin-top:8px">
              ${(AV.BODIES || []).map((b, i) => `<button type="button" class="chip ${CREATOR.body === i ? 'on' : ''}" data-opt="body" data-v="${i}">${typeof b === 'string' ? b : b.n}</button>`).join('')}
            </div>
            ${swatches('skin', 'Skin', AV.SKINS, 'skin')}
            ${chips('face', 'Face / style', AV.FACE_FEAT.map(x => x.n), 'face')}
            ${chips('hair', 'Hair / headwear', AV.HAIRS.map(x => x.n), 'hair')}
            ${swatches('shirt', 'Top', AV.SHIRTS, 'shirt')}
            ${swatches('accent', 'Trinket', AV.ACCENTS, 'accent')}
            ${chips('eyes', 'Eyes', (AV.EYE_NAMES || []), 'eyes')}
            ${chips('facial', 'Facial hair', (AV.FACIALS || []).map(x => x.n), 'facial')}
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
        username: G.creds.username, password: G.creds.password, email: G.creds.email,
        profile: { name: CREATOR.name, origin: CREATOR.origin, avatar: avatarStr(), bio: $('#cbio').value }
      });
      enterGame(r.me);
    } catch (e) { err.textContent = e.message; go.disabled = false; go.textContent = '🎩 Walk into Razor Town'; }
  }

  // ================================================================ ENTER GAME
  // Any account without a linked email is asked to add one once, up front — the game
  // waits. From then on the email can log the account in (username keeps working too).
  function renderEmailGate() {
    G.needsEmail = true;
    $('#modal-root').innerHTML = `
      <div class="modal-back"></div>
      <div class="modal-card" style="width:min(420px,94vw)">
        <div class="subhead" style="color:var(--cyn)">📮 Hook an email to your ledger</div>
        <p style="color:var(--mut);font-size:13px;line-height:1.5">One-time job for accounts from before the wire went up: add an email once. After this it can log you in, and the town uses it to prove you're a real player. Your character, cash and passes all stay exactly as they are.</p>
        <div class="field"><label>Email</label><input id="gate-email" type="email" maxlength="120" placeholder="you@wherever.com" autocomplete="email"></div>
        <div class="err" id="gate-err"></div>
        <button class="btn primary big" style="width:100%" data-act="gate_email">Hook it up →</button>
      </div>`;
    const gi = $('#gate-email'); if (gi) gi.focus();
  }
  async function gateEmail() {
    const em = ($('#gate-email') || { value: '' }).value.trim();
    const err = $('#gate-err');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { if (err) err.textContent = 'That email does not look right.'; return; }
    try {
      await Net.post('/api/account/email', { email: em });
      G.needsEmail = false; if (G.me) G.me.needs_email = false;
      $('#modal-root').innerHTML = '';
      U.toast('Email hooked. You can log in with it from now on.', 'good');
    } catch (e) { if (err) err.textContent = e.message; }
  }
  function enterGame(me) {
    G.me = me; G.authed = true; G.prev = me;
    screen('game');
    if (me.needs_email) renderEmailGate();
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
        ${point('happy', '🙂', 'Happy', me.happy, me.max_happy || 100)}
        ${point('xp', '⭐', 'XP', me.xpInto, me.xpNeed)}
      </div>` : `<div class="hud-lockchip">${hosp ? '🏥 In the hospital' : '⛓ In jail'} — the clock is your only friend here.</div>`}
      <div class="hud-spacer"></div>
      <div class="hud-money" title="cash on you (lootable) / branch balance">
        <span class="cash mono" id="cash-val">${money(me.money)}</span>
        <span class="banked mono" id="bank-val">🏦 ${money(me.bank)}</span>
      </div>
      <button class="iconbtn" data-act="street_snack" title="Grab the cheapest street food">🌯</button>
      <button class="iconbtn" data-act="transfer" title="Money transfer — wire cash to a citizen, or move money in and out of the branch">💸</button>
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
    { id: 'hustle', name: 'The Hustle', ico: '🧢', tabs: ['crime', 'jail', 'attack', 'gym', 'job', 'college', 'merits', 'bounty'] },
    { id: 'street', name: 'The 2026 Streets', ico: '🌃', tabs: ['arcade', 'hustle', 'life', 'garage', 'turf', 'informants'] },
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
      const disable = lock && ['gym', 'job', 'attack', 'casino'].includes(tid);
      const badge = tid === 'items' && carried ? `<span class="rail-count neutral">${carried}</span>` : (tid === 'msg' && me.unread ? `<span class="rail-count">${me.unread}</span>` : '');
      return `<button class="rail-item ${G.view === tid ? 'on' : ''} ${disable ? 'rail-dis' : ''}" data-nav="${tid}" ${disable ? 'disabled' : ''}><span class="ico">${tb.ico}</span><span class="rl">${tb.label}</span>${badge}<span class="kbd">${tb.key}</span></button>`;
    };
    let html = itemBtn('city');
    for (const g of SIDE_GROUPS.map(g => (g.id === 'crew' && me.dev) ? { ...g, tabs: [...g.tabs, 'dev'] } : g)) {
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
    const MOBILE_TABS = ['city', 'crime', 'jail', 'items', 'bank', 'msg'];
    mnav.innerHTML = MOBILE_TABS.map(tid => { const tb = tabOf(tid); return `<button class="mnav-item ${G.view === tid ? 'on' : ''}" data-nav="${tid}"><span class="ico">${tb.ico}</span><span>${tb.label}</span>${tid === 'msg' && me.unread ? `<span class="unread-badge">${me.unread}</span>` : ''}</button>`; }).join('')
      + `<button class="mnav-item" data-act="side_toggle"><span class="ico">☰</span><span>Menu</span></button>`;
    $$('#mobile-nav [data-nav]').forEach(b => b.addEventListener('click', () => nav(b.dataset.nav)));
  }

  // ================================================================ NAV
  function nav(view, arg) {
    if (!G.me) return;
    G.view = view;
    clearRaceTimer();
    $$('.rail-item').forEach(x => x.classList.toggle('on', x.dataset.nav === view));
    $$('.mnav-item').forEach(x => x.classList.toggle('on', x.dataset.nav === view));
    $$('.rail-item').forEach(x => { if (x.disabled && ['crime','gym','job','attack','casino'].includes(x.dataset.nav)) return; });
    const v = $('#view');
    v.innerHTML = '<div class="skeleton"></div>';
    v.scrollTop = 0;
    const jail = G.me.jail_until && G.me.jail_until > Date.now();
    const hosp = G.me.hosp_until && G.me.hosp_until > Date.now();
    // cover lifecycle: the custody cover must never sit on the yard, the cells, or founder tools — and drops on release
    if (!(jail || hosp) || view === 'crime' || view === 'jail' || view === 'dev') { const oldCover = $('#lock-cover'); if (oldCover) oldCover.remove(); }
    const renders = { city: renderCity, crime: renderCrime, attack: renderAttack, gym: renderGym, job: renderJob, market: renderMarket, items: renderItems, bank: renderBank, property: renderProperty, college: renderCollege, merits: renderMerits, bounty: renderBounty, casino: renderCasino, faction: renderFaction, ach: renderAch, leaders: renderLeaders, jail: renderJail, msg: renderMsg, profile: renderProfile, help: renderHelp, dev: renderDev,
      arcade: renderArcade, hustle: renderHustle, street: renderStreet, garage: renderGarage, turf: renderTurf, informants: renderInformants };
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
      if (G.view === 'crime' || G.view === 'jail' || G.view === 'dev') return;   // the yard, the cells AND founder tools stay tappable behind bars
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
      if (name.startsWith('faction') || name.startsWith('farmory') || name === 'fbank_in' || name === 'fbank_out' || name === 'fupgrade' || name === 'fannounce' || name === 'fpromote') {
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
  // fire-and-forget action with result — used by the 2026 systems (arcade, hustles…)
  async function actCatch(name, payload) {
    const r = await Net.post('/api/action', Object.assign({}, payload || {}, { name })).catch(err => { U.toast(esc(err && err.message || 'The city shrugged.'), 'bad'); return null; });
    if (r && (r.ok || r.p)) { if (r.p) applyMe(r.p, r.res); return r; }
    if (r && r.err) { U.toast(esc(r.err), 'bad'); return null; }
    return r;
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
    const keeps = { city: renderCity, crime: renderCrime, attack: renderAttack, gym: renderGym, job: renderJob, market: renderMarket, items: renderItems, bank: renderBank, property: renderProperty, college: renderCollege, merits: renderMerits, bounty: renderBounty, casino: renderCasino, faction: renderFaction, ach: renderAch, profile: renderProfile, jail: renderJail, dev: renderDev,
      arcade: renderArcade, hustle: renderHustle, street: renderStreet, garage: renderGarage, turf: renderTurf };
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
      <div class="scene-sub">CRASH · your line pumped to <b style="color:var(--cyn)">${mult.toFixed(2)}x</b> before coming down at ${(res.crash || 0).toFixed(2)}x</div>
      ${res.win ? `<div class="scene-cash">${money(res.pay)}</div>` : `<p style="color:var(--bad);font-weight:700">You lost ${money(res.bet)}.</p>`}
      <div class="scene-actions"><button class="btn primary" data-act="close-scene">Leave the floor</button></div></div></div>`;
  }

  // ================================================================ VIEWS
  // ---- HOME
  async function renderDev() {
    const v = $('#view');
    v.innerHTML = U.spinner('Opening the founder ledger…');
    let panel;
    try { panel = await Net.get('/api/dev/panel'); } catch (e) { v.innerHTML = `<div class="card"><p style="color:var(--bad)">${esc(e.message)}</p></div>`; return; }
    const me = G.me;
    const claims = panel.claims || [];
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🛠️ <span class="head">Founder Tools</span></div>
      <div class="vdesc">Your sheet, your ledger. Founder accounts see this page — nobody else. Broadcasts are the only thing that goes to the wire.</div></div>
      <div class="pill"><span>${panel.players.length} players in town</span> <b style="color:var(--cyn)">${claims.length} payment claims waiting</b></div></div>

      <div class="card"><div class="subhead" style="color:var(--gold)">🧰 Self tools — ${esc(me.name)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn sm ok" data-act="dev_self" data-op="refill">Refill all bars</button>
          <button class="btn sm" data-act="dev_self" data-op="heal">Heal to full</button>
          <button class="btn sm" data-act="dev_self" data-op="clear_status">Clear jail & hospital</button>
          <button class="btn sm" data-act="dev_self" data-op="clear_jail">Clear jail only</button>
          <button class="btn sm" data-act="dev_self" data-op="clear_hospital">Clear hospital</button>
          <button class="btn sm gold" data-act="dev_self" data-op="grant_cash">Give me $100,000 cash</button>
          <button class="btn sm gold" data-act="dev_self" data-op="grant_bank">Bank me $500,000</button>
          <button class="btn sm gold" data-act="dev_self" data-op="give_vault">+Vault $100k</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <input class="in" id="dev-amt" style="width:120px" type="number" placeholder="amount" value="100000">
          <button class="btn sm" data-act="dev_self" data-op="grant_cash" data-amt="1">Cash ↑</button>
          <button class="btn sm" data-act="dev_self" data-op="grant_bank" data-amt="1">Bank ↑</button>
          <button class="btn sm" data-act="dev_self" data-op="set_money">Set cash =</button>
          <input class="in" id="dev-lvl" style="width:80px" type="number" min="1" max="100" placeholder="level">
          <button class="btn sm" data-act="dev_self" data-op="set_level">Set my level</button>
          <select class="in" id="dev-item" style="width:210px">${Object.entries(G.meta.items).map(([iid, it]) => `<option value="${iid}">${it.icon} ${esc(it.name)}</option>`).join('')}</select>
          <input class="in" id="dev-qty" style="width:64px" type="number" min="1" max="99" value="1">
          <button class="btn sm" data-act="dev_self" data-op="grant_item">Grant item</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_all_items">Grant all items ×1</button>
          <button class="btn sm ok" data-act="dev_self" data-op="max_stats">Max all stats</button>
          <select class="in" id="dev-stat" style="width:90px"><option value="st">STR</option><option value="de">DEF</option><option value="sp">SPD</option><option value="dx">DEX</option></select>
          <input class="in" id="dev-stat-val" style="width:70px" type="number" min="1" max="200" value="100">
          <button class="btn sm" data-act="dev_self" data-op="set_stat">Set stat</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_xp">+5k XP</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_rep">+5k Rep</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_merit">+1 Merit</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <button class="btn sm ghost" data-act="dev_self" data-op="reset_cooldowns">Reset cooldowns</button>
          <button class="btn sm ghost" data-act="dev_self" data-op="time_warp">Time-warp course/jail</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="unlock_all_courses">Unlock all courses</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="unlock_all_achievements">Unlock all feats</button>
          <button class="btn sm gold" data-act="dev_self" data-op="spawn_car">Spawn random car</button>
          <button class="btn sm gold" data-act="dev_self" data-op="grant_pass">Give 7-day pass</button>
          <button class="btn sm gold" data-act="dev_self" data-op="grant_founder_pass">Give founder ∞</button>
          <button class="btn sm bad" data-act="dev_self" data-op="revoke_pass">Revoke pass</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
          <button class="btn sm gold" data-act="dev_self" data-op="god_mode">⚡ God mode</button>
          <button class="btn sm" data-act="dev_self" data-op="fill_energy">Fill energy</button>
          <button class="btn sm" data-act="dev_self" data-op="fill_nerve">Fill nerve</button>
          <button class="btn sm" data-act="dev_self" data-op="fill_happy">Fill happy</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_influence">+500 influence</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="grant_followers">+1k followers</button>
          <button class="btn sm gold" data-act="dev_self" data-op="spawn_all_cars">Spawn every car</button>
          <button class="btn sm bad" data-act="dev_self" data-op="jail_self">Jail me 10m</button>
          <button class="btn sm bad" data-act="dev_self" data-op="wipe_items">Empty bag</button>
        </div>
        <div class="subhead" style="color:var(--cyn);margin-top:12px">🧪 Rainlight & network tools</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="btn sm gold" data-act="dev_self" data-op="make_whole">🧬 Make me whole (stats · level 100 · bars · courses · feats)</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="random_look">🎲 Roll me a random look</button>
          <button class="btn sm cyan" data-act="dev_self" data-op="give_all_tips">🕵️ Give me every tip</button>
          <button class="btn sm ghost" data-act="dev_self" data-op="clear_tips">Clear my tips</button>
          <button class="btn sm" data-act="dev_self" data-op="comp_leads">Comp every lead on my board</button>
          <button class="btn sm" data-act="dev_self" data-op="cool_heat">Cool my street heat</button>
          <button class="btn sm" data-act="dev_self" data-op="set_happy">Set happy =</button>
        </div>
        <div style="border-top:1px solid var(--line);margin:14px 0 10px"></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="color:var(--bad);font-size:11px;font-weight:800;letter-spacing:.08em">DANGER:</span>
          <input class="in" id="dev-wipe-confirm" style="width:200px" placeholder="type WIPE to unlock">
          <button class="btn sm bad" data-act="dev_self" data-op="reset_self">Reset my character to brand new</button>
        </div>
      </div>

      <div class="card"><div class="subhead" style="color:var(--cyn)">🌐 World tools — any player</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select class="in" id="dev-target" style="width:250px">${panel.players.map(tp => `<option value="${tp.acc_id}">${esc(tp.name)} (@${esc(tp.username)}) · L${tp.level} · $${(tp.money || 0).toLocaleString()}${tp.dev ? ' · DEV' : ''}</option>`).join('')}</select>
          <input class="in" id="dev-wamt" style="width:120px" type="number" placeholder="amount" value="100000">
          <button class="btn sm gold" data-act="dev_world" data-op="grant_cash">Give cash</button>
          <button class="btn sm gold" data-act="dev_world" data-op="grant_bank">Bank</button>
          <button class="btn sm" data-act="dev_world" data-op="set_money">Set cash =</button>
          <button class="btn sm ok" data-act="dev_world" data-op="clear_status">Clear jail/hosp</button>
          <button class="btn sm ok" data-act="dev_world" data-op="heal">Heal</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <button class="btn sm cyan" data-act="dev_world" data-op="grant_item">Grant random item</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="grant_all_items">Grant all items</button>
          <button class="btn sm ok" data-act="dev_world" data-op="max_stats">Max stats</button>
          <button class="btn sm" data-act="dev_world" data-op="grant_xp">+5k XP</button>
          <button class="btn sm" data-act="dev_world" data-op="grant_rep">+5k Rep</button>
          <button class="btn sm" data-act="dev_world" data-op="grant_merit">+1 Merit</button>
          <button class="btn sm ghost" data-act="dev_world" data-op="reset_cooldowns">Reset CDs</button>
          <button class="btn sm ghost" data-act="dev_world" data-op="time_warp">Time-warp</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="unlock_all_courses">Unlock courses</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="unlock_all_achievements">Unlock feats</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="give_vault">+Vault 100k</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="set_level_target">Set level</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="grant_sub">Give 7-day pass</button>
          <button class="btn sm gold" data-act="dev_world" data-op="founder_sub">Give founder ∞</button>
          <button class="btn sm bad" data-act="dev_world" data-op="revoke_sub">Revoke pass</button>
          <button class="btn sm bad" data-act="dev_world" data-op="hospital">Hospital 30m</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input class="in" id="dev-msg" style="flex:1" maxlength="200" placeholder="announcement to the whole town wire (reads: FOUNDER: …)">
          <button class="btn sm warn" data-act="dev_world" data-op="announce">Broadcast</button>
        </div>
        <div style="border-top:1px solid var(--line);margin:14px 0 10px"></div>
        <div class="subhead" style="color:var(--dim);font-size:12px">🗂 Account directory — inspect, ban, reset</div>
        <div style="display:grid;gap:6px">
        ${panel.players.map(tp => {
          const uuid = 'devx-' + tp.acc_id;
          const badges = `${tp.sub && tp.sub.active ? '<span class="chip gold" style="min-height:18px;height:18px;padding:0 7px;font-size:9px">PASS</span>' : ''}${tp.dev ? '<span class="chip cyn" style="min-height:18px;height:18px;padding:0 7px;font-size:9px">DEV</span>' : ''}${tp.banned ? '<span class="chip bad" style="min-height:18px;height:18px;padding:0 7px;font-size:9px">BANNED</span>' : ''}`;
          return `<div class="itemrow" style="align-items:center"><span class="ic">${tp.banned ? '⛔' : '🧑'}</span>
            <div class="nm"><b>${esc(tp.name)} <small style="color:var(--dim)">@${esc(tp.username)}</small></b>
            <small>L${tp.level} · $${(tp.money || 0).toLocaleString()} / bank $${(tp.bank || 0).toLocaleString()} ${badges}</small></div>
            <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn sm" data-act="dev_info" data-target="${tp.acc_id}" data-x="${uuid}">Inspect</button>
              ${tp.banned ? `<button class="btn sm ok" data-act="dev_world" data-op="unban" data-tid="${tp.acc_id}">Unban</button>`
                          : (tp.dev ? '' : `<button class="btn sm bad" data-act="dev_world" data-op="ban" data-tid="${tp.acc_id}">Ban</button>`)}
              ${tp.dev ? '' : `<button class="btn sm" data-act="dev_world" data-op="set_password" data-tid="${tp.acc_id}">Set password</button>`}
              ${tp.dev ? '' : (G.devArm === tp.acc_id
                ? `<span style="display:flex;gap:4px;align-items:center"><input class="in" id="dev-del-inp" style="width:130px;height:26px" placeholder="type @${esc(tp.username)}">
                   <button class="btn sm bad" data-act="dev_del_go" data-tid="${tp.acc_id}" data-uname="${esc(tp.username)}">Strike off — this is forever</button></span>`
                : `<button class="btn sm bad" data-act="dev_del_arm" data-tid="${tp.acc_id}" data-uname="${esc(tp.username)}">Delete</button>`)}
            </div></div>
          <div class="card" id="${uuid}" style="display:none;margin:0 0 6px;background:var(--bg1)">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:6px;font-size:12px">
              <div><small class="dimtext">Account</small><br>#${tp.acc_id} · @${esc(tp.username)}</div>
              <div><small class="dimtext">Email</small><br>${tp.email ? esc(tp.email) : '<span style="color:var(--bad)">not linked yet</span>'}</div>
              <div><small class="dimtext">Password</small><br><span class="dimtext">one-way hashed — can't be read, only replaced</span></div>
              <div><small class="dimtext">Joined</small><br>${tp.created ? new Date(tp.created).toLocaleDateString() : '—'}</div>
              <div><small class="dimtext">Last active</small><br>${tp.active ? new Date(tp.active).toLocaleString() : '—'}</div>
              <div><small class="dimtext">Ban</small><br>${tp.banned ? `<span style="color:var(--bad)">banned${tp.ban_reason ? ' — ' + esc(tp.ban_reason) : ''}</span>` : '<span style="color:var(--ok)">clean</span>'}</div>
            </div>
          </div>`;
        }).join('')}
        </div>
      </div>

      <div class="card"><div class="subhead" style="color:var(--cyn)">🌍 World dials & live ops</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select class="in" id="dev-weather" style="width:150px">
            <option value="auto">Weather: automatic</option>
            <option value="clear">Clear skies</option><option value="rain">Rain</option><option value="fog">Fog</option>
            <option value="wind">High wind</option><option value="storm">Storm</option><option value="heat">Heatwave</option>
          </select>
          <button class="btn sm" data-act="dev_world" data-op="weather">Force weather</button>
          <select class="in" id="dev-event" style="width:190px">${(G.meta.events || []).map(e => `<option value="${e.id}">${esc(e.name || e.id)}</option>`).join('')}</select>
          <button class="btn sm" data-act="dev_world" data-op="event">Trigger city event</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <span style="font-size:11px;color:var(--dim)">Economy dials (crime payout % · danger %)</span>
          <input class="in" id="dev-dial-payout" style="width:80px" type="number" min="10" max="400" value="100">
          <input class="in" id="dev-dial-danger" style="width:80px" type="number" min="10" max="400" value="100">
          <button class="btn sm gold" data-act="dev_world" data-op="economy">Apply dials</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <input class="in" id="dev-bots" style="width:70px" type="number" min="1" max="10" value="3">
          <button class="btn sm cyan" data-act="dev_world" data-op="spawn_bot">Spawn NPC citizens</button>
          <button class="btn sm bad" data-act="dev_world" data-op="purge_bots">Purge every NPC</button>
          <button class="btn sm" data-act="dev_world" data-op="metrics">📊 Live metrics</button>
        </div>
        <div id="dev-metrics" style="margin-top:10px"></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <select class="in" id="dev-tipkind" style="width:170px">${['edge','payoff','fence','bail','muscle','crew','heat','patch','market','bribe'].map(k => `<option value="${k}">${k}</option>`).join('')}</select>
          <button class="btn sm cyan" data-act="dev_world" data-op="give_tip">Give that tip</button>
          <button class="btn sm ghost" data-act="dev_world" data-op="wipe_tips">Wipe their tips</button>
          <button class="btn sm cyan" data-act="dev_world" data-op="set_look">Re-roll their look</button>
          <button class="btn sm ok" data-act="dev_world" data-op="heal_target">Heal them</button>
          <button class="btn sm" data-act="dev_world" data-op="cool_heat_target">Cool their heat</button>
        </div>
      </div>

      <div class="card"><div class="subhead" style="color:var(--gold)">💳 Payment claims</div>
        ${claims.length ? claims.map(c => `<div class="itemrow"><span class="ic">💳</span>
          <div class="nm"><b>#${c.id} · ${esc(c.name)} <small style="color:var(--dim)">@${esc(c.username)}</small></b>
          <small>${esc(c.method)} · ref “${esc(c.ref)}” · filed ${new Date(c.ts).toLocaleString()}</small></div>
          <div class="acts">
            <button class="btn sm ok" data-act="dev_pay" data-claim="${c.id}" data-approve="1">Approve · 7-day pass</button>
            <button class="btn sm bad" data-act="dev_pay" data-claim="${c.id}" data-approve="0">Decline</button>
          </div></div>`).join('') : `<p style="color:var(--dim);font-size:12px;margin:4px 0 0">No claims waiting.</p>`}
      </div>`;
  }

  // ================================================================ THE YARD — the prison you live through
  function renderPrison() {
    clearTimeout(G.prisonTick);
    const me = G.me, v = $('#view');
    const left = Math.max(0, me.jail_until - Date.now());
    const minsL = Math.max(1, Math.ceil(left / 60000));
    const bailCost = Math.round((400 + minsL * 22) * (1 + Math.min(2, (me.level || 1) / 40)));
    const pr = me.prison || { cigs: 0, shift_in: 0, gym_in: 0, gamble_in: 0, bust_in: 0, shifts: 0, busts: 0 };
    const cd = (ms) => ms > 0 ? ' · ' + Math.ceil(ms / 60000) + ' min cooldown' : '';
    const canAffordBail = (me.money + me.bank) >= bailCost;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">⛓ <span class="head">THE YARD</span></div>
      <div class="vdesc">Banged up with ${fmtDur(left)} left on the clock — but the sentence is only dead time if you let it be. Work, lift, play the man, buy the door, or go through the wall.</div></div>
      <div class="pill" style="display:flex;align-items:center;gap:8px"><span style="width:34px;border-radius:4px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.2);display:inline-block">${AV.mugshot(me.avatar, 34, me.name)}</span><span style="color:var(--bad)">⛓ ${fmtDur(left)} left</span> <b style="color:var(--gold)">🚬 ${pr.cigs} cigarettes</b></div></div>

      <div class="card"><div class="subhead">🧺 Ways to make the time pay</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">
          <div class="itemrow"><span class="ic">🧺</span><div class="nm"><b>Laundry shift</b><small>15 min blocks · +2–3 cigarettes · +4 XP (done ${pr.shifts || 0} shifts)</small></div>
            <div class="acts"><button class="btn sm ok" data-act="prison" data-op="work" ${pr.shift_in > 0 ? 'disabled' : ''}>Work${cd(pr.shift_in) || ''}</button></div></div>
          <div class="itemrow"><span class="ic">🏋️</span><div class="nm"><b>Yard weights</b><small>20 min cooldown · +1 strength/defence/speed · +3 XP</small></div>
            <div class="acts"><button class="btn sm" data-act="prison" data-op="gym" ${pr.gym_in > 0 ? 'disabled' : ''}>Lift${cd(pr.gym_in) || ''}</button></div></div>
          <div class="itemrow"><span class="ic">🎲</span><div class="nm"><b>Corner game</b><small>Stake 1–10 cigarettes · even dice, house keeps nothing</small></div>
            <div class="acts" style="display:flex;gap:6px;align-items:center"><input class="in" id="prison-stake" style="width:64px" type="number" min="1" max="10" value="2">
            <button class="btn sm gold" data-act="prison" data-op="gamble" ${pr.gamble_in > 0 ? 'disabled' : ''}>Roll${cd(pr.gamble_in) || ''}</button></div></div>
        </div>
      </div>

      <div class="card"><div class="subhead" style="color:var(--gold)">🚪 The two doors out</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">
          <div class="itemrow"><span class="ic">🎫</span><div class="nm"><b>Post bail</b><small>$${bailCost.toLocaleString()} — scales with what's left and your name. Cash first, then bank.</small></div>
            <div class="acts"><button class="btn sm cyan" data-act="prison" data-op="bail" ${canAffordBail ? '' : 'disabled'}>Buy the door</button></div></div>
          <div class="itemrow"><span class="ic">🔧</span><div class="nm"><b>Go through the wall</b><small>${Math.min(45, 10 + Math.round((me.nerve || 0) * 0.5))}% by your nerve · fail = +14 min and a shakedown</small></div>
            <div class="acts"><button class="btn sm bad" data-act="prison" data-op="bust" ${pr.bust_in > 0 ? 'disabled' : ''}>Bust out${cd(pr.bust_in) || ''}</button></div></div>
        </div>
        ${left <= 0 ? '' : `<p style="color:var(--dim);font-size:11.5px;margin:10px 0 0">Your network keeps working: messages, bounties and the wire all still reach you.</p>`}
      </div>

      <div class="card"><div class="subhead" style="color:var(--dim)">🗞 How the block works</div>
        <p style="color:var(--mut);font-size:12.5px;line-height:1.55">Cigarettes are the only money that moves in here — earn them in the laundry, grow them on the dice, smuggle them back out when the door opens. Jail refreshes your energy when the sentence ends on its own; bailing buys that clock back out of your own pocket. Escapes log on the town wire, win or lose.</p>
      </div>`;
    G.prisonTick = setTimeout(() => { if (G.view === 'crime' && G.me && G.me.jail_until && G.me.jail_until > Date.now()) renderPrison(); }, 30000);
  }
  async function prisonGo(btn) {
    const op = btn.dataset.op;
    const payload = { name: 'prison', op };
    if (op === 'gamble') payload.stake = parseInt(($('#prison-stake') || { value: '1' }).value, 10) || 1;
    try {
      const r = await Net.post('/api/action', payload);
      if (r.p) applyMe(r.p, r.res);
      if (r.res && r.res.text) U.toast(esc(r.res.text), r.res.busted ? 'bad' : 'good');
      renderHUD(); renderRail();
      if (G.view === 'crime') renderCrime();
    } catch (e) { U.toast('⚠️ ' + esc(e.message), 'bad'); }
  }

  // ---- THE CELLS — live custody roster; post anyone's bail
  async function renderJail() {
    const me = G.me, v = $('#view');
    const now = Date.now();
    if (me.jail_until && me.jail_until > now) { renderPrison(); return; }   // your own stretch: the yard
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">⛓️ <span class="head">The Cells</span></div>
      <div class="vdesc">The custody roster, live. Friends, family and creative accountants open each other's doors here — paid to the state, never the citizen.</div></div>
      <div id="jail-board" style="max-width:680px"><div class="skeleton"></div></div>`;
    try {
      const d = await Net.get('/api/jail');
      const el = document.getElementById('jail-board'); if (!el || G.view !== 'jail') return;
      const rows = (d.inmates || []);
      if (!rows.length) { el.innerHTML = `<div class="card" style="text-align:center"><p style="color:var(--dim);font-size:13px;margin:6px 0">The cells are quiet right now. Even the regulars are walking around outside.</p></div>`; return; }
      el.innerHTML = rows.map(r => {
        const mins = Math.max(1, Math.ceil(r.left / 60000));
        const can = (me.money + me.bank) >= r.bail && me.acc_id !== r.id;
        return `<div class="card" style="display:flex;gap:10px;align-items:center;padding:9px 10px;width:100%;box-sizing:border-box;margin:0 0 10px 0">
          <div style="width:56px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.14)">${AV.mugshot(r.avatar, 56, r.name)}</div>
          <div style="flex:1;min-width:0"><b>${esc(r.name)}</b> <span style="color:var(--dim);font-size:12px">lvl ${r.level}${r.busts ? ' · ' + r.busts + ' escape' + (r.busts > 1 ? 's' : '') + ' priors' : ''}</span>
            <div style="color:var(--mut);font-size:12px">⏱ ${mins} min left</div></div>
          <div style="text-align:right"><div class="mono" style="color:var(--gold);font-weight:800">$${r.bail.toLocaleString()}</div>
            <button class="btn sm ${can ? 'gold' : 'ghost'}" data-act="bail_other" data-tid="${r.id}" ${can ? '' : 'disabled'} title="${can ? 'Post their bail' : (me.acc_id === r.id ? 'That one is yours to serve' : 'Short across cash + bank')}">Post bail</button></div>
        </div>`;
      }).join('');
    } catch (e) {
      const el = document.getElementById('jail-board');
      if (el) el.innerHTML = '<div class="card"><p style="color:var(--dim)">The custody desk is not answering. Try again in a minute.</p></div>';
    }
  }
  async function bailOther(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const r = await Net.post('/api/action', { name: 'bail_other', targetId: parseInt(btn.dataset.tid, 10) || 0 });
      if (r.p) applyMe(r.p, r.res);
      U.toast(esc((r.res && r.res.text) || 'Bail posted.'), 'good');
      renderHUD(); renderRail();
      if (G.view === 'jail') renderJail();
    } catch (e) { U.toast('⚠️ ' + esc(e.message), 'bad'); btn.disabled = false; }
  }
  async function dailyClaim() {
    try {
      const r = await Net.post('/api/action', { name: 'daily' });
      if (r.p) applyMe(r.p, r.res);
      U.toast(esc((r.res && r.res.text) || 'Collected.'), 'good');
      SND.win && SND.win();
      renderHUD();
      if (G.view === 'city') renderCity();
    } catch (e) { U.toast('⚠️ ' + esc(e.message), 'bad'); }
  }
  async function wireGo() {
    const to = ($('#wire-to') || { value: '' }).value.trim();
    const amount = parseInt(($('#wire-amt') || { value: '' }).value, 10) || 0;
    const note = ($('#wire-note') || { value: '' }).value.trim();
    try {
      const r = await Net.post('/api/action', { name: 'wire', to, amount, note });
      if (r.p) applyMe(r.p, r.res);
      U.toast(esc((r.res && r.res.text) || 'Wire sent.'), 'good');
      renderHUD();
      if (G.view === 'bank') renderBank();
    } catch (e) { U.toast('⚠️ ' + esc(e.message), 'bad'); }
  }

  function renderCity() {
    const me = G.me, m = G.meta;
    const v = $('#view');
    const origin = m.origins.find(o => o.id === me.origin);
    const inJail = me.jail_until && me.jail_until > Date.now();
    const inHosp = me.hosp_until && me.hosp_until > Date.now();
    const ctab = G.filters.city || 'yard';
    if (ctab === 'shops') { renderShopsInto(v); return; }
    if (ctab === 'board') { renderMissionsInto(v); return; }
    const dly = me.daily || { streak: 0, claimed: false, next: 400 + (me.level || 1) * 25, resetAt: 0, gangBonusPct: 0 };
    const resetIn = dly.resetAt ? fmtDur(Math.max(0, dly.resetAt - Date.now())) : 'midnight';
    const boost = dly.gangBonusPct ? ` <span class="daily-boost">+${dly.gangBonusPct}% crew bonus</span>` : '';
    const dailyCard = dly.claimed
      ? `<div class="card daily-streak-card is-collected"><span class="daily-ico">✓</span><div class="daily-copy"><b>Daily Streak secured</b><span>Day ${dly.streak} banked — return after the reset to protect it. Tomorrow's run pays ${money(dly.next)}.${boost}</span></div><span class="daily-reset">↻ ${resetIn}</span></div>`
      : `<div class="card daily-streak-card"><span class="daily-ico">⚡</span><div class="daily-copy"><b>Daily Streak</b><span>${dly.streak ? 'Day ' + dly.streak + ' is on the line — claim now to keep it alive.' : 'Start your streak. Your return gets better every day.'}${boost}</span></div><div class="daily-action"><span class="daily-reset">↻ ${resetIn}</span><button class="btn sm gold" data-act="daily_claim">Collect ${money(dly.next)}</button></div></div>`;
    v.innerHTML = dailyCard + `
      <div id="city-sys"></div>
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
    renderCitySys();
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
    if (jail) { renderPrison(); return; }
    const list = m.crimes.filter(c => cat === 'all' || c.cat === cat);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🧢 <span class="head">Crime Ring</span></div>
      <div class="vdesc">Every job costs nerve + energy. Higher skills raise your odds and payout. Success keeps a spree alive — busts end it.</div></div>
      ${!jail && !hosp ? `<div class="pill"><span style="color:var(--mut)">🧠 Nerve</span> <b class="mono" style="color:var(--ok)">${Math.floor(me.nerve)}</b><span style="color:var(--dim)">/</span><b class="mono">${me.max_nerve}</b></div>` : ''}</div>
      <div class="filterrow">${cats.map(([id, name, ic]) => `<button class="minitab ${cat === id ? 'on' : ''}" data-fil="cat" data-v="${id}">${ic} ${name}</button>`).join('')}</div>
      ${heistStrip(me)}
      <div class="card" style="background:none;border:none;padding:0">
      ${list.map((c) => crimeRow(c, me)).join('') || '<p style="color:var(--dim)">Nothing here yet.</p>'}
      </div>`;
    U.bindTimers(v);
  }
  function heistStrip(me) {
    const hs = me.heists || {};
    const names = { courier: 'The Exchange Run', ledger: 'The Ghost Ledger', crown: 'The Crown Suite' };
    const acts = Object.entries(hs).filter(([, h]) => h && ((h.stage || 0) > 0 || (h.cool || 0) > Date.now()));
    if (!acts.length) return '';
    return `<div class="card" style="padding:10px 14px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;border-color:rgba(212,175,55,.35)">
      <span style="font-size:10.5px;letter-spacing:1.2px;color:var(--gold)">🎯 OPEN HEISTS</span>${acts.map(([g, h]) => {
        const cooling = (h.cool || 0) > Date.now();
        const stg = h.stage || 0;
        return `<div style="display:flex;align-items:center;gap:8px"><b style="font-size:13px">${names[g] || g}</b>
          ${cooling ? `<small style="color:var(--dim)">crew lying low ${Math.ceil((h.cool - Date.now()) / 60000)}m</small>`
            : `<span style="color:var(--gold);letter-spacing:2px">${'●'.repeat(stg)}${'○'.repeat(3 - stg)}</span><small style="color:var(--mut)">stage ${stg} banked</small>
               <button class="chip sm" data-act="heist_walk" data-group="${g}">Walk away</button>`}
        </div>`; }).join('')}</div>`;
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
    let canDo = meetLvl && hasNerve && hasEnergy && !(me.jail_until) && !(me.hosp_until);
    let heistNote = '';
    if (c.heist) {
      const hh = (me.heists && me.heists[c.heist.group]) || { stage: 0, cool: 0 };
      const stageWords = ['the recon', 'the approach'];
      if ((hh.cool || 0) > Date.now()) { heistNote = '💤 crew lying low after the score'; canDo = false; }
      else if ((hh.stage || 0) + 1 !== c.heist.step) { heistNote = (hh.stage || 0) >= c.heist.step ? '✔ banked — next stage is the live one' : '🔒 finish ' + (stageWords[c.heist.step - 2] || 'earlier stages') + ' first'; canDo = false; }
      else heistNote = '🎯 chain stage ' + c.heist.step + ' of 3 armed';
    }
    const chance = crimeChance(me, c);
    const highRisk = !meetLvl && (c.req.dx || 0) > me.stats.dx + 40;
    const banner = !meetLvl ? 'lvl ' + c.lvl : '';
    return `<button class="crime ${canDo ? '' : 'dim'}" data-act="crime" data-crime="${c.id}" ${canDo ? '' : 'disabled'}>
      <div class="req ${meetLvl ? 'reqmeet' : 'reqmiss'}"><span>${c.nerve}</span><small>nerve</small></div>
      <div class="main"><b>${esc(c.name)}${banner ? ` <span style="color:var(--bad)">(${banner})</span>` : ''}</b>
      <span>${esc(c.blurb)}</span>
      <span style="color:var(--dim)">⚡ ${energyCost} energy · ${reqStats ? 'needs ' + reqStats : 'no stat req'}</span>
      ${heistNote ? `<span style="color:${heistNote[0] === '🎯' ? 'var(--gold)' : 'var(--mut)'};font-weight:600">${heistNote}</span>` : ''}</div>
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
      <div class="grid2" id="items-sys"></div>
      ${owned.length === 0 ? `<div class="card"><p style="color:var(--dim);text-align:center">You're carrying nothing. Head down the market.</p></div>` : ''}
      <div class="card" style="background:none;border:none;padding:0">
      ${grouped.map(([id, q]) => {
        const it = m.items[id];
        const canUse = it.type !== 'loot' && it.type !== 'gear';
        return `<div class="itemrow"><span class="ic">${it.icon}</span>
        <div class="nm"><b>${esc(it.name)}</b>${it.equip ? ` <small style="color:var(--cyn)">${it.equip.slot === 'weapon' ? '+' + it.equip.atk + '% attack' : '+' + it.equip.def + '% defense'}</small>` : ''}<small>${esc(it.desc)}</small></div>
        <div class="acts">
        <span class="qtychip">×${q}</span>
        ${typeof it.sell === 'number' ? `<span class="qtychip" style="color:var(--gold)">${money(it.sell * q)}</span>` : ''}
        ${it.equip ? `<button class="btn sm ok" data-act="equip" data-item="${id}">${it.equip.slot === 'weapon' ? 'Carry' : 'Wear'}</button>` : ''}
        ${canUse ? `<button class="btn sm" data-act="use" data-item="${id}">Use</button>` : ''}
        ${typeof it.sell === 'number' ? `<button class="btn sm ghost" data-act="sell" data-item="${id}">Sell</button>` : ''}
        </div></div>`;
      }).join('')}</div>`;
    const bq = $('#bag-q');
    if (bq) bq.addEventListener('input', () => {
      const q = bq.value.toLowerCase();
      $$('#view .itemrow').forEach(row => {
        row.style.display = !q || row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    renderItemsSys();
  }
  // ---- ITEMS EXTRAS: craft bench + trading card set
  async function renderItemsSys() {
    const wrap = $('#items-sys'); if (!wrap) return;
    const sp = await sysPanel();
    if (!sp) return;
    const me = G.me;
    const have = (id) => (me.items && me.items[id]) || 0;
    wrap.innerHTML = `
      <div class="card"><div class="subhead">🛠️ The bench — craft (${sp.craft.count} made)</div>
        ${(sp.craft.recipes || []).map(r => {
          const can = Object.entries(r.need).every(([id, n]) => have(id) >= n);
          const needs = Object.entries(r.need).map(([id, n]) => `${n}× ${(G.meta.items[id]||{}).name || id}`).join(' + ');
          return `<div class="kv" style="align-items:center"><span class="k" style="flex:1">${(G.meta.items[r.out]||{}).icon||''} <b>${(G.meta.items[r.out]||{}).name||r.out}</b> ×${r.qty||1}<br><span style="color:${can?'var(--dim)':'var(--bad)'};font-size:11px">${needs}</span></span>
            <span class="v"><button class="btn cyan xs" data-act="craft" data-recipe="${r.id}" ${can?'':'disabled'}>Craft</button></span></div>`;
        }).join('')}</div>
      <div class="card"><div class="subhead">🎴 Wire cards — ${sp.cards.owned.length}/${sp.cards.total} ${sp.cards.done ? '· <span style="color:var(--gold)">SET COMPLETE</span>' : ''}</div>
        <div style="display:flex;gap:6px;align-items:center;margin:6px 0"><span class="qtychip">packs ×${have('trading_pack')}</span>
          <button class="btn gold sm" data-act="card_open" ${have('trading_pack') ? '' : 'disabled'}>Crack a pack (5 cards)</button></div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${sp.cards.pool.map(c => {
          const n = sp.cards.owned[c] || 0;
          return `<span class="pill" style="${n ? 'color:var(--gold)' : 'color:var(--dim);opacity:.55'}" title="owned ×${n}">${n ? '★' : '☆'} ${c}${n > 1 ? ' ×' + n : ''}</span>`;
        }).join('')}</div>
        <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Complete the full set for a $50,000 payout from the collectors' circle. Packs drop from crimes and the market.</p></div>`;
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
    const wireCard = `<div class="card" style="margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:17px">📡</span><div><b style="font-size:14px">Wire cash to a citizen</b><div style="font-size:11.5px;color:var(--dim)">Person to person, settles instantly. 2% desk fee (min $5). They get a wire message either way.</div></div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><input id="wire-to" class="in" placeholder="citizen name (exact)" style="flex:1;min-width:130px"><input id="wire-amt" class="in" type="number" min="50" placeholder="$ amount" style="width:110px"><input id="wire-note" class="in" placeholder="note (optional)" maxlength="80" style="flex:1;min-width:120px"><button class="btn sm gold" data-act="wire_send">Send wire</button></div></div>`;
    const me = G.me;
    const v = $('#view');
    const sub = FIN.sub || 'bank';
    if (sub === 'stocks') { renderStocksInto(v); return; }
    if (sub === 'crypto') { renderCryptoInto(v); return; }
    const ir = (0.04 * (me.bonuses && (1 + 0) ? 1 : 1));
    v.innerHTML = wireCard + `
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
      <div class="subhead" style="margin:14px 0 8px">🧊 The 2026 desk — staking, terms & cover</div>
      <div class="grid2" id="bank-sys"></div>
      <div class="card"><div class="subhead">Security tip</div><p style="color:var(--mut);font-size:12.5px">Attackers can only take a cut of the cash you're carrying. The branch is armour — interest is the reward for using it.</p></div>`;
    renderBankSys();
  }
  function cityTabsHTML(tab) {
    return `<div class="filterrow">
      <button class="minitab ${tab === 'yard' ? 'on' : ''}" data-fil="city" data-v="yard">🏙️ The Yard</button>
      <button class="minitab ${tab === 'shops' ? 'on' : ''}" data-fil="city" data-v="shops">🏬 Corner Shops</button>
      <button class="minitab ${tab === 'board' ? 'on' : ''}" data-fil="city" data-v="board">🗃️ Mission Board</button>
    </div>`;
  }
  async function renderShopsInto(v) {
    const me = G.me;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🏬 <span class="head">Corner Shops</span></div>
      <div class="vdesc">Three counters, three neighbourhoods. Shelves restock for you at midnight — what's gone is gone until then.</div></div>
      <div class="pill"><span>Cash</span> <b class="mono" style="color:var(--gold)">${money(me.money)}</b></div></div>
      ${cityTabsHTML('shops')}
      <div class="shopgrid" id="shopgrid"><div class="card">${U.spinner('Opening the shutters…')}</div></div>`;
    let d = null;
    try { d = await Net.get('/api/shops'); } catch (e) {}
    if (G.view !== 'city' || (G.filters.city || 'yard') !== 'shops') return;   // moved on while the shutters were opening
    const grid = $('#shopgrid');
    if (!grid) return;
    if (!d || !d.shops || !d.shops.length) {
      grid.innerHTML = `<div class="card" style="text-align:center"><p style="color:var(--dim);font-size:13px;margin:6px 0 12px">Shutters down. The wholesaler is late.</p><button class="btn sm cyan" data-fil="city" data-v="shops">Try again</button></div>`;
      return;
    }
    grid.innerHTML = d.shops.map(s => `
      <div class="card shopcard">
        <div class="shop-head">
          <span class="shop-ico">${s.icon}</span>
          <div class="shop-title"><b>${esc(s.name)}</b><span class="shop-area">${esc(s.area)}</span></div>
        </div>
        <p class="shop-blurb">${esc(s.blurb)}</p>
        <div class="shop-stock">
          ${s.stock.map(r => {
            const soldOut = r.left <= 0;
            const afford = me.money >= r.price;
            const stockCls = soldOut ? 'out' : (r.left === 1 ? 'low' : 'plenty');
            const stockTxt = soldOut ? 'Sold out until midnight' : `${r.left} of ${r.max} left today`;
            return `<div class="shop-item">
              <span class="shop-item-ic">${r.icon || '📦'}</span>
              <div class="shop-item-info"><b>${esc(r.name)}</b><small>${esc(r.desc || '')}</small><span class="shop-left ${stockCls}">${stockTxt}</span></div>
              <div class="shop-buy">
                <b class="mono shop-price">${money(r.price)}</b>
                ${soldOut ? '<span class="shop-out">Gone</span>'
                  : `<button class="btn sm ok" data-act="shop_buy" data-shop="${s.id}" data-item="${r.item}" ${afford ? '' : 'disabled'} title="${afford ? 'Buy one — ' + stockTxt.toLowerCase() : 'Short — the counter wants ' + money(r.price)}">Buy</button>`}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');
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
  const RACE = { sel: 0, snap: null, off: 0, timer: null, ticker: null };
  const CAS_GAMES = [
    { id: 'pontoon', ico: '♠️', n: 'Blackjack', blurb: 'Beat the dealer to 21. A natural 21 pays 3:2 — five under 21 pays 2:1.' },
    { id: 'greyhound', ico: '🚀', n: 'CRASH', blurb: 'The 2026 classic. Your multiplier rockets 1x, 2x, 5x… until it all comes down. You ride it to the end tonight.' },
    { id: 'wheel', ico: '🎡', n: 'Roulette', blurb: 'Single zero on the drum. Colours and odds pay 1:1, dozens and columns 2:1, a number 35:1.' },
    { id: 'bandit', ico: '🎰', n: 'Slots', blurb: 'Three reels, instant settle. A pair returns your stake — triple sevens pay 60 to 1.' },
    { id: 'crown', ico: '🎲', n: 'Dice', blurb: 'Back one of the six signs. Every die that lands on it pays your stake times the count.' },
    { id: 'hilow', ico: '🎴', n: 'HiLo', blurb: 'One card shows. Call the next higher or lower and double your money. Ties go to the house.' },
    { id: 'spin', ico: '🍀', n: 'Big Wheel', blurb: 'One free spin every day. Keep the streak alive and the whole board fattens in your favour.' },
    { id: 'races', ico: '🏁', n: 'The Circuit', blurb: 'Six riders, real book odds, settled in minutes. Bets close when the flag drops.' }
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
      const sigs = [['crown', '🚀', 'Rocket'], ['anchor', '🛰️', 'Satellite'], ['heart', '🎯', 'Bullseye'], ['diamond', '⚡', 'Strike'], ['club', '🐺', 'Wolf'], ['spade', '💎', 'Ice']];
      return `<div class="chiprow">${sigs.map(([id, gy, nm]) => chip('pick', id, `${gy} ${nm}`)).join('')}</div>`;
    }
    if (g === 'hilow') return `<div class="chiprow">${chip('guess', 'higher', '⬆ Higher')}${chip('guess', 'lower', '⬇ Lower')}</div>`;
    return '';
  }
  function pontoonHandHtml(h, settledRes) {
    if (settledRes) {
      const lab = { 'pontoon': '♠️ BLACKJACK! Naturals pay 3:2', 'five-card-trick': '✋ FIVE-CARD 21! Pays 2:1', 'dealer-bust': 'The dealer went over', win: 'You beat the house', push: 'Push — stake returned', bust: 'BUST — over the 21', lose: 'The house takes it', 'house-pontoon': 'The dealer hit a natural' }[settledRes.outcome] || settledRes.outcome;
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
    const special = CAS.game === 'spin' || CAS.game === 'races';
    const handOpen = !special && CAS.game === 'pontoon' && ((CAS.res && CAS.res.game === 'pontoon' && CAS.res.stage === 'hand') || (!CAS.res && me.pontoon));
    const core = special ? `<div id="cas-special"></div>` : `
        ${casOptions()}
        ${handOpen ? '' : `<div class="kv" style="max-width:330px;margin:10px auto 0"><span class="k">Bet</span><span class="v" style="display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap">
          <input id="cas-bet" type="number" min="10" value="1000" step="100" style="width:110px;text-align:right">
          ${[100, 1000, 10000].map(a => `<button class="chip sm qb" data-act="casino-bet" data-v="${a}">${a >= 1000 ? (a / 1000) + 'k' : a}</button>`).join('')}
        </span></div>
        <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn gold big" id="cas-go" data-act="casino">${CAS.game === 'pontoon' ? '♠️ Deal the cards' : CAS.game === 'greyhound' ? '🎲 Back the dog' : CAS.game === 'wheel' ? '🎡 Spin the wheel' : CAS.game === 'bandit' ? '🎰 Pull the lever' : CAS.game === 'crown' ? '⚓ Roll the dice' : '🎴 Call the card'}</button>
        </div>`}
        <div id="cas-stage" style="margin-top:16px;min-height:110px;display:flex;align-items:center;justify-content:center;border-top:1px dashed var(--line);padding-top:14px">${casStageHtml(me)}</div>
        <p style="color:var(--dim);font-size:11px;margin-top:10px;text-align:center">Bets from $10 to $1,000,000. Wins put money on your name — the street keeps score.</p>`;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎰 <span class="head">The Corner Betting Shop</span></div>
      <div class="vdesc">Tables, wheels and street odds. The house always has an edge — the trick is knowing when to walk out the door.</div></div>
      <div class="pill"><span>Cash</span> <b class="mono" style="color:var(--gold)">${money(me.money)}</b></div></div>
      <div class="filterrow" id="cas-tabs">
        ${CAS_GAMES.map(x => `<button class="minitab ${CAS.game === x.id ? 'on' : ''}" data-act="casino-game" data-game="${x.id}">${x.ico} ${x.n}</button>`).join('')}
      </div>
      <div class="card">
        <div class="subhead" style="color:var(--gold)">${gm.ico} ${gm.n}</div>
        <p style="color:var(--mut);font-size:12.5px;margin:4px 0 12px">${gm.blurb}</p>
        ${core}
      </div>`;
    if (CAS.game === 'spin') mountSpin($('#cas-special'));
    if (CAS.game === 'races') mountCircuit($('#cas-special'));
  }

  // ---- THE BIG WHEEL — one free daily spin, drawn server-side, spun client-side
  function mountSpin(el) {
    if (!el) return;
    const sp = (G.me && G.me.spin) || { spun: false, streak: 0, nextStreak: 1, mult: 1, segs: [] };
    const segs = sp.segs.length ? sp.segs : ['BUSTED', '$2,000', '$5,000', 'CIGS ×10', '$12,000', 'ENERGY +30', '$25,000', 'JACKPOT $150k'];
    el.innerHTML = `
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;justify-content:center;padding-top:6px">
        <div style="position:relative;width:238px;height:238px;flex:0 0 auto">
          <div id="bigwheel" style="position:absolute;inset:8px;border-radius:50%;border:2px solid rgba(212,175,55,.45);box-shadow:0 0 22px #000a inset, 0 6px 18px #0008"></div>
          <div style="position:absolute;top:-2px;left:50%;transform:translateX(-50%);font-size:22px;z-index:3;filter:drop-shadow(0 2px 3px #000)">🔻</div>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #ffe9a8, var(--gold));color:#241a06;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;box-shadow:0 3px 10px #000c;pointer-events:none">🍀</div>
        </div>
        <div style="min-width:210px;flex:1;max-width:320px">
          <div class="kv"><span class="k">Spin streak</span><span class="v"><b>${sp.streak} day${sp.streak === 1 ? '' : 's'}</b></span></div>
          <div class="kv"><span class="k">${sp.spun ? 'Tomorrow spins as' : 'Today spins as'}</span><span class="v"><b style="color:var(--gold)">day ${sp.nextStreak}${sp.mult > 1 ? ` · ×${sp.mult}` : ''}</b></span></div>
          <div id="spin-result" style="min-height:44px;color:var(--mut);font-size:12.5px;margin-top:10px">${sp.spun ? 'The wheel is turned for today — midnight brings it back round.' : 'The wedges you see are the wedges for this spin. One pull, no buy-in.'}</div>
          <button class="btn gold big" style="margin-top:8px" id="spin-go" data-act="spin_wheel" ${sp.spun ? 'disabled' : ''}>🍀 ${sp.spun ? 'Back after midnight' : 'Spin the Big Wheel'}</button>
        </div>
      </div>`;
    const disc = $('#bigwheel');
    if (!disc) return;
    disc.style.background = `conic-gradient(${segs.map((s, i) => `${i % 2 ? '#241b10' : '#2e2415'} ${i * 45}deg ${(i + 1) * 45}deg`).join(',')})`;
    disc.style.border = '2px solid rgba(212,175,55,.45)';
    segs.forEach((lab, i) => {
      const th = i * 45 + 22.5;   // label sits in the middle of its wedge
      const labEl = document.createElement('div');
      labEl.textContent = lab;
      labEl.style.cssText = `position:absolute;top:50%;left:50%;width:86px;margin-left:-43px;margin-top:-7px;font-size:10px;font-weight:800;letter-spacing:.2px;text-align:center;color:${lab === 'BUSTED' ? 'var(--bad)' : '#e8d9b0'};pointer-events:none;transform:rotate(${th}deg) translate(78px,0) rotate(90deg);`;
      disc.appendChild(labEl);
    });
  }

  async function spinGo() {
    const go = $('#spin-go'); if (go) go.disabled = true;
    let r;
    try { r = await Net.post('/api/action', { name: 'spin_wheel' }); }
    catch (e) { U.toast(esc(e.message || 'The wheel stalls.'), 'bad'); if (go) go.disabled = false; return; }
    if (!r || !r.res) { if (go) go.disabled = false; return; }
    const disc = $('#bigwheel');
    const th = r.res.index * 45 + 22.5;   // pointer must land mid-wedge, not on a seam
    const finalDeg = 360 * 6 + ((360 - th + 360) % 360);
    if (disc) {
      disc.style.transition = 'transform 4.6s cubic-bezier(.12,.86,.16,1)';
      requestAnimationFrame(() => { disc.style.transform = `rotate(${finalDeg}deg)`; });
    }
    SND && SND.roll && SND.roll();
    setTimeout(() => {
      if (r.p) applyMe(r.p);   // re-renders the panel — then we paint the result on the FRESH nodes
      const out2 = document.getElementById('spin-result');
      if (out2) out2.innerHTML = `<b style="font-size:15px;color:${r.res.kind === 'none' ? 'var(--bad)' : 'var(--gold)'}">${esc(r.res.label)}</b><div style="margin-top:4px;color:var(--mut)">${esc(r.res.text || '')}</div>`;
      U.toast(r.res.kind === 'none' ? 'BUSTED — nothing today.' : 'The wheel pays: ' + r.res.label, r.res.kind === 'none' ? 'bad' : 'good');
      const won = r.res.kind !== 'none' && r.res.amount >= 20000;
      if (won && FX.confetti) FX.confetti();
    }, 4900);
  }

  // ---- THE CIRCUIT — live board: runners, odds, tickets, settle
  function clearRaceTimer() {
    if (RACE.timer) { clearTimeout(RACE.timer); RACE.timer = null; }
    if (RACE.ticker) { clearInterval(RACE.ticker); RACE.ticker = null; }
  }
  async function refreshCircuit() {
    const el = document.getElementById('cas-special');
    if (!el || CAS.game !== 'races' || G.view !== 'casino') { clearRaceTimer(); return; }
    clearRaceTimer();
    await mountCircuit(el);
  }
  async function mountCircuit(el) {
    clearRaceTimer();
    if (!el) return;
    el.innerHTML = `<div class="skeleton" style="min-height:170px"></div>`;
    let snap;
    try { snap = await Net.get('/api/world/races'); }
    catch (e) { el.innerHTML = `<p style="color:var(--bad);text-align:center;padding:18px 0">The board is dark — ${esc(e.message || 'no signal from the pit')}.</p>`; return; }
    RACE.snap = snap; RACE.off = snap.now - Date.now();
    const srvNow = () => Date.now() + RACE.off;
    drawCircuit(el, srvNow);
    RACE.ticker = setInterval(() => {
      const cd = document.getElementById('race-cd');
      if (!cd || !RACE.snap) return;
      const now = srvNow(); const r = RACE.snap.round;
      const lt = !r.settled ? (now < r.openUntil ? r.openUntil - now : r.runUntil - now) : 0;
      cd.textContent = lt > 0 ? Math.ceil(lt / 1000) + 's' : '—';
    }, 500);
  }
  function drawCircuit(el, srvNow) {
    if (RACE.timer) { clearTimeout(RACE.timer); RACE.timer = null; }   // one flip timer at a time
    const s = RACE.snap; if (!s) return;
    const now = srvNow(); const r = s.round;
    const ph = r.settled ? 'RESULT' : (now < r.openUntil ? 'BETTING' : 'RUNNING');
    const rICOS = ['🏍️', '🏎️', '🛵', '⚡', '🚲', '🛺'];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div><b>Round ${r.id}</b> <span class="qtychip" style="margin-left:8px;color:${ph === 'BETTING' ? 'var(--ok)' : ph === 'RUNNING' ? 'var(--gold)' : 'var(--dim)'}">${ph === 'BETTING' ? '🟢 BETS OPEN' : ph === 'RUNNING' ? '🏁 THEY\'RE OFF' : '⚑ SETTLED'}</span></div>
        <div class="mono" id="race-cd" style="font-size:16px;color:var(--gold)">—</div>
      </div>
      <div style="margin-top:10px">${r.runners.map((x, i) => {
        const mine = r.bets.filter(b => b.me && b.ri === i);
        const crowd = r.bets.filter(b => b.ri === i).length;
        const winner = r.settled && r.winner === i;
        return `<button class="crime ${(ph === 'BETTING' || winner) ? '' : 'dim'}" data-act="race_runner" data-ri="${i}" ${ph === 'BETTING' ? '' : 'disabled'} style="width:100%;margin-bottom:6px;text-align:left">
          <div class="req ${winner ? '' : ''}" style="${winner ? 'border-color:var(--gold);color:var(--gold)' : ''}"><span>${winner ? '🏆' : x.odds.toFixed(1)}</span><small>${winner ? 'won' : 'odds'}</small></div>
          <div class="main"><b>${rICOS[i] || '🏁'} ${esc(x.n)}</b>
          <span>${mine.length ? `<b style="color:var(--gold)">${mine.map(b => `your $${b.stake.toLocaleString()} @ ${b.odds.toFixed(1)} → pays $${Math.round(b.stake * b.odds).toLocaleString()}`).join(' · ')}</b>` : (ph === 'BETTING' ? (crowd ? crowd + ' ticket' + (crowd > 1 ? 's' : '') + ' on this rider' : 'the board has no love for this one yet') : `pays ${x.odds.toFixed(1)} to 1`)}</span>
          </div>
          ${ph === 'BETTING' ? `<div class="cta">${RACE.sel === i ? 'BACK IT ↓' : 'PICK'}</div>` : (r.settled ? `<div class="cta">${winner ? 'WINNER' : '—'}</div>` : '')}
        </button>`; }).join('')}</div>
      ${ph === 'BETTING' ? `<div class="kv" style="max-width:400px;margin:12px auto 0"><span class="k">Stake</span><span class="v" style="display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap">
        <input id="race-bet" type="number" min="10" value="1000" step="100" style="width:110px;text-align:right">
        ${[100, 1000, 10000].map(a => `<button class="chip sm qb" data-act="race_qb" data-v="${a}">${a >= 1000 ? (a / 1000) + 'k' : a}</button>`).join('')}
        <button class="btn gold sm" id="race-go" data-act="race_bet">Place ticket</button>
      </span></div>
      <p style="color:var(--dim);font-size:11px;text-align:center;margin-top:8px">Pick a rider above, then stake. Five tickets max a round · payout is stake × odds · refunds never come.</p>` : ''}
      ${ph === 'RESULT' ? `<p style="color:var(--mut);font-size:12.5px;text-align:center;margin-top:10px">${esc(r.runners[r.winner].n)} takes it${r.bets.some(b => b.me && b.ri === r.winner) ? ' — <b style="color:var(--gold)">your ticket lands.</b>' : r.bets.some(b => b.me) ? ' — your ticket tears.' : '.'} Next walk-up opens in seconds.</p>` : ''}
      ${(s.hist && s.hist.length) ? `<div style="border-top:1px dashed var(--line);margin-top:14px;padding-top:10px;font-size:12px;color:var(--mut)"><b style="color:var(--dim);font-size:10.5px;letter-spacing:1px">RECENT FLAGS</b><br>${s.hist.map(h => `<span class="qtychip" style="margin:6px 6px 0 0">R${h.id} → ${esc(h.winnerName)}</span>`).join('')}</div>` : ''}`;
    // ride straight into the moment the next walk-up opens — never drift past it
    const flipAt = (ph === 'RESULT' && r.nextOpenAt) ? r.nextOpenAt : (ph === 'BETTING' ? r.openUntil : r.runUntil);
    if (ph !== 'RESULT' || r.nextOpenAt) {
      RACE.timer = setTimeout(refreshCircuit, Math.min(32000, Math.max(350, flipAt - srvNow() + 400)));
    }
  }

  // ---- FACTION
  // ---- FACTION / GANG DESK
  function recruitLabel(mode) { return mode === 'apply' ? 'Applications' : mode === 'closed' ? 'Closed' : 'Open'; }
  const GANG_TITLES = ['Street Corner', 'The Block', 'Known Faces', 'Heavy Hitters', 'Ward Runners', 'Night Owners', 'City Eaters', 'Wire Legends', 'Untouchables', 'Razor Royalty'];
  function gangTitle(lvl) { return GANG_TITLES[Math.max(0, Math.min(GANG_TITLES.length - 1, (lvl || 1) - 1))]; }
  function opWait(op, now) { return op.ready ? 'Ready now' : 'Back in ' + fmtDur(Math.max(0, op.nextAt - now)); }
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
    if (me.faction) { await renderFactionCockpit(v, fs); return; }
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🪓 <span class="head">The Gangs</span></div>
      <div class="vdesc">Crews with real work, a transparent war chest, shared armouries and open war between flags. Found your own for $200,000 at level 5+.</div></div></div>
      <div class="card panel-gold gang-intro"><div class="subhead">Found your own</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <input placeholder="Gang name" id="fac-name" maxlength="24" style="flex:1;min-width:150px">
          <input placeholder="TAG" id="fac-tag" maxlength="4" style="width:90px;text-transform:uppercase">
          <button class="btn gold" data-act="faction_create">Found it</button></div>
        <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Founding needs level 5${me.level >= 5 ? ' ✓' : ' · <span style=\"color:var(--bad)\">you are level ' + me.level + '</span>'} and a $200,000 fee${me.money >= 200000 ? ' ✓' : ' · <span style="color:var(--bad)">you are short</span>'}.</p>
      </div>
      <div class="grid2">${fs.map(f => {
        const full = f.members >= f.capacity;
        const isOpen = f.recruiting === 'open';
        const canJoin = !full && f.recruiting !== 'closed';
        const action = isOpen ? 'faction_join' : 'faction_apply';
        const cta = full ? 'Roster full' : f.recruiting === 'closed' ? 'Not recruiting' : isOpen ? 'Join ' + esc(f.tag) : 'Apply to ' + esc(f.tag);
        return `<div class="card gang-list-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <b style="font-size:16px">${esc(f.name)}</b><span class="qtychip gang-tag">[${esc(f.tag)}]</span></div>
          <p class="gang-list-desc">${esc(f.desc || 'No public line. The work speaks for itself.')}</p>
          <div class="kv"><span class="k">Roster</span><span class="v">${f.members} / ${f.capacity}</span></div>
          <div class="kv"><span class="k">Crew power</span><span class="v">${f.power.toLocaleString()}</span></div>
          <div class="kv"><span class="k">Gang level</span><span class="v" style="color:var(--gold)">LV ${f.level || 1} · ${esc(gangTitle(f.level))}</span></div>
          <div class="kv"><span class="k">Wars</span><span class="v">${f.wins || 0}W – ${f.losses || 0}L</span></div>
          <div class="kv"><span class="k">War chest</span><span class="v">${money(f.bank || 0)}</span></div>
          <div class="kv"><span class="k">Recruiting</span><span class="v gang-status ${f.recruiting}">${recruitLabel(f.recruiting)}</span></div>
          <div class="kv"><span class="k">Run by</span><span class="v">${esc(f.owner)}</span></div>
          <button class="btn cyan sm" style="margin-top:10px" data-act="${action}" data-fid="${f.id}" ${canJoin ? '' : 'disabled'}>${cta}</button>
        </div>`;
      }).join('') || `<div class="card" style="text-align:center"><div style="font-size:30px">🪓</div>
          <div class="head" style="font-size:15px;margin-top:6px">No gangs yet</div>
          <p style="color:var(--mut);font-size:13px;margin-top:8px">Nobody has claimed this town yet. Put your own flag up, recruit a roster and work the crew-operation board.</p></div>`}</div>`;
  }

  async function renderFactionCockpit(v, allGangs) {
    let d = null;
    try { d = await Net.get('/api/faction/detail'); } catch (e) {}
    if (!d || !d.faction) { nav('city'); return; }
    const f = d.faction;
    const meOfficer = f.myRole === 'leader' || f.myRole === 'officer';
    const now = f.now || Date.now();
    const roll = f.roll || { streak: 0, checkedIn: 0, total: f.roster.length, mine: false };
    const chain = f.chain || { count: 0, need: 3 };
    const chainActive = (chain.count || 0) >= (chain.need || 3);
    const wars = f.wars || { wins: 0, losses: 0, shieldUntil: 0 };
    const raid = f.raid || { playerReadyAt: 0, gangReadyAt: 0, cost: 2500, energy: 20, nerve: 5 };
    const operationCards = (f.operations || []).map(op => {
      const locked = !!op.locked;
      const lockNote = locked ? `<small style="color:var(--bad)">🔒 ${esc(typeof op.locked === 'string' ? op.locked : 'locked')}</small>` : `<small>⚡ ${op.energy} energy · 🧠 ${op.nerve} nerve · ${op.chance}% base · ${opWait(op, now)}</small>`;
      return `<div class="gang-op ${locked ? 'locked' : op.ready ? 'ready' : 'cooling'}">
        <div class="gang-op-icon">${op.icon}</div><div class="gang-op-copy"><b>${esc(op.name)}</b><span>${esc(op.desc)}</span>${lockNote}</div>
        <button class="btn sm ${!locked && op.ready ? 'gold' : 'ghost'}" data-act="faction_operation" data-op="${op.id}" ${!locked && op.ready ? '' : 'disabled'}>${locked ? 'Locked' : op.ready ? 'Run it' : 'Cooling'}</button>
      </div>`;
    }).join('');
    const armoryRows = Array.isArray(f.armory) ? f.armory : [];
    const myBag = Object.entries(G.me.items || {}).filter(([, q]) => q > 0);
    const contribLine = (c) => {
      c = c || { deposited: 0, ops: 0, rolls: 0, raids: 0 };
      return `${money(c.deposited || 0)} chipped · ⚙${c.ops || 0} · 📋${c.rolls || 0} · ⚔${c.raids || 0}`;
    };
    const raidTargets = (allGangs || []).filter(g => g.id !== f.id);
    const playerCd = raid.playerReadyAt > now ? fmtDur(raid.playerReadyAt - now) : null;
    const gangCd = raid.gangReadyAt > now ? fmtDur(raid.gangReadyAt - now) : null;
    const shielded = wars.shieldUntil > now ? fmtDur(wars.shieldUntil - now) : null;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🪓 <span class="head">${esc(f.name)}</span> <span class="qtychip gang-tag">[${esc(f.tag)}]</span></div>
      <div class="vdesc">You ride as <b style="text-transform:capitalize">${f.myRole}</b>. ${f.roster.length} of ${f.cap} beds are filled; every chest movement and operation is logged below.</div></div></div>
      ${f.announce ? `<div class="card panel-gold gangwire"><div class="subhead">📣 The boss's wire <small style="color:var(--dim)">· ${esc(f.announce.by)} · ${new Date(f.announce.at).toLocaleDateString()}</small></div>
        <p style="margin:8px 0 0;font-size:13.5px">${esc(f.announce.text)}</p></div>` : ''}
      <div class="gang-metrics">
        <div class="gang-metric"><span>CREW POWER</span><b>${(f.power || 0).toLocaleString()}</b><small>${(f.reputation || 0).toLocaleString()} reputation</small></div>
        <div class="gang-metric"><span>GANG LEVEL</span><b>LV ${f.level || 1} · ${esc(gangTitle(f.level))}</b><small>rank #${f.rank || '—'} of ${f.rankOf || '—'} crews</small></div>
        <div class="gang-metric"><span>WARS</span><b>${wars.wins}W – ${wars.losses}L</b><small>${shielded ? 'barricaded ' + shielded : 'no barricade up'}</small></div>
        <div class="gang-metric"><span>OPERATIONS</span><b>${(f.operationCount || 0).toLocaleString()}</b><small>clean crew jobs</small></div>
        <div class="gang-metric"><span>CREW ROLL</span><b>DAY ${roll.streak || 0}</b><small>${roll.checkedIn || 0}/${roll.total || 0} checked in</small></div>
        <div class="gang-metric"><span>RECRUITING</span><b>${recruitLabel(f.recruiting)}</b><small>${f.applications && f.applications.length ? f.applications.length + ' applications waiting' : 'roster controlled by the boss'}</small></div>
      </div>
      <div class="grid2">
        <div class="card panel-gold"><div class="subhead">🏦 The War Chest <b class="mono" style="float:right;color:var(--gold)">${money(f.bank)}</b></div>
          <p style="color:var(--mut);font-size:12px;margin:8px 0">Chip in directly, make a Crew Roll, or work operations. Officers can spend the shared cash; the full trail stays on the activity ledger.</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <input id="fbank-amt" type="number" min="1" placeholder="amount" style="width:110px">
            <button class="btn sm ok" data-act="fbank_in">Chip in</button>
            ${meOfficer ? '<button class="btn sm ghost" data-act="fbank_out">Draw out</button>' : ''}
          </div></div>
        <div class="card crew-roll-card"><div class="subhead">📋 Crew Roll <span style="margin-left:auto;color:var(--gold)">Day ${roll.streak || 0}</span></div>
          <p>One check-in per member per day. You get paid, the chest gets a cut, and consecutive crew days grow the take.</p>
          <div class="crew-roll-bottom"><span class="qtychip ${roll.mine ? 'roll-done' : ''}">${roll.checkedIn || 0}/${roll.total || 0} checked in</span>
          <button class="btn sm ${roll.mine ? 'ghost' : 'gold'}" data-act="faction_roll" ${roll.mine ? 'disabled' : ''}>${roll.mine ? 'Checked in' : 'Answer roll'}</button></div>
        </div>
      </div>
      <div class="card"><div class="subhead">🎯 Crew Operations <small style="color:var(--dim)">personal cooldowns · shared rewards · server-resolved</small></div>
        <p class="gang-section-copy">Run a job for your own envelope and the war chest. More members and a Lookout Grid improve the chance; Runner Network improves both payouts.</p>
        ${chainActive
          ? `<p class="gang-chain on">🔗 Coordinated chain live — ${chain.count} hands worked in the last 24h: <b>+25%</b> on every crew payout</p>`
          : `<p class="gang-chain">🔗 Coordinated chain: ${chain.count || 0}/${chain.need || 3} hands in 24h — get ${(chain.need || 3) - (chain.count || 0)} more working for +25% on crew payouts</p>`}
        <div class="gang-op-grid">${operationCards}</div></div>
      ${meOfficer ? `<div class="card war-room"><div class="subhead">⚔️ The War Room <small style="color:var(--dim)">officers call the raids · ${raid.energy}⚡ ${raid.nerve}🧠 ${money(raid.cost)} a hit</small></div>
        <p class="gang-section-copy">Raid a rival chest for up to 8% of it. Odds run on crew power; win or lose, both crews go quiet for a while — and a raided gang barricades for 2 hours.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span class="qtychip ${playerCd ? '' : 'roll-done'}">${playerCd ? 'you ride again in ' + playerCd : 'you are ready'}</span>
          <span class="qtychip ${gangCd ? '' : 'roll-done'}">${gangCd ? 'crew rides again in ' + gangCd : 'crew is ready'}</span>
        </div>
        <div class="gang-op-grid">${raidTargets.length ? raidTargets.map(g => `
          <div class="gang-op ready"><div class="gang-op-icon">🏴</div><div class="gang-op-copy"><b>${esc(g.name)}</b> <span class="qtychip gang-tag">[${esc(g.tag)}]</span><span>LV ${g.level || 1} · ⚔ ${g.wins || 0}W–${g.losses || 0}L · 💪 ${g.power.toLocaleString()} power</span>
          <small>chest ${money(g.bank || 0)} · ${g.members}/${g.capacity} hands · run by ${esc(g.owner)}</small></div>
          <button class="btn sm ${playerCd || gangCd ? 'ghost' : 'danger'}" data-act="faction_raid" data-fid="${g.id}" ${playerCd || gangCd ? 'disabled' : ''}>${playerCd || gangCd ? 'Cooling' : 'Raid'}</button>
        </div>`).join('') : '<p style="color:var(--dim);font-size:12.5px">No other flags flying. Found a rival worth hitting first.</p>'}</div></div>` : ''}
      <div class="card"><div class="subhead">🛡️ The Armoury <small style="color:var(--dim)">shared stash · officers hand gear out · 50 pieces, 250 with the vault</small></div>
        <p class="gang-section-copy">Stash spare iron where the whole crew can reach it. Anyone can put gear in; only officers can draw it out. The ledger remembers both.</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
          <select id="farmory-item" style="max-width:230px">${myBag.length ? myBag.map(([id, q]) => `<option value="${id}">${(G.meta.items[id] || {}).icon || '📦'} ${esc((G.meta.items[id] || {}).name || id)} ×${q}</option>`).join('') : '<option value="">— your bag is empty —</option>'}</select>
          <input id="farmory-qty" type="number" min="1" value="1" style="width:70px">
          <button class="btn sm ok" data-act="farmory_in" ${myBag.length ? '' : 'disabled'}>Stash it</button>
          ${meOfficer ? '<span style="color:var(--dim);font-size:11.5px">drawing uses the same count box</span>' : ''}
        </div>
        ${armoryRows.length ? `<div style="max-height:220px;overflow:auto">${armoryRows.map(row => {
          const it = G.meta.items[row.itemId] || {};
          return `<div class="itemrow"><span class="ic">${row.icon || it.icon || '📦'}</span><div class="nm"><b>${esc(row.name || it.name || row.itemId)}</b><small>${esc(it.desc || '')}</small></div>
            <span class="qtychip">×${row.qty}</span>
            ${meOfficer ? `<button class="btn sm ghost" data-act="farmory_out" data-item="${row.itemId}">Draw</button>` : ''}</div>`;
        }).join('')}</div>` : '<p style="color:var(--dim);font-size:12.5px">Bare shelves. Stash something worth sharing.</p>'}
      </div>
      <div class="grid2">
        <div class="card"><div class="subhead">The Roster</div>
          <div style="max-height:280px;overflow:auto">${f.roster.map(r => `
            <div class="itemrow"><span class="ic">${r.role === 'leader' ? '👑' : r.role === 'officer' ? '🎖' : '🕶'}</span>
              <div class="nm"><b>${esc(r.name)}</b><small>${r.role}${r.jailed ? ' · <b style="color:var(--bad)">INSIDE</b>' : ''} · lvl ${r.level} · ${esc(contribLine(r.contrib))}</small></div>
              ${r.jailed && r.id !== G.me.id ? `<button class="btn sm warn" data-act="bust_out" data-tid="${r.id}" title="12 nerve · risky">Bust</button>` : ''}
              ${f.myRole === 'leader' && r.id !== G.me.id ? `<button class="btn sm ghost" data-act="fpromote" data-tid="${r.id}" title="give or pull the stripe">${r.role === 'officer' ? 'Demote' : 'Promote'}</button>
                <button class="btn sm bad" data-act="faction_kick" data-tid="${r.id}" title="cut them loose">Kick</button>
                <button class="btn sm gold" data-act="faction_transfer" data-tid="${r.id}" title="hand them the whole gang">👑</button>` : ''}
              ${f.myRole === 'officer' && r.role === 'member' ? `<button class="btn sm bad" data-act="faction_kick" data-tid="${r.id}" title="cut them loose">Kick</button>` : ''}
            </div>`).join('')}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px">
            <small style="color:var(--dim)">Busting springs a crewmate off the block — costs 12 nerve, jail risk if it goes wrong.</small>
            <button class="btn sm bad" data-act="faction_leave">Walk away</button>
          </div></div>
        <div class="card"><div class="subhead">🧾 Crew Activity <small style="color:var(--dim)">latest 12 entries</small></div>
          <div class="gang-ledger">${(f.ledger || []).map(e => `<div class="gang-ledger-row"><span class="gang-ledger-kind">${esc(e.kind)}</span><span class="gang-ledger-text">${esc(e.text)}</span><b class="${e.amount > 0 ? 'plus' : e.amount < 0 ? 'minus' : ''}">${e.amount ? (e.amount > 0 ? '+' : '−') + money(Math.abs(e.amount)) : '—'}</b></div>`).join('') || '<p style="color:var(--dim);font-size:12px">Nothing in the book yet. Start with a Crew Roll.</p>'}</div>
        </div>
      </div>
      ${meOfficer ? `<div class="card"><div class="subhead">✉️ Recruitment Desk <small style="color:var(--dim)">${(f.applications || []).length} waiting · ${(f.invites || []).length} invites out</small></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
          <input id="finvite-name" maxlength="20" placeholder="citizen name" style="flex:1;min-width:140px">
          <button class="btn sm cyan" data-act="faction_invite">Send invite</button>
        </div>
        ${(f.invites || []).length ? `<div class="gang-applications" style="margin-bottom:10px">${f.invites.map(a => `<div class="gang-app"><div><b>${esc(a.name)}</b><small>invited ${timeAgo(a.at)}</small></div><span><button class="btn sm ghost" data-act="faction_invite_cancel" data-tid="${a.id}">Pull back</button></span></div>`).join('')}</div>` : ''}
        <div class="gang-applications">${(f.applications || []).map(a => `<div class="gang-app"><div><b>${esc(a.name)}</b><small>level ${a.level} · applied ${timeAgo(a.at)}</small></div><span><button class="btn sm ok" data-act="faction_review" data-tid="${a.id}" data-decision="accept">Accept</button><button class="btn sm ghost" data-act="faction_review" data-tid="${a.id}" data-decision="decline">Decline</button></span></div>`).join('') || '<p style="color:var(--dim);font-size:12.5px">No applications on the desk.</p>'}</div></div>` : ''}
      <div class="card"><div class="subhead">🛠️ Crew Arrangements <small style="color:var(--dim)">paid from the war chest · every member feels them</small></div>
        <div class="upgrid" style="margin-top:10px">${f.upgrades.map(u => `
          <div class="upcard ${u.owned ? 'owned' : ''}">
            <div class="upic">${u.icon}</div><div class="upnm"><b>${esc(u.name)}</b><small>${esc(u.desc)}</small></div>
            ${u.owned ? '<span class="qtychip" style="color:var(--ok)">ACTIVE</span>' : (meOfficer ? `<button class="btn sm gold" data-act="fupgrade" data-up="${u.id}" ${f.bank < u.cost ? 'disabled' : ''}>${money(u.cost)}</button>` : `<span class="qtychip">${money(u.cost)}</span>`)}
          </div>`).join('')}</div></div>
      ${f.myRole === 'leader' ? `<div class="grid2"><div class="card"><div class="subhead">📣 Put the word out</div>
        <div style="display:flex;gap:8px;margin-top:8px"><input id="fannounce" maxlength="200" placeholder="one line, the whole crew sees it" style="flex:1"><button class="btn sm cyan" data-act="fannounce">Pin it</button></div></div>
        <div class="card"><div class="subhead">🚪 Recruitment desk</div><p class="gang-section-copy">Open lets anyone join; Applications puts officers in control; Closed hides the door.</p>
          <div style="display:flex;gap:8px"><select id="frecruiting"><option value="open" ${f.recruiting === 'open' ? 'selected' : ''}>Open roster</option><option value="apply" ${f.recruiting === 'apply' ? 'selected' : ''}>Applications</option><option value="closed" ${f.recruiting === 'closed' ? 'selected' : ''}>Closed</option></select><button class="btn sm cyan" data-act="faction_recruiting">Save</button></div></div></div>
        <div class="card"><div class="subhead">🎨 Flag & colours <small style="color:var(--dim)">the public line is free · a new name or tag costs ${money(f.renameCost || 50000)} cash</small></div>
          <div class="grid2" style="align-items:end;gap:8px">
            <div class="field" style="margin:0"><label>The public line</label><input id="fedit-desc" maxlength="180" value="${esc(f.desc || '')}" placeholder="one line the whole town reads"></div>
            <div style="display:flex;gap:8px"><div class="field" style="margin:0;flex:1"><label>Gang name</label><input id="fedit-name" maxlength="24" value="${esc(f.name)}"></div>
            <div class="field" style="margin:0"><label>Tag</label><input id="fedit-tag" maxlength="4" value="${esc(f.tag)}" style="width:80px;text-transform:uppercase"></div></div>
          </div>
          <div style="margin-top:10px"><button class="btn sm gold" data-act="faction_edit">Save the flag</button></div></div>` : ''}`;
  }

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
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="qtychip">${me.wins}W · ${me.losses}L</span>
        <span class="qtychip" style="color:var(--gold)">🏷️ ${titleFor(me.reputation || 0)}</span>
        <span class="qtychip" style="color:var(--cyn)">📸 ${(me.followers || 0).toLocaleString()} followers</span>
        ${!inJail && !inHosp ? `<button class="btn ghost sm" data-act="editlook">✏️ Change your look</button>` : ''}
        ${me.respecOpen ? `<button class="btn gold sm" data-act="respec_open">📝 Identity rewrite ready</button>` : ''}
      </div></div>
      <div class="grid2 profile-grid">
        <div class="dollframe">
          ${(me.jail_until && me.jail_until > Date.now()) ? AV.mugshot(me.avatar, 210, me.name) : AV.doll(me.avatar, 210)}
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
            <div class="kv"><span class="k">Happiness</span><span class="v">${me.happy} / ${me.max_happy || 100}</span></div>
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
          ${me.insuredUntil && me.insuredUntil > Date.now() ? `<div class="kv"><span class="k">Protection</span><span class="v" style="color:var(--ok)">active · ${fmtDur(me.insuredUntil - Date.now())}</span></div>` : ''}
          <div style="margin-top:12px"><button class="btn ghost sm" data-act="logout">Log out of the city</button></div></div>
      </div>
      <div class="grid2" id="profile-sys" style="margin-top:8px"></div>`;
    renderProfileSys();
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

  // ================================================================ INFORMANT NETWORK
  function renderInformants() {
    const v = $('#view');
    v.innerHTML = U.spinner('Finding the people who know…');
    refreshInformants(v);
  }
  async function refreshInformants(v) {
    let b;
    try { b = await Net.get('/api/sys/panel'); G.sysPanel = b; } catch (e) { v.innerHTML = `<div class="card"><p style="color:var(--bad)">${esc(e.message)}</p></div>`; return; }
    const inf = (b && b.informants) || { leads: [], tips: [], stats: {} };
    const tips = inf.tips || [];
    const money = (G.me && G.me.money) || 0;
    const mins = Math.max(0, Math.round(((inf.ends || 0) - Date.now()) / 60000));
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🕵️ <span class="head">The Informant Network</span></div>
      <div class="vdesc">Ten circles, ten districts, ten trades — <b>${(inf.total || 1000).toLocaleString()}</b> people who know something.
      Six ride your board each rotation; the rest are other people's problems. Buy a lead, live with what it turns out to be.</div></div>
      <div class="pill"><span>Rotation ends in <b style="color:var(--cyn)">${mins}m</b></span> <b style="color:var(--gold)">${tips.length} tip${tips.length === 1 ? '' : 's'} live</b></div></div>

      <div class="card"><div class="subhead">🎧 Live tips</div>
        ${tips.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${tips.map(t => `
          <div class="slot" style="padding:8px"><span class="s-ico">⚡</span><span><span class="s-slot">${esc(t.label)}</span>
          <span class="s-val">+${t.strength}${t.kind === 'market' ? '' : '%'} · ${U.fmtDur(Math.max(0, t.until - Date.now()))} left · ${esc(t.from || '')}</span></span></div>`).join('')}</div>`
        : '<p style="color:var(--dim);font-size:12px">No tips running. Buy a lead below — a good one pays for itself on the next job.</p>'}
      </div>

      <div class="card"><div class="subhead">📋 This rotation's board <span style="color:var(--dim);font-weight:400">— ${inf.stats && inf.stats.hires || 0} bought, ${inf.stats && inf.stats.rate || 0}% landed, $${((inf.stats && inf.stats.spent) || 0).toLocaleString()} spent</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${(inf.leads || []).map(l => `
          <div class="card" style="margin:0;border-color:${l.hired ? 'rgba(90,220,160,0.35)' : l.blown ? 'rgba(255,90,90,0.3)' : 'var(--line)'}">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
              <div><div style="font-weight:800">${l.icon} ${esc(l.name)}</div>
                <div style="font-size:11px;color:var(--dim);letter-spacing:0.4px">${l.circleIcon} ${esc(l.circle)} · ${esc(l.district)} · lead #${l.serial}</div></div>
              <div style="text-align:right;font-size:11px;color:var(--dim)">$${l.price.toLocaleString()}<br><b style="color:var(--cyn)">${Math.round(l.reliability * 100)}% solid</b></div>
            </div>
            <p style="font-size:12px;color:var(--mut);margin:8px 0 4px">${esc(l.blurb)}</p>
            <div style="font-size:11px;color:var(--gold);margin-bottom:8px">Pays out: <b>${esc(l.trade)}</b> · +${l.strength}${l.dur ? ' for ' + l.dur + 'm' : ' — instant'}</div>
            ${l.hired ? '<span class="tag ok">bought this rotation</span>'
              : l.blown ? '<span class="tag bad">burned — cold for a day</span>'
              : `<button class="btn sm ${money >= l.price ? 'cyan' : 'ghost'}" data-act="informant_hire" data-id="${l.id}">Hire for $${l.price.toLocaleString()}</button>`}
          </div>`).join('')}</div>
      </div>` ;
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
      ${editChips('body', 'Build', (AV.BODIES || []).map(b => typeof b === 'string' ? b : b.n), parts.body || 0)}
      ${editChips('face', 'Face', AV.FACE_FEAT.map(x => x.n), parts.face)}
      ${editChips('hair', 'Hair / headwear', AV.HAIRS.map(x => x.n), parts.hair)}
      ${editChips('shirt', 'Top', AV.SHIRTS.map((_, i) => i + ''), parts.shirt, true)}
      ${editChips('accent', 'Trinket', AV.ACCENTS.map((_, i) => i + ''), parts.accent, true)}
      ${editChips('eyes', 'Eyes', (AV.EYE_NAMES || []), parts.eyes || 0)}
      ${editChips('facial', 'Facial hair', (AV.FACIALS || []).map(x => x.n), parts.facial || 0)}
      <div class="subhead" style="margin-top:14px">🧥 Wardrobe presets</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px" id="el-ward">
        ${[0,1,2].map(i => `<button class="btn ghost sm" data-ward-slot="${i}" data-act="wardrobe_slot">Slot ${i+1}<br><span style="font-size:10px;color:var(--dim)">—</span></button>`).join('')}
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn ghost" data-act="close-modal">Cancel</button>
        <button class="btn cyan" data-act="save-look">Save look</button></div></div></div>`;
    const els = { skin: parts.skin, face: parts.face, hair: parts.hair, shirt: parts.shirt, accent: parts.accent, body: parts.body || 0, eyes: parts.eyes || 0, facial: parts.facial || 0 };
    const cur = { ...els };
    const strOf = () => [cur.skin, cur.face, cur.hair, cur.shirt, cur.accent, cur.body, cur.eyes, cur.facial].join('|');
    // hydrate wardrobe slots from the panel cache if present
    const fillWard = (slots) => {
      $$('#el-ward [data-ward-slot]').forEach(b => {
        const i = +b.dataset.wardSlot, av = slots && slots[i];
        b.innerHTML = av ? `Slot ${i+1}<br><span style="font-size:10px">worn — click to load</span>` : `Slot ${i+1}<br><span style="font-size:10px;color:var(--dim)">empty — click to save</span>`;
        b.dataset.empty = av ? '' : '1';
      });
    };
    if (G.sysPanel) fillWard(G.sysPanel.wardrobe);
    else Net.get('/api/sys/panel').then(d => { G.sysPanel = d; fillWard(d.wardrobe); }).catch(() => {});
    $$('#el-ward [data-ward-slot]').forEach(b => b.addEventListener('click', async () => {
      const i = +b.dataset.wardSlot;
      if (b.dataset.empty) { await act('wardrobe_save', { slot: i }); G.sysPanel = null; Net.get('/api/sys/panel').then(d => { G.sysPanel = d; fillWard(d.wardrobe); }).catch(() => {}); U.toast('Look saved to slot ' + (i+1)); }
      else { await act('wardrobe_load', { slot: i }); U.toast('Wardrobe loaded'); setTimeout(() => { document.dispatchEvent(new CustomEvent('rt-refresh-me')); }, 300); }
    }));
    $$('[data-el-opt]', root).forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.elOpt, val = +b.dataset.v;
      cur[f] = val;
      $('#el-prev').innerHTML = AV.doll(strOf(), 120);
      $$(`[data-el-opt="${f}"]`, root).forEach(x => x.classList.toggle('on', +x.dataset.v === val));
    }));
  }
  function editChips(field, label, values, active, swatch) {
    const items = values.map((v, i) => swatch
      ? `<button class="chip swatch ${active === i ? 'on' : ''}" data-el-opt="${field}" data-v="${i}" style="background:${field === 'skin' ? AV.SKINS[i] : field === 'shirt' ? AV.SHIRTS[i] : field === 'accent' ? AV.ACCENTS[i] : '#333'}"></button>`
      : `<button class="chip ${active === i ? 'on' : ''}" data-el-opt="${field}" data-v="${i}">${v}</button>`).join('');
    return `<div style="margin-top:10px"><div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut);font-weight:700;margin-bottom:6px">${label}</div><div class="chiprow">${items}</div></div>`;
  }

  // ================================================================ 2026 SYSTEMS
  // Arcade · Side Hustles · Garage · Turf · Finance extras · Social · Challenges
  async function sysPanel(force) {
    if (!force && G.sysPanel && Date.now() - (G.sysPanelAt || 0) < 6000) return G.sysPanel;
    try { G.sysPanel = await Net.get('/api/sys/panel'); G.sysPanelAt = Date.now(); return G.sysPanel; }
    catch (e) { return G.sysPanel || null; }
  }
  function titleFor(rep) {
    const ts = (G.meta && G.meta.titles) || [];
    let t = ts.length ? ts[0].name : '';
    for (const x of ts) if (rep >= x.rep) t = x.name;
    return t;
  }
  function cdLeft(ts, ms) {
    if (!ts) return null;
    const left = ts + ms - Date.now();
    return left > 0 ? fmtDur(left) : null;
  }

  // ---------------- ARCADE ----------------
  const AR = { buzzStart: 0, memCards: [], memFlips: 0, memOpen: [], memDone: 0, safeSeq: [], safeLen: 0 };
  async function renderArcade() {
    const v = $('#view'); const me = G.me;
    const sp = await sysPanel(true);
    if (!sp) { v.innerHTML = '<div class="card"><p style="color:var(--dim)">The arcade doors are stuck. Try again.</p></div>'; return; }
    const betRow = (id, dflt) => `<div class="field" style="display:flex;gap:6px;align-items:center;margin:8px 0"><input class="in mono" id="${id}" value="${dflt}" style="width:110px"><button class="btn ghost xs" data-qfill="${id}" data-v="1000">1k</button><button class="btn ghost xs" data-qfill="${id}" data-v="10000">10k</button><button class="btn ghost xs" data-qfill="${id}" data-v="100000">100k</button></div>`;
    const mineState = sp.arcade && sp.arcade.mines;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🎮 <span class="head">THE UNDERPASS ARCADE</span></div>
      <div class="vdesc">Ten machines, one purse. Wins: <b style="color:var(--ok)">${sp.arcade.wins}</b>${sp.event && sp.event.perk === 'crime2x' ? '' : ''}</div></div></div>
      <div class="grid2">
        <div class="card"><div class="subhead">💣 Mines — twelve tiles, three bites</div>
          ${mineState && mineState.live ? `
            <div class="mine-grid">${Array.from({length:12}, (_, i) => `<button class="mine-tile ${mineState.picked.includes(i) ? 'safe' : ''}" data-act="mine_tile" data-tile="${i}">${mineState.picked.includes(i) ? '💎' : ''}</button>`).join('')}</div>
            <div class="kv"><span class="k">Stake</span><span class="v mono">${money(mineState.bet)}</span></div>
            <button class="btn gold" data-act="mines_cashout">💰 Cash out</button>
            <button class="btn ghost sm" data-act="mines_abandon">Walk away (lose stake)</button>`
          : `${betRow('mines-bet', 2000)}<button class="btn cyan" data-act="mines_deal">Set the board</button>
             <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Every safe tile grows the multiplier. Cash out before a bite — full clear pays the max.</p>`}
        </div>
        <div class="card"><div class="subhead">🔴 Plinko — let gravity bet for you</div>
          ${betRow('plinko-bet', 1500)}
          <div class="plinko-row">${[0.2,0.6,1.1,1.8,3.2,10,3.2,1.8,1.1,0.6,0.2].map((m,i) => `<span class="plinko-slot ${m>=3?'hot':''}" data-plinko-slot="${i}">×${m}</span>`).join('')}</div>
          <button class="btn cyan" data-act="plinko_drop">Drop the puck</button>
        </div>
        <div class="card"><div class="subhead">🎲 Street dice</div>
          ${betRow('dice-bet', 1000)}
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn ghost" data-act="dice_call" data-call="low">Low (2–6) ×1.95</button>
            <button class="btn ghost" data-act="dice_call" data-call="seven">Seven ×4.5</button>
            <button class="btn ghost" data-act="dice_call" data-call="high">High (8–12) ×1.95</button>
          </div></div>
        <div class="card"><div class="subhead">🪙 The coin stand</div>
          ${betRow('coin-bet', 1000)}
          <div style="display:flex;gap:6px"><button class="btn ghost" data-act="coin_call" data-call="heads">Heads ×1.95</button><button class="btn ghost" data-act="coin_call" data-call="tails">Tails ×1.95</button></div></div>
        <div class="card"><div class="subhead">🏀 Hoops — $200 a shot</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${[1,2,3,4,5].map(z => `<button class="btn ghost sm" data-act="hoops_zone" data-zone="${z}">Zone ${z} · ×${[1.5,2.1,3,4.5,7][z-1]}</button>`).join('')}</div>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Farther out pays better and misses harder.</p></div>
        <div class="card"><div class="subhead">⚡ Buzz wire — $300 a run</div>
          <p style="color:var(--mut);font-size:12px">Steady the ring down the wire. Faster = richer. Best: ${sp.arcade.buzzBest ? (sp.arcade.buzzBest/1000).toFixed(1)+'s' : '—'}</p>
          <button class="btn cyan" data-act="buzz_start" id="buzz-btn">Start run</button></div>
        <div class="card"><div class="subhead">🧠 Memory pairs — $400 a sit</div>
          <div class="mem-grid" id="mem-grid"></div>
          <button class="btn cyan" data-act="mem_deal" id="mem-deal">Deal the table</button>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Match all 8 pairs. Fewer flips, bigger payout.</p></div>
        <div class="card"><div class="subhead">🔐 Safe cracker — Simon says</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${[3,4,5,6,7,8].map(l => `<button class="btn ghost sm" data-act="safe_deal" data-len="${l}">Len ${l} · $${l*200}</button>`).join('')}</div>
          <div class="safe-pad" id="safe-pad" style="margin-top:10px">${'<button class="safe-btn" data-sb="0" style="--sc:#e2b714"></button>'.repeat(0)}<span style="color:var(--dim);font-size:11.5px">Deal a safe: it flashes a dial sequence, you echo it back.</span></div></div>
        <div class="card"><div class="subhead">🎫 Scratch cards</div>
          <div class="kv"><span class="k">Cards in bag</span><span class="v">${me.items && me.items.scratch_card || 0}</span></div>
          <button class="btn cyan" data-act="scratch_go" data-qty="1">Scratch 1</button>
          <button class="btn ghost sm" data-act="scratch_go" data-qty="5">Scratch 5</button>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Buy more from the Market (Consumables). Three matching symbols wins up to $50k.</p>
          <div id="scratch-out"></div></div>
        <div class="card"><div class="subhead">🎟️ City lottery</div>
          <div class="kv"><span class="k">Tonight's pot</span><span class="v" style="color:var(--gold)">${money(sp.lottery.pool)}</span></div>
          <div class="kv"><span class="k">Your tickets today</span><span class="v">${sp.lottery.tickets.length}${sp.lottery.tickets.length ? ' — ' + sp.lottery.tickets.slice(-5).join(', ') : ''}</span></div>
          <div class="kv"><span class="k">Lifetime winnings</span><span class="v">${money(sp.lottery.won)}</span></div>
          <button class="btn gold" data-act="lottery_go" data-qty="1">Buy 1 — $1,000</button>
          <button class="btn ghost sm" data-act="lottery_go" data-qty="5">Buy 5</button>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">One number wins the pot; near misses pay $5,000. Draws at midnight UTC.</p></div>
      </div>`;
    if (AR.memCards.length) paintMemory();
    if (AR.safeLen) paintSafe();
    $$('#view [data-qfill]').forEach(b => b.addEventListener('click', () => { const el = document.getElementById(b.dataset.qfill); if (el) el.value = b.dataset.v; }));
    U.bindTimers(v);
  }
  function paintMemory() {
    const g = $('#mem-grid'); if (!g) return;
    g.innerHTML = AR.memCards.map((c, i) => {
      const open = AR.memOpen.includes(i) || c.done;
      return `<button class="mem-card ${open ? 'open' : ''}" data-mem="${i}">${open ? c.v : '?'}</button>`;
    }).join('') + `<div style="grid-column:1/-1;font-size:11.5px;color:var(--dim)">Flips: ${AR.memFlips}</div>`;
    $$('#mem-grid [data-mem]').forEach(b => b.addEventListener('click', () => memFlip(+b.dataset.mem)));
  }
  function memFlip(i) {
    const c = AR.memCards[i];
    if (!c || c.done || AR.memOpen.includes(i) || AR.memOpen.length >= 2) return;
    AR.memFlips++; AR.memOpen.push(i); paintMemory();
    if (AR.memOpen.length === 2) {
      const [a, b] = AR.memOpen;
      setTimeout(() => {
        if (AR.memCards[a].v === AR.memCards[b].v) { AR.memCards[a].done = AR.memCards[b].done = true; AR.memDone++; }
        AR.memOpen = [];
        paintMemory();
        if (AR.memDone === 8) {
          actCatch('arcade_memory', { flips: AR.memFlips }).then(r => {
            if (r && r.res) { AR.memCards = []; AR.memFlips = 0; AR.memDone = 0; sysPanel(true).then(() => renderArcade()); }
          });
        }
      }, AR.memCards[a].v === AR.memCards[b].v ? 220 : 650);
    }
  }
  function paintSafe() {
    const pad = $('#safe-pad'); if (!pad) return;
    const cols = ['#e2b714', '#4fc3f7', '#e57373', '#81c784'];
    pad.innerHTML = cols.map((c, i) => `<button class="safe-btn" data-sb="${i}" style="--sc:${c}"></button>`).join('') +
      `<div style="grid-column:1/-1;font-size:11.5px;color:var(--dim)" id="safe-hint">Watch the dials…</div>`;
    $$('#safe-pad [data-sb]').forEach(b => b.disabled = true);
    let k = 0;
    const flash = () => {
      if (k >= AR.safeSeq.length) {
        const h = $('#safe-hint'); if (h) h.textContent = 'Your turn — echo the sequence.';
        $$('#safe-pad [data-sb]').forEach(b => b.disabled = false);
        AR.safeGuess = [];
        return;
      }
      const el = $(`#safe-pad [data-sb="${AR.safeSeq[k]}"]`);
      if (el) { el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 380); }
      k++; setTimeout(flash, 520);
    };
    setTimeout(flash, 400);
    $$('#safe-pad [data-sb]').forEach(b => b.addEventListener('click', async () => {
      AR.safeGuess.push(+b.dataset.sb);
      const n = AR.safeGuess.length;
      if (AR.safeGuess[n - 1] !== AR.safeSeq[n - 1]) {
        const r = await actCatch('arcade_safe', { op: 'echo', seq: AR.safeGuess.concat(Array(AR.safeSeq.length - n).fill(0)) });
        AR.safeLen = 0; sysPanel(true).then(() => renderArcade()); return;
      }
      if (n === AR.safeSeq.length) {
        const r = await actCatch('arcade_safe', { op: 'echo', seq: AR.safeGuess });
        AR.safeLen = 0; sysPanel(true).then(() => renderArcade());
      }
    }));
  }

  // ---------------- STREET LIFE ----------------
  async function renderStreet() {
    const v = $('#view'); const me = G.me;
    const sp = await sysPanel(true);
    if (!sp) { v.innerHTML = '<div class="card"><p style="color:var(--dim)">The street is quiet.</p></div>'; return; }
    const st = sp.street || { catalogs: {}, pets: [], ink: [], contacts: [], heat: 0, streak: { n: 0 } };
    const cat = st.catalogs || {};
    const heat = st.heat || 0;
    const heatCol = heat > 70 ? 'var(--bad)' : heat > 35 ? 'var(--gold)' : 'var(--ok)';
    const ownedPet = new Set((st.pets || []).map(x => x.id));
    const ownedInk = new Set((st.ink || []).map(x => x.id));
    const known = new Set((st.contacts || []).map(x => x.id));
    const ownedSkin = new Set(st.skins || []);
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🌃 <span class="head">Street Life</span></div>
      <div class="vdesc">Eat, go out, keep animals, get inked, call in favours, crash at a hide. Heat rises when you work the street.</div></div>
      <div class="pill" style="color:${heatCol}">HEAT ${heat}/100</div></div>
      <div class="grid2">
        <div class="card"><div class="subhead">📅 Daily drop — streak ${st.streak.n || 0}</div>
          <p style="color:var(--mut);font-size:12px">${st.streak.claimed ? 'Claimed today. Come back tomorrow.' : ((st.streak.next && st.streak.next.desc) || 'A thin envelope is waiting.')}</p>
          <button class="btn gold" data-act="street_streak" ${st.streak.claimed ? 'disabled' : ''}>Claim daily</button>
          <button class="btn ghost xs" data-act="street_cool" style="margin-left:6px">Quiet the heat ($$)</button>
        </div>
        <div class="card"><div class="subhead">🏠 Hide ${st.hideout ? '· ' + esc(st.hideout.name) : ''}</div>
          ${st.hideout ? `<p style="color:var(--mut);font-size:12px">${esc(st.hideout.desc)}</p>
            <button class="btn cyan" data-act="street_rest" ${st.restReady ? '' : 'disabled'}>Crash here (+energy, −heat)</button>` : '<p style="color:var(--dim);font-size:12px">Buy a hide to rest off heat.</p>'}
          ${(cat.hideouts || []).map(h => `<div class="kv"><span class="k">${esc(h.name)} <span style="color:var(--dim);font-size:11px">${esc(h.desc)}</span></span>
            <span class="v">${money(h.price)} <button class="btn xs ${st.hideout && st.hideout.id===h.id ? 'ghost' : 'gold'}" data-act="street_hide" data-hide="${h.id}" ${st.hideout && st.hideout.id===h.id ? 'disabled' : ''}>${st.hideout && st.hideout.id===h.id ? 'Yours' : 'Take'}</button></span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">🌯 Street food ${st.foodReady ? '' : '· digesting'}</div>
          ${(cat.food || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${money(f.price)} <button class="btn cyan xs" data-act="street_eat" data-food="${f.id}" ${st.foodReady && me.money>=f.price ? '' : 'disabled'}>Eat</button></span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">🍸 Nightlife ${st.nightReady ? '' : '· still ringing'}</div>
          ${(cat.venues || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)} · cover ${money(f.cover)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v"><button class="btn gold xs" data-act="street_out" data-venue="${f.id}" ${st.nightReady && me.money>=f.cover && me.energy>=4 ? '' : 'disabled'}>Go out</button></span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">🐾 Pets ${st.pets.length}/4</div>
          ${(cat.pets || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${ownedPet.has(f.id) ? `<button class="btn ghost xs" data-act="street_rehome" data-pet="${f.id}">Rehome</button>` : `${money(f.price)} <button class="btn cyan xs" data-act="street_pet" data-pet="${f.id}" ${me.money>=f.price && st.pets.length<4 ? '' : 'disabled'}>Keep</button>`}</span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">✒️ Ink ${st.ink.length} pieces</div>
          ${(cat.tats || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)} · ${esc(f.slot)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${ownedInk.has(f.id) ? '<span class="pill">on you</span>' : `${money(f.price)} <button class="btn gold xs" data-act="street_ink" data-tat="${f.id}" ${me.money>=f.price ? '' : 'disabled'}>Sit</button>`}</span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">📡 Contacts</div>
          ${(cat.contacts || []).map(f => `<div class="kv"><span class="k">${f.icon || '📡'} ${esc(f.name)} <span style="color:var(--dim)">${esc(f.role || '')} · lv ${f.lvl||1}</span><div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${known.has(f.id) ? `<button class="btn cyan xs" data-act="street_call" data-contact="${f.id}" ${st.callReady ? '' : 'disabled'}>Call</button>` : `<button class="btn ghost xs" data-act="street_meet" data-contact="${f.id}">Meet</button>`}</span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">📦 Crates</div>
          ${(cat.crates || []).map(f => `<div class="kv"><span class="k">${esc(f.name)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${money(f.price)} <button class="btn gold xs" data-act="street_crate" data-crate="${f.id}">Crack</button></span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">🔫 Weapon finishes</div>
          ${(cat.skins || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v">${ownedSkin.has(f.id) ? `<button class="btn ${st.skinOn===f.id?'gold':'ghost'} xs" data-act="street_wear_skin" data-skin="${f.id}">${st.skinOn===f.id?'On':'Wear'}</button>` : `${money(f.price)} <button class="btn cyan xs" data-act="street_skin" data-skin="${f.id}">Buy</button>`}</span></div>`).join('')}
        </div>
        <div class="card"><div class="subhead">🔧 Vehicle kits — fit from the Garage too</div>
          <p style="color:var(--mut);font-size:12px">${(cat.mods||[]).length} kits. Open Garage, then Street Life after you own a car. Fit via the buttons below if you have a car in bay 0.</p>
          ${(cat.mods || []).map(f => `<div class="kv"><span class="k">${f.icon} ${esc(f.name)} · ${money(f.price)}<div style="font-size:11px;color:var(--dim)">${esc(f.desc)}</div></span>
            <span class="v"><button class="btn cyan xs" data-act="street_mod" data-mod="${f.id}" data-idx="0">Fit bay 0</button></span></div>`).join('')}
        </div>
      </div>`;
  }

  // ---------------- SIDE HUSTLES ----------------
  async function renderHustle() {
    const v = $('#view'); const me = G.me;
    const sp = await sysPanel(true);
    if (!sp) { v.innerHTML = '<div class="card"><p style="color:var(--dim)">The board is down. Try again.</p></div>'; return; }
    const gig = sp.gigs || { ids: [], left: 0, done: 0, slots: 0 };
    const contracts = sp.contracts || { offers: [], catalogSize: 1000, completed: 0, total: 0, wins: 0, until: sp.now };
    sp.courier = sp.courier || { active: null, at: 0 };
    sp.fish = sp.fish || { caught: 0, at: 0 };
    sp.salvage = sp.salvage || { runs: 0, at: 0 };
    const cd = (readyTxt, left) => left ? `<span class="pill" style="color:var(--dim)">⏳ ${left}</span>` : `<span class="pill" style="color:var(--ok)">${readyTxt}</span>`;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">📦 <span class="head">SIDE HUSTLES</span></div>
      <div class="vdesc">Legal-ish income between crimes. ${sp.event ? `<b style="color:var(--gold)">${sp.event.icon} ${sp.event.name}</b> — ${sp.event.desc} (${fmtDur(sp.event.until - sp.now)} left)` : 'The city is quiet — no event running.'}</div></div></div>
      ${sp.event ? `<div class="card" style="border-color:rgba(226,183,20,.5);padding:8px 12px;display:flex;gap:10px;align-items:center"><span style="font-size:20px">${sp.event.icon}</span><div style="flex:1"><b>${sp.event.name}</b> <span style="color:var(--dim);font-size:12px">— ${sp.event.desc}</span></div><span class="mono" style="color:var(--gold)">${fmtDur(sp.event.until - sp.now)}</span></div>` : ''}
      <div class="grid2">
        <div class="card"><div class="subhead">📋 Gig board — refreshes every 4h</div>
          ${(gig.ids || []).filter(g => g && g.id).map(g => `<div class="kv" style="align-items:center"><span class="k" style="flex:1">${g.icon} <b>${g.name}</b><br><span style="color:var(--dim);font-size:11px">${g.desc}</span></span>
            <span class="v" style="text-align:right"><b style="color:var(--gold)">$${g.cash[0].toLocaleString()}–${g.cash[1].toLocaleString()}</b><br>
            <button class="btn cyan xs" data-act="gig_do" data-gig="${g.id}" ${me.energy < g.energy ? 'disabled' : ''}>Do it (${g.energy}⚡)</button></span></div>`).join('') || '<p style="color:var(--dim)">The board rotates soon.</p>'}
          <div style="color:var(--dim);font-size:11.5px;margin-top:6px">${gig.left}/${(gig.ids || []).length * 3} gigs done this rotation · ${gig.slots} slots</div></div>
        <div class="card" style="border-color:rgba(91,192,190,.38)"><div class="subhead">📜 City Contracts <span class="pill" style="color:var(--cyn);margin-left:5px">${contracts.catalogSize.toLocaleString()} live leads</span></div>
          <p style="color:var(--mut);font-size:12px;margin:0 0 7px">Three one-shot jobs, selected for you every four hours. Match the weather for +8% success.</p>
          ${(contracts.offers || []).map(c => `<div class="kv" style="align-items:center;border-top:1px solid var(--line);padding:8px 0"><span class="k" style="flex:1;min-width:0">${c.icon} <b>#${c.serial} · ${esc(c.name)}</b><br><span style="color:var(--dim);font-size:11px">${esc(c.sector)} · ${esc(c.blurb)}</span><br><span style="font-size:10.5px;color:${c.weatherLive ? 'var(--ok)' : 'var(--dim)'}">${c.weatherLive ? '✦ Weather edge active: +8%' : `Best in ${esc(c.weather)}`}</span></span>
            <span class="v" style="text-align:right;white-space:nowrap"><b style="color:var(--gold)">$${c.cash[0].toLocaleString()}–${c.cash[1].toLocaleString()}</b><br><span style="font-size:11px;color:var(--dim)">${c.chance}% · 🧠 ${c.nerve}</span><br>
            <button class="btn ${c.done ? 'ghost' : 'cyan'} xs" data-act="city_contract" data-contract="${c.id}" ${c.done || me.energy < c.energy || me.nerve < c.nerve ? 'disabled' : ''}>${c.done ? 'Closed' : `Run (${c.energy}⚡)`}</button></span></div>`).join('') || '<p style="color:var(--dim)">No leads came through this rotation.</p>'}
          <div style="color:var(--dim);font-size:11.5px;margin-top:6px">${contracts.completed}/3 closed this rotation · ${contracts.wins} clean / ${contracts.total} total · resets in ${fmtDur(Math.max(0, contracts.until - sp.now))}</div></div>
        <div class="card" style="border-color:rgba(226,183,20,.35)"><div class="subhead">🌙 Night Briefs <span class="pill" style="color:var(--gold);margin-left:5px">${((sp.nights && sp.nights.catalogSize) || 1000).toLocaleString()} live leads</span></div>
          <p style="color:var(--mut);font-size:12px;margin:0 0 7px">Three after-dark jobs, selected for you every four hours. Match the weather for +8% success.</p>
          ${((sp.nights && sp.nights.offers) || []).map(c => `<div class="kv" style="align-items:center;border-top:1px solid var(--line);padding:8px 0"><span class="k" style="flex:1;min-width:0">${c.icon} <b>#${c.serial} · ${esc(c.name)}</b><br><span style="color:var(--dim);font-size:11px">${esc(c.sector)} · ${esc(c.blurb)}</span></span>
            <span class="v" style="text-align:right;white-space:nowrap"><b style="color:var(--gold)">$$${c.cash[0].toLocaleString()}–${c.cash[1].toLocaleString()}</b><br>
            <button class="btn ${c.done ? 'ghost' : 'gold'} xs" data-act="night_lead" data-lead="${c.id}" ${c.done || me.energy < c.energy || me.nerve < c.nerve ? 'disabled' : ''}>${c.done ? 'Closed' : `Run (${c.energy}⚡)`}</button></span></div>`).join('') || '<p style="color:var(--dim)">No briefs came through this rotation.</p>'}
          <div style="color:var(--dim);font-size:11.5px;margin-top:6px">${(sp.nights && sp.nights.completed) || 0}/3 closed · ${(sp.nights && sp.nights.wins) || 0} clean</div></div>
        <div class="card" style="border-color:rgba(90,200,250,.28)"><div class="subhead">📡 Wire Favours <span class="pill" style="color:var(--ok);margin-left:5px">${((sp.favours && sp.favours.catalogSize) || 600).toLocaleString()} on the wire</span></div>
          <p style="color:var(--mut);font-size:12px;margin:0 0 8px">Quiet jobs from the street. Three new favours every 4 hours. ${(sp.favours && sp.favours.total) || 0} closed all-time.</p>
          ${((sp.favours && sp.favours.offers) || []).map(c => `<div class="kv" style="align-items:flex-start"><span class="k">${c.done ? '✓ ' : ''}${c.name}<div style="font-size:11px;color:var(--dim);font-weight:400;margin-top:2px">${c.sector} · ${c.xp} XP · ${c.chance}% · ${c.weatherLive ? 'weather bonus' : c.weather}</div></span>
            <span class="v" style="text-align:right">${money(c.cash[0])}–${money(c.cash[1])}<br>
            <button class="btn ${c.done ? 'ghost' : 'gold'} xs" data-act="wire_favour" data-favour="${c.id}" ${c.done || me.energy < c.energy || me.nerve < c.nerve ? 'disabled' : ''}>${c.done ? 'Closed' : `Run (${c.energy}⚡)`}</button></span></div>`).join('') || '<p style="color:var(--dim)">No favours on this rotation.</p>'}
          <div style="color:var(--dim);font-size:11.5px;margin-top:6px">${(sp.favours && sp.favours.completed) || 0}/3 closed · ${(sp.favours && sp.favours.wins) || 0} paid</div></div>
        <div class="card"><div class="subhead">🚚 Courier dispatch</div>
          ${sp.courier.active ? `<div class="kv"><span class="k">Package for</span><span class="v">${sp.courier.active.dest}</span></div>
            <div class="kv"><span class="k">Deadline</span><span class="v" style="color:${sp.courier.active.deadline < sp.now + 120000 ? 'var(--bad)' : 'var(--ok)'}">${fmtDur(Math.max(0, sp.courier.active.deadline - sp.now))}</span></div>
            <div class="kv"><span class="k">Pay + speed bonus</span><span class="v" style="color:var(--gold)">${money(sp.courier.active.pay)}+</span></div>
            <button class="btn gold" data-act="courier_deliver">Deliver now</button>`
          : `<p style="color:var(--mut);font-size:12px">Take a package, beat the clock. ${cd('Dispatch ready', cdLeft(sp.courier.at, 5*60000))}</p>
             <button class="btn cyan" data-act="courier_take">Take a package</button>`}</div>
        <div class="card"><div class="subhead">🎣 Canal fishing</div>
          <p style="color:var(--mut);font-size:12px">4⚡ per cast. Cod, pike, boots… and sometimes bling. Catches: ${sp.fish.caught}</p>
          <button class="btn cyan" data-act="fish_cast" ${me.energy < 4 ? 'disabled' : ''}>Cast the line</button> ${cd('', cdLeft(sp.fish.at, 3*60000)) || ''}</div>
        <div class="card"><div class="subhead">🗑️ Skip salvage</div>
          <p style="color:var(--mut);font-size:12px">6⚡ a sweep. Runs: ${sp.salvage.runs}</p>
          <button class="btn cyan" data-act="salvage_run" ${me.energy < 6 ? 'disabled' : ''}>Dig through the skips</button> ${cd('', cdLeft(sp.salvage.at, 8*60000)) || ''}</div>
        <div class="card"><div class="subhead">🩸 Plasma donation</div>
          <p style="color:var(--mut);font-size:12px">10 life for cash. Donations: ${sp.plasma.n}</p>
          <button class="btn cyan" data-act="plasma_donate" ${me.life <= 30 ? 'disabled' : ''}>Roll up a sleeve</button> ${cd('', sp.plasma.ready ? null : 'soon') || ''}</div>
        <div class="card"><div class="subhead">🧪 Clinical trials</div>
          <p style="color:var(--mut);font-size:12px">Volunteer for science. Side effects vary. Trials survived: ${sp.trials.n}</p>
          <button class="btn cyan" data-act="trial_join" ${sp.trials.ready ? '' : 'disabled'}>${sp.trials.ready ? 'Sign the waiver' : 'Clinic says wait'}</button></div>
        <div class="card"><div class="subhead">🎷 Busking on the promenade</div>
          <p style="color:var(--mut);font-size:12px">5⚡, tips scale with your mood. Sets played: ${sp.busk.n}</p>
          <button class="btn cyan" data-act="busk_play" ${sp.busk.ready && me.energy >= 5 ? '' : 'disabled'}>${sp.busk.ready ? 'Play a set' : 'The pitch is taken'}</button></div>
        <div class="card"><div class="subhead">📦 Storage auctions — one unit a day</div>
          ${sp.storage.openedToday ? '<p style="color:var(--dim);font-size:12px">You already cracked a unit today. New shutters at midnight.</p>'
          : `<p style="color:var(--mut);font-size:12px">Three units go up. Peek at the labels, pay the price, keep whatever is inside.</p>
             <button class="btn gold" data-act="storage_open">Show me the units</button>`}</div>
        <div class="card"><div class="subhead">🎁 Mystery boxes</div>
          <div class="kv"><span class="k">In your bag</span><span class="v">${me.items && me.items.mystery_box || 0}</span></div>
          <button class="btn cyan" data-act="box_open" ${(me.items && me.items.mystery_box) ? '' : 'disabled'}>Tear the tape</button>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Buy them from the Market. Contents: cash, gear… occasionally a limited drop.</p></div>
        <div class="card"><div class="subhead">🔥 The Drop — limited streetwear</div>
          ${(sp.drops.stock || []).map(d => `<div class="kv" style="align-items:center"><span class="k" style="flex:1">${d.icon} <b>${d.name}</b><br><span style="color:var(--dim);font-size:11px">${d.left} left this week · you own ${d.owned}</span></span>
            <span class="v"><b style="color:var(--gold)">${money(d.price)}</b><br><button class="btn gold xs" data-act="drop_buy" data-item="${d.id}" ${d.left > 0 && !d.owned && me.money >= d.price ? '' : 'disabled'}>${d.owned ? 'Owned' : 'Cop'}</button></span></div>`).join('')}
          <p style="color:var(--dim);font-size:11.5px;margin-top:6px">Rotation changes weekly. Owning all four pieces earns the Hype Beast feat.</p></div>
        <div class="card"><div class="subhead">📸 Clout — post and get paid</div>
          <div class="kv"><span class="k">Followers</span><span class="v" style="color:var(--cyn)">${sp.clout.followers.toLocaleString()}</span></div>
          <div class="kv"><span class="k">Passive income</span><span class="v">≈ ${money(sp.clout.rate)}/hr</span></div>
          <div class="field" style="margin:8px 0"><input class="in" id="clout-cap" maxlength="80" placeholder="Caption for the post…"></div>
          <button class="btn cyan" data-act="clout_post" ${sp.clout.ready ? '' : 'disabled'}>${sp.clout.ready ? 'Post it' : 'Algorithm is cooling down'}</button></div>
        <div class="card"><div class="subhead">🎨 Street art — tag the districts</div>
          <div class="kv"><span class="k">Cans in bag</span><span class="v">${me.items && me.items.spray_can || 0}</span></div>
          <div class="kv"><span class="k">Walls tagged</span><span class="v">${sp.tags.n}</span></div>
          <div class="field" style="margin:8px 0"><select class="in" id="tag-district">${(G.meta.districts || []).map(d => `<option value="${d.id}">${d.icon} ${d.name}</option>`).join('')}</select></div>
          <button class="btn cyan" data-act="tag_wall" ${(me.items && me.items.spray_can) ? '' : 'disabled'}>Paint a piece</button>
          <p style="color:var(--dim);font-size:11.5px;margin-top:8px">+6 rep, +2 turf influence. 12% chance a patrol rolls up.</p></div>
      </div>`;
    U.bindTimers(v);
  }

  // ---------------- GARAGE ----------------
  async function renderGarage() {
    const v = $('#view'); const me = G.me;
    const sp = await sysPanel(true);
    if (!sp) { v.innerHTML = '<div class="card"><p style="color:var(--dim)">The garage door is jammed. Try again.</p></div>'; return; }
    const showroom = G.meta.cars || [];
    const carCard = (c, owned, i) => `
      <div class="kv" style="align-items:center;border-bottom:1px solid var(--line);padding:8px 0">
        <span class="k" style="flex:1;font-size:13px">${c.icon || c.def.icon} <b>${owned ? (c.name || c.def.name) : c.name}</b>
          <br><span style="color:var(--dim);font-size:11px">${owned ? `rating ${c.rating}` : esc(c.desc)}</span></span>
        <span class="v" style="text-align:right">
          ${owned ? `<span class="pill">${c.def ? money(c.def.price) : ''}</span> ` : `<b style="color:var(--gold)">${money(c.price)}</b><br>`}
          ${owned
            ? `<button class="btn cyan xs" data-act="race_car" data-idx="${i}">🏁 Race</button> <button class="btn ghost xs" data-act="chop_car" data-idx="${i}">Chop</button> <button class="btn ghost xs" data-act="car_sell" data-idx="${i}">Sell 70%</button> <button class="btn ghost xs" data-act="car_paint" data-idx="${i}">Paint</button>`
            : `<button class="btn gold xs" data-act="car_buy" data-car="${c.id}" ${me.money >= c.price ? '' : 'disabled'}>Buy</button>`}
        </span></div>`;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🚗 <span class="head">THE GARAGE</span></div>
      <div class="vdesc">Buy it, paint it, race it, or feed it to the chop shop. Record: <b style="color:var(--ok)">${sp.races.wins}W</b> / <b style="color:var(--bad)">${sp.races.losses}L</b></div></div></div>
      <div class="card"><div class="subhead">🔑 Your drive (${sp.cars.length}/6)</div>
        ${sp.cars.length ? sp.cars.map((c, i) => carCard(c, true, i)).join('') : '<p style="color:var(--dim);font-size:12.5px">Empty bays. The showroom is right there.</p>'}</div>
      <div class="card"><div class="subhead">🏬 Showroom</div>
        ${showroom.map(c => carCard(c, false, 0)).join('')}
        <p style="color:var(--dim);font-size:11.5px;margin-top:8px">Race stakes scale with the car. Winning pays 6% of its sticker + $500, plus rep and influence.</p></div>`;
    U.bindTimers(v);
  }

  // ---------------- TURF ----------------
  async function renderTurf() {
    const v = $('#view'); const me = G.me;
    const sp = await sysPanel(true);
    if (!sp) { v.innerHTML = '<div class="card"><p style="color:var(--dim)">The map room is locked. Try again.</p></div>'; return; }
    const t = sp.turf;
    v.innerHTML = `
      <div class="vhead"><div><div class="vtitle">🗺️ <span class="head">TURF</span></div>
      <div class="vdesc">Claim districts with influence. They pay hourly while you hold them — capped at ${sp.turf.incomeHours}h uncollected.</div></div>
      <div style="display:flex;gap:10px;align-items:center">
        <span class="pill" style="color:var(--cyn)">◆ ${Math.floor(t.influence)} influence</span>
        ${t.pending > 0 ? `<button class="btn gold sm" data-act="turf_collect">Collect ${money(t.pending)}</button>` : ''}
      </div></div>
      <div class="grid2">
        ${t.districts.map(d => `
        <div class="card ${d.mine ? 'gold-border' : ''}">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:26px">${d.icon}</span>
            <div style="flex:1"><b>${d.name}</b><br><span style="color:var(--dim);font-size:11.5px">$${d.income.toLocaleString()}/hr · needs ${d.minInfluence}◆</span></div>
            ${d.mine ? '<span class="pill" style="color:var(--gold)">YOURS</span>'
              : d.holder ? `<span class="pill" style="color:var(--bad)">${esc(d.holderName || 'held')}</span>` : '<span class="pill" style="color:var(--dim)">open</span>'}
          </div>
          <div style="margin-top:10px;display:flex;gap:6px">
            ${d.mine ? `<button class="btn ghost sm" data-act="turf_release" data-d="${d.id}">Release</button>`
              : d.holder ? `<button class="btn danger sm" data-act="turf_claim" data-d="${d.id}" ${t.influence >= 90 ? '' : 'disabled'}>⚔️ Take (90◆)</button>`
              : `<button class="btn cyan sm" data-act="turf_claim" data-d="${d.id}" ${t.influence >= d.minInfluence ? '' : 'disabled'}>🚩 Claim (${Math.max(40, d.minInfluence)}◆)</button>`}
          </div>
        </div>`).join('')}
      </div>
      <p style="color:var(--dim);font-size:11.5px;margin-top:10px">Influence grows from crimes (+1), big scores (+4), fight wins (+3), street races (+3) and tagging (+2). Takeovers cost 90◆ and can fail — a faction tag helps.</p>`;
    U.bindTimers(v);
  }

  // ---------------- CITY EXTRAS: weather, event, challenges ----------------
  async function renderCitySys() {
    const wrap = $('#city-sys'); if (!wrap) return;
    const sp = await sysPanel();
    if (!sp) return;
    wrap.innerHTML = `
      <div class="card" style="padding:8px 12px;display:flex;gap:12px;align-items:center;margin-bottom:8px">
        <span style="font-size:22px">${sp.weather.icon}</span>
        <div style="flex:1;font-size:12.5px"><b>${sp.weather.name}</b> <span style="color:var(--dim)">— ${sp.weather.line}</span>${sp.weather.night ? ' <span class="pill" style="color:var(--cyn)">night</span>' : ''}</div>
        ${sp.event ? `<span class="pill" style="color:var(--gold)">${sp.event.icon} ${sp.event.name}</span>` : ''}
      </div>
      <div class="card" style="margin-bottom:8px"><div class="subhead" style="margin-bottom:6px">🗓️ Today's challenges</div>
        ${sp.challenges.list.map(c => `
          <div class="kv" style="align-items:center"><span class="k" style="flex:1">${c.icon} ${c.name} <span style="color:var(--dim)">(${c.prog}/${c.need})</span></span>
            <span class="v">${c.claimed ? '<span style="color:var(--ok)">✓</span>' : c.done ? `<button class="btn gold xs" data-act="challenge_claim" data-cid="${c.id}">Claim ${money(c.reward)}</button>` : `<span style="color:var(--dim)">${money(c.reward)}</span>`}</span></div>`).join('')}
      </div>`;
  }

  // ---------------- FINANCE EXTRAS (bank tab) ----------------
  async function renderBankSys() {
    const wrap = $('#bank-sys'); if (!wrap) return;
    const sp = await sysPanel(true);
    if (!sp) return;
    const ngt = (G.me.crypto && G.me.crypto.NGT) || 0;
    wrap.innerHTML = `
      <div class="card"><div class="subhead">🧊 NGT staking — ${(sp.stake.pct*100).toFixed(2)}%/day</div>
        <div class="kv"><span class="k">Locked</span><span class="v mono">${sp.stake.amt} NGT</span></div>
        <div class="kv"><span class="k">Accrued</span><span class="v mono" style="color:var(--ok)">+${sp.stake.gained} NGT</span></div>
        <div class="kv"><span class="k">Wallet</span><span class="v mono">${ngt} NGT</span></div>
        <div class="field" style="display:flex;gap:6px;margin-top:8px"><input class="in mono" id="stake-amt" placeholder="amount" style="width:120px">
          <button class="btn cyan xs" data-act="stake_ngt">Lock</button>
          <button class="btn ghost xs" data-act="unstake_ngt">Unlock</button></div></div>
      <div class="card"><div class="subhead">🔒 Term deposits</div>
        ${sp.term ? `<div class="kv"><span class="k">Locked</span><span class="v mono">${money(sp.term.amt)}</span></div>
          <div class="kv"><span class="k">Matures</span><span class="v">${fmtDur(Math.max(0, sp.term.until - sp.now))} → pays ${money(Math.round(sp.term.amt * (1 + sp.term.rate)))}</span></div>
          <button class="btn gold sm" data-act="term_collect">${sp.term.until <= sp.now ? 'Collect' : 'Break early (−2%)'}</button>`
        : `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><input class="in mono" id="term-amt" placeholder="$ amount" style="width:120px">
          <button class="btn ghost xs" data-act="term_deposit" data-hours="6">6h · 0.8%</button>
          <button class="btn ghost xs" data-act="term_deposit" data-hours="12">12h · 1.8%</button>
          <button class="btn ghost xs" data-act="term_deposit" data-hours="24">24h · 4%</button></div>`}</div>
      <div class="card"><div class="subhead">💹 Dividends</div>
        <div class="kv"><span class="k">Paid out so far</span><span class="v mono" style="color:var(--ok)">${money(sp.dividends.total)}</span></div>
        <p style="color:var(--dim);font-size:11.5px;margin-top:6px">Held shares drip small payouts every 6 hours — settles automatically as you play.</p></div>
      <div class="card"><div class="subhead">🛡️ Protection policy</div>
        ${sp.insurance.active ? `<p style="color:var(--ok);font-size:12.5px">Covered for ${fmtDur(sp.insurance.until - sp.now)} — muggings capped at 2% of cash.</p>`
        : `<p style="color:var(--dim);font-size:12.5px">None active. Buy the Protection Policy from the Market and use it.</p>`}</div>`;
  }

  // ---------------- SOCIAL / PROFILE EXTRAS ----------------
  async function renderProfileSys() {
    const wrap = $('#profile-sys'); if (!wrap) return;
    const sp = await sysPanel();
    if (!sp) return;
    const s = sp.social;
    wrap.innerHTML = `
      <div class="card"><div class="subhead">🤝 Your circle</div>
        ${s.friends.length ? s.friends.map(f => `<div class="kv" style="align-items:center"><span class="k">${esc(f.name)}</span><span class="v"><button class="btn ghost xs" data-act="friend_remove" data-target="${esc(f.name)}">Remove</button> <button class="btn cyan xs" data-nav="profile" data-pid="${f.id}">View</button></span></div>`).join('') : '<p style="color:var(--dim);font-size:12px">No friends yet. Add them by name.</p>'}
        <div class="field" style="display:flex;gap:6px;margin-top:8px"><input class="in" id="friend-name" placeholder="citizen name"><button class="btn cyan sm" data-act="friend_add">Add friend</button></div></div>
      <div class="card"><div class="subhead">🚫 Block list</div>
        ${s.blocked.length ? s.blocked.map(f => `<div class="kv" style="align-items:center"><span class="k">${esc(f.name)}</span><span class="v"><button class="btn ghost xs" data-act="block_remove" data-target="${esc(f.name)}">Unblock</button></span></div>`).join('') : '<p style="color:var(--dim);font-size:12px">Nobody. Yet.</p>'}
        <div class="field" style="display:flex;gap:6px;margin-top:8px"><input class="in" id="block-name" placeholder="citizen name"><button class="btn danger sm" data-act="block_add">Block</button></div></div>
      <div class="card"><div class="subhead">🎁 Send a gift</div>
        <div class="field" style="display:flex;gap:6px;flex-wrap:wrap">
          <input class="in" id="gift-to" placeholder="to (name)" style="width:140px">
          <select class="in" id="gift-item" style="max-width:220px">${Object.entries(G.me.items || {}).filter(([,q]) => q > 0).map(([id, q]) => `<option value="${id}">${(G.meta.items[id]||{}).icon||''} ${esc((G.meta.items[id]||{}).name||id)} ×${q}</option>`).join('') || '<option value="">— bag empty —</option>'}</select>
          <button class="btn gold sm" data-act="gift_send">Send</button></div></div>`;
  }
  function openRespecModal() {
    const me = G.me;
    const cur = { st: Math.floor(me.stats.st), de: Math.floor(me.stats.de), sp: Math.floor(me.stats.sp), dx: Math.floor(me.stats.dx) };
    const total = cur.st + cur.de + cur.sp + cur.dx;
    const root = $('#modal-root');
    const row = (k) => `<div class="kv" style="align-items:center"><span class="k">${FINGER[k]}</span><span class="v"><input class="in mono" id="rs-${k}" value="${cur[k]}" style="width:90px"></span></div>`;
    root.innerHTML = `<div class="modal"><div class="modal-card" style="max-width:420px">
      <div class="modal-title">📝 <span class="head">Identity rewrite</span></div>
      <p style="color:var(--mut);font-size:12.5px">Redistribute all <b class="mono">${total}</b> points. Every stat stays at least 5.</p>
      ${row('st')}${row('de')}${row('sp')}${row('dx')}
      <div class="kv"><span class="k">Placed</span><span class="v mono" id="rs-total">${total}</span></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="btn ghost" data-act="close-modal">Cancel</button>
        <button class="btn cyan" data-act="respec_go">Rewrite it</button></div></div></div>`;
    const upd = () => { const t = ['st','de','sp','dx'].reduce((a,k) => a + (parseInt(($('#rs-'+k)||{}).value,10)||0), 0); const el = $('#rs-total'); if (el) { el.textContent = t + ' / ' + total; el.style.color = t === total ? 'var(--ok)' : 'var(--bad)'; } };
    ['st','de','sp','dx'].forEach(k => { const el = $('#rs-'+k); if (el) el.addEventListener('input', upd); });
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
    // NOTE: don't call this `act` — it shadows the global act() dispatcher (the 'Do it again' button once died to that).
    const a = (e.target.closest('[data-act]') || {}).dataset && e.target.closest('[data-act]').dataset.act;
    if (a === 'close-scene') { SND.slice(); closeScene(); }
    if (a === 'skip-scene') { closeScene(); }
    if (a === 'again-crime') {
      const cid = e.target.closest('[data-crime]').dataset.crime;
      closeScene(); act('crime', { crimeId: cid }, 'crime');
    }
    if (a === 'close-modal') { if (G.needsEmail) { renderEmailGate(); return; } $('#modal-root').innerHTML = ''; }
    if (a === 'gate_email') { gateEmail(); return; }
    if (a === 'save-look') { saveLook(); }
    if (a === 'sound') { G.sound = !G.sound; localStorage.setItem('nsc_sound', G.sound ? '1' : '0'); SND.on = G.sound; openMenu(); }
    if (a === 'logout') { doLogout(); }
  }
  async function saveLook() {
    const me = G.me;
    const parts = AV.parts(me.avatar);
    const root = $('#modal-root');
    const cur = {};
    $$('[data-el-opt]', root).forEach(b => { if (b.classList.contains('on')) cur[b.dataset.elOpt] = +b.dataset.v; });
    const str = [cur.skin ?? parts.skin, cur.face ?? parts.face, cur.hair ?? parts.hair, cur.shirt ?? parts.shirt, cur.accent ?? parts.accent, cur.body ?? parts.body ?? 0, cur.eyes ?? parts.eyes ?? 0, cur.facial ?? parts.facial ?? 0].join('|');
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
      case 'informant_hire': { act('informant_hire', { informantId: btn.dataset.id }).then(() => { if (G.view === 'informants') refreshInformants($('#view')); }); break; }
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
  function openPassModal() {
    const me = G.me; if (!me) return;
    const on = me.sub && me.sub.active;
    const isFounder = me.sub && me.sub.founder;
    $('#modal-root').innerHTML = `<div class="modal-back" data-act="close-modal"></div>
      <div class="modal-card" style="max-width:440px">
        <div class="subhead" style="color:var(--gold)">⚡ The Wire Pass</div>
        <p style="color:var(--mut);font-size:12px;margin:0 0 12px">Seven days on the gold ledger. Serious people buy it because the maths is serious.</p>
        ${[['+60%', 'energy charge speed'], ['+25', 'maximum energy'], ['+5', 'nerve ceiling'], ['+8%', 'crime success'], ['+15%', 'gym gains'], ['−50%', 'stock & chain broker fees']].map(([b, k]) => `<div class="kv"><span>${k}</span><b style="color:var(--gold)">${b}</b></div>`).join('')}
        <div class="kv" style="border-bottom:none"><span>Tariff</span><b class="mono" style="color:var(--gold)">$150,000 in-game · 7 days</b></div>
        <p style="font-size:12px;margin:12px 0;color:${on ? 'var(--ok)' : 'var(--dim)'}">${on ? (isFounder ? '⚡ You carry the founder tier — it never lapses. ∞' : 'Active until ' + new Date(me.sub.until).toLocaleString() + '. Renewals stack.') : 'Not running. $150,000 a week, plain and simple.'}</p>
        ${isFounder ? `<div style="margin-top:8px"><button class="btn ghost" data-act="close-modal">Close</button></div>` : `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn gold" data-act="pass_buy" ${me.money < 150000 ? 'disabled' : ''}>${on ? 'Extend a week' : 'Go gold'} · $150,000</button>
        </div>
        <div style="border-top:1px solid var(--line);margin:14px 0 10px"></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn cyan" data-act="pay_window">💳 Pay with real money</button>
          <span style="color:var(--dim);font-size:11px">keeps the town alive — lands with the founder</span>
        </div>`}
        </div>`;
  }

  async function openPayModal() {
    const me = G.me; if (!me) return;
    if (me.sub && me.sub.founder) { U.toast('Founders carry it forever — this window is for everyone else.', 'good'); return; }
    if (!G.payCfg) { try { G.payCfg = await Net.get('/api/pay/config'); } catch (e) { U.toast(esc(e.message || 'Could not load payment config'), 'bad'); return; } }
    const cfg = G.payCfg;
    const pending = cfg.pendingClaim;
    $('#modal-root').innerHTML = `<div class="modal-back" data-act="close-modal"></div>
      <div class="modal-card" style="max-width:440px">
        <div class="subhead" style="color:var(--gold)">💳 Support the town — real-money pass</div>
        <p style="color:var(--mut);font-size:12px;margin:0 0 12px">Razor Town stays free. The gold pass is a real-money thank-you that lands <b>directly with the founder</b> — no middleman, ever.</p>
        ${cfg.link ? `<a class="btn gold big" style="width:100%;justify-content:center" href="${esc(cfg.linkUrl || cfg.link)}" target="_blank" rel="noopener noreferrer">${esc(cfg.label)} — ${cfg.provider ? 'pay via ' + esc(cfg.provider) : 'open secure checkout'} ↗</a>
        <p style="color:var(--dim);font-size:11px;margin:8px 0 0">Checkout runs in a new tab on Stripe's own page — card details never touch Razor Town.${cfg.autofulfill ? ' <b style="color:var(--ok)">The pass switches itself on about a minute after the card clears — no claim needed.</b>' : ''}</p>`
        : `<p style="color:var(--mut);font-size:12px;margin:0 0 10px">The founder's checkout link goes live shortly. File your claim below and they'll sort you on the Wire the second it's up.</p>`}
        ${pending ? `<div class="kv" style="border-bottom:none"><span>Claim #${pending.id}</span><b style="color:var(--warn)">waiting on the founder — filed ${new Date(pending.ts).toLocaleString()}</b></div>`
        : cfg.autofulfill ? `<p style="color:var(--dim);font-size:11.5px;margin:12px 0 0">Done paying? Close this and watch the gold banner — it flips on its own. (If five minutes pass with nothing, write the founder from Messages.)</p>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost" data-act="close-modal">Got it</button></div>`
        : `<div class="field" style="margin-top:12px"><label>Your name or payment reference</label>
           <input id="pay-ref" maxlength="120" placeholder="e.g. the email or name you paid with">
           </div>
           <div style="display:flex;gap:8px;margin-top:12px">
           <button class="btn ok" data-act="pay_claim" data-method="${cfg.link && /paypal/i.test(cfg.link) ? 'paypal' : cfg.link ? 'stripe' : 'other'}">${cfg.link ? "I've paid — file my claim" : 'File my claim anyway'}</button>
           <button class="btn ghost" data-act="close-modal">Not yet</button></div>
           <p style="color:var(--dim);font-size:11px;margin:8px 0 0">The founder checks claims personally — gold lands within a day, usually minutes.</p>`}
        </div>`;
  }

  async function claimPay() {
    const refEl = $('#pay-ref');
    const ref = (refEl && refEl.value.trim()) || '';
    if (!ref) { U.toast('Name or payment reference needed so the founder can match it.', 'bad'); return; }
    const btn = document.querySelector('[data-act="pay_claim"]');
    try {
      const r = await Net.post('/api/pay/claim', { method: (btn && btn.dataset.method) || 'other', ref });
      U.toast('Claim #' + r.claim_id + ' filed — watch your gold ledger.', 'good');
      G.payCfg = null;
      openPayModal();
    } catch (e) { U.toast(esc(e.message || 'Could not file the claim'), 'bad'); }
  }

  // =============== FOUNDER DEV PANEL ===============

  async function devSelf(btn) {
    const op = btn.dataset.op;
    if (op === 'reset_self') {
      if (!($('#dev-wipe-confirm') && $('#dev-wipe-confirm').value.trim() === 'WIPE')) { U.toast('Type WIPE into the box first.', 'bad'); return; }
      if (!confirm('Reset YOUR character to a brand-new citizen? Money, bank, items, stats, records — all gone. Sub + founder tier stay.')) return;
    }
    const payload = { op };
    // amount source is the main dev-amt field; also support data-amt implicit
    const amtVal = parseInt(($('#dev-amt') || { value: '' }).value, 10) || 0;
    if (btn.dataset.amt) payload.amount = amtVal || 100000;
    if (['grant_cash','grant_bank','set_money','give_vault','grant_xp','grant_rep','grant_merit'].includes(op)) payload.amount = amtVal || (op==='grant_merit'?1:100000);
    if (op === 'grant_merit' && !amtVal) payload.amount = 1;
    if (op === 'grant_xp' && !payload.amount) payload.amount = 5000;
    if (op === 'grant_rep' && !payload.amount) payload.amount = 5000;
    if (op === 'set_money') payload.amount = amtVal;
    if (op === 'set_stat') { payload.stat = ($('#dev-stat')||{value:'st'}).value; payload.value = parseInt(($('#dev-stat-val')||{value:'100'}).value,10)||100; }
    if (op === 'set_level') payload.level = parseInt(($('#dev-lvl') || { value: '' }).value, 10) || 1;
    if (op === 'grant_item') { payload.item = ($('#dev-item') || { value: '' }).value; payload.qty = parseInt(($('#dev-qty') || { value: '' }).value, 10) || 1; }
    try {
      const r = await Net.post('/api/dev/self', payload);
      if (r.me) { G.me = r.me; renderHUD(); renderRail(); }
      U.toast('Dev: ' + op + ' done.', 'good');
      if (op === 'reset_self') { nav('city'); } else { renderDev(); }
    } catch (e) { U.toast(esc(e.message || 'Dev op failed'), 'bad'); }
  }

  async function devWorld(btn) {
    const op = btn.dataset.op;
    const payload = { op };
    // world dials & live ops that do not need a target player
    if (op === 'weather') { payload.kind = ($('#dev-weather') || { value: 'auto' }).value; }
    else if (op === 'event') { payload.event = ($('#dev-event') || { value: '' }).value; payload.minutes = 20; }
    else if (op === 'economy') {
      payload.payout = parseInt(($('#dev-dial-payout') || { value: '100' }).value, 10) || 100;
      payload.danger = parseInt(($('#dev-dial-danger') || { value: '100' }).value, 10) || 100;
    }
    else if (op === 'spawn_bot') { payload.count = parseInt(($('#dev-bots') || { value: '3' }).value, 10) || 3; }
    else if (['purge_bots', 'metrics'].includes(op)) { /* targetless */ }
    else if (op === 'give_tip') { payload.kind = ($('#dev-tipkind') || { value: 'edge' }).value; }
    if (['weather', 'event', 'economy', 'spawn_bot', 'purge_bots', 'metrics'].includes(op)) {
      try {
        const r = await Net.post('/api/dev/world', payload);
        if (op === 'metrics' && r.metrics) {
          const m = r.metrics;
          $('#dev-metrics').innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;font-size:12px">
            ${Object.entries(m).map(([k, v]) => `<div><small class="dimtext">${esc(k)}</small><br><b style="color:var(--cyn)">${esc(typeof v === 'object' ? JSON.stringify(v) : String(v))}</b></div>`).join('')}</div>`;
        } else U.toast('Dev: ' + op + ' → ' + JSON.stringify(r).slice(0, 80), 'good');
        if (op === 'spawn_bot' || op === 'purge_bots') renderDev();
      } catch (e) { U.toast(e.message, 'bad'); }
      return;
    }
    if (op === 'announce') {
      payload.message = ($('#dev-msg') && $('#dev-msg').value.trim()) || '';
      if (!payload.message) { U.toast('Write a message first.', 'bad'); return; }
    } else {
      payload.target = parseInt(btn.dataset.tid || (($('#dev-target') || { value: '' }).value), 10);
      if (!payload.target) { U.toast('Pick a player.', 'bad'); return; }
      if (['grant_cash','grant_bank','set_money','give_vault','grant_xp','grant_rep','grant_merit'].includes(op)) payload.amount = parseInt(($('#dev-wamt') || { value: '' }).value, 10) || (op==='grant_merit'?1:100000);
      if (op === 'set_money') payload.amount = parseInt(($('#dev-wamt')||{value:''}).value,10)||0;
      if (op === 'grant_item') { const inv = Object.keys(G.meta.items); payload.item = inv[Math.floor(Math.random()*inv.length)]; payload.qty=1; }
      if (op === 'set_stat') { payload.stat='st'; payload.value=100; }
      if (op === 'set_level_target') payload.value = parseInt(($('#dev-wamt') || { value: '10' }).value, 10) || 10;
      if (op === 'hospital') payload.minutes=30;
      if (op === 'ban') {
        payload.reason = (prompt('Reason for the ban (shown to nobody but founders, kept in the ledger):') || '').trim();
        if (!confirm('Ban this account? They are locked out until you un-ban them.')) return;
      }
      if (op === 'unban') { if (!confirm('Lift the ban on this account?')) return; }
      if (op === 'set_password') {
        const pw = prompt('New password for this account (6+ characters):') || '';
        if (pw.length < 6) { U.toast('Too short — cancelled.', 'bad'); return; }
        payload.password = pw;
        if (!confirm('Replace their password now? They will use the one you just typed.')) return;
      }
      if (op === 'delete_account') {
        const sure = prompt('Deleting strands them fully — account, character, gang seat, listings, bounties, mail. Type the handle (@' + (btn.dataset.uname || '') + ') to confirm:') || '';
        if (sure.trim().toLowerCase() !== String(btn.dataset.uname || '').toLowerCase()) { U.toast('Handle mismatch — cancelled.', 'bad'); return; }
        if (!confirm('Final word: delete this account from Razor Town forever?')) return;
      }
    }
    try {
      await Net.post('/api/dev/world', payload);
      U.toast('Dev: ' + op + ' done.', 'good');
      renderDev();
    } catch (e) { U.toast(esc(e.message || 'Dev op failed'), 'bad'); }
  }

  function devDelArm(btn) {
    G.devArm = parseInt(btn.dataset.tid, 10);
    renderDev();
    setTimeout(() => { const i = $('#dev-del-inp'); if (i) i.focus(); }, 30);
  }
  async function devDelGo(btn) {
    const tid = parseInt(btn.dataset.tid, 10);
    const want = String(btn.dataset.uname || '').trim().toLowerCase();
    const got = (($('#dev-del-inp') || { value: '' }).value || '').trim().toLowerCase();
    if (got !== want) { U.toast('Type the exact handle to strike them off.', 'bad'); return; }
    G.devArm = null;
    try {
      await Net.post('/api/dev/world', { op: 'delete_account', target: tid });
      U.toast('Account struck from the ledger.', 'good');
      renderDev();
    } catch (e) { U.toast(esc(e.message || 'Delete failed'), 'bad'); }
  }

  async function devPayDecide(btn) {
    try {
      const r = await Net.post('/api/dev/world', { op: 'pay_decide', claim_id: parseInt(btn.dataset.claim, 10), approve: btn.dataset.approve === '1' });
      U.toast('Claim ' + r.decided + '.', 'good');
      renderDev();
    } catch (e) { U.toast(esc(e.message || 'Could not decide'), 'bad'); }
  }

      case 'use': act('use', { itemId: btn.dataset.item }); break;
      case 'deposit': case 'withdraw': {
        const amt = parseInt($('#bank-amt').value, 10) || 1000;
        act(actN, { amount: amt }); break;
      }
      case 'casino-game': clearRaceTimer(); CAS.game = btn.dataset.game; CAS.res = null; renderCasino(); break;
      case 'spin_wheel': spinGo(); break;
      case 'race_qb': { const bi = $('#race-bet'); if (bi) { bi.value = btn.dataset.v; bi.focus(); } break; }
      case 'race_runner': { RACE.sel = parseInt(btn.dataset.ri, 10) || 0; const el = document.getElementById('cas-special'); if (el) { drawCircuit(el, () => Date.now() + RACE.off); } break; }
      case 'race_bet': {
        const stake = parseInt(($('#race-bet') || {}).value, 10) || 0;
        const go = $('#race-go'); if (go) go.disabled = true;
        const rr = await Net.post('/api/action', { name: 'race_bet', runner: RACE.sel, stake }).catch(err => { U.toast(esc(err.message || 'Bet refused'), 'bad'); return null; });
        if (rr && rr.ok) { if (rr.p) applyMe(rr.p); U.toast(rr.res.text, 'good'); await refreshCircuit(); }
        if (go) go.disabled = false;
        break;
      }
      case 'heist_walk': { await actCatch('heist_walk', { group: btn.dataset.group }); break; }
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
      case 'faction_apply': act('faction_apply', { fid: +btn.dataset.fid }); break;
      case 'faction_leave': act('faction_leave', {}); break;
      case 'faction_roll': { const r = await actCatch('faction_roll', {}); if (r) { U.toast(esc(r.res.text), 'good'); renderFaction(); } break; }
      case 'faction_operation': { const r = await actCatch('faction_operation', { opId: btn.dataset.op }); if (r) { U.toast(esc(r.res.text), r.res.success ? 'good' : 'bad'); renderFaction(); } break; }
      case 'faction_recruiting': { const mode = ($('#frecruiting') || {}).value; const r = await actCatch('faction_recruiting', { mode }); if (r) renderFaction(); break; }
      case 'faction_review': { const r = await actCatch('faction_review', { targetId: +btn.dataset.tid, decision: btn.dataset.decision }); if (r) renderFaction(); break; }
      case 'faction_kick': { if (!confirm('Cut this hand loose? They walk with what they carry.')) break; const r = await actCatch('faction_kick', { targetId: +btn.dataset.tid }); if (r) { G.cache.factions = null; U.toast(esc(r.res.text || 'Cut loose.'), 'good'); renderFaction(); } break; }
      case 'faction_transfer': { if (!confirm('Hand them the WHOLE gang? You drop to officer. This cannot be undone.')) break; const r = await actCatch('faction_transfer', { targetId: +btn.dataset.tid }); if (r) { G.cache.factions = null; U.toast(esc(r.res.text || 'The flag changed hands.'), 'good'); renderFaction(); } break; }
      case 'faction_invite': { const iname = (($('#finvite-name') || {}).value || '').trim(); if (!iname) { U.toast('Name the citizen first.', 'bad'); break; } const r = await actCatch('faction_invite', { target: iname }); if (r) { U.toast(esc(r.res.text || 'Invite sent.'), 'good'); renderFaction(); } break; }
      case 'faction_invite_cancel': { const r = await actCatch('faction_invite_cancel', { targetId: +btn.dataset.tid }); if (r) renderFaction(); break; }
      case 'faction_edit': {
        const desc = (($('#fedit-desc') || {}).value || '').trim();
        const factionName = (($('#fedit-name') || {}).value || '').trim();
        const tag = (($('#fedit-tag') || {}).value || '').trim();
        const r = await actCatch('faction_edit', { desc, factionName, tag });
        if (r) { G.cache.factions = null; U.toast(esc(r.res.text || 'Flag saved.'), 'good'); renderFaction(); }
        break;
      }
      case 'farmory_in': { const itemId = ($('#farmory-item') || {}).value; const qty = parseInt(($('#farmory-qty') || {}).value, 10) || 0; if (!itemId) break; const r = await actCatch('farmory_in', { itemId, qty }); if (r) { U.toast(esc(r.res.text || 'Stashed.'), 'good'); renderFaction(); } break; }
      case 'farmory_out': { const qty = parseInt(($('#farmory-qty') || {}).value, 10) || 1; const r = await actCatch('farmory_out', { itemId: btn.dataset.item, qty }); if (r) { U.toast(esc(r.res.text || 'Drawn.'), 'good'); renderFaction(); } break; }
      case 'faction_raid': { const r = await actCatch('faction_raid', { fid: +btn.dataset.fid }); if (r) { G.cache.factions = null; U.toast(esc(r.res.text || 'The raid went out.'), r.res.win ? 'good' : 'bad'); if (r.res.win) SND.win(); renderFaction(); } break; }
      case 'side_toggle': document.body.classList.toggle('side-open'); break;
      case 'transfer': FIN.sub = 'bank'; nav('bank'); break;
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
      case 'pay_window': openPayModal(); break;
      case 'pay_claim': claimPay(); break;
      case 'dev_self': devSelf(btn); break;
      case 'dev_world': devWorld(btn); break;
      case 'prison': prisonGo(btn); break;
      case 'bail_other': bailOther(btn); break;
      case 'daily_claim': dailyClaim(); break;
      case 'wire_send': wireGo(); break;
      case 'dev_del_arm': devDelArm(btn); break;
      case 'dev_del_go': devDelGo(btn); break;
      case 'dev_info': { const x = btn.dataset.x && document.getElementById(btn.dataset.x); if (x) x.style.display = x.style.display === 'none' ? '' : 'none'; break; }
      case 'dev_pay': devPayDecide(btn); break;
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
      // ---------------- 2026 systems ----------------
      case 'mines_deal': { const bet = parseInt(($('#mines-bet') || {}).value, 10) || 0; const r = await actCatch('arcade_mines', { op: 'start', bet }); if (r) { sysPanel(true).then(renderArcade); } break; }
      case 'mine_tile': { const r = await actCatch('arcade_mines', { op: 'pick', tile: +btn.dataset.tile }); if (r) { sysPanel(true).then(renderArcade); } break; }
      case 'mines_cashout': { const r = await actCatch('arcade_mines', { op: 'cashout' }); if (r) { SND.win(); sysPanel(true).then(renderArcade); } break; }
      case 'mines_abandon': { await actCatch('arcade_mines', { op: 'abandon' }); sysPanel(true).then(renderArcade); break; }
      case 'plinko_drop': { const bet = parseInt(($('#plinko-bet') || {}).value, 10) || 0; const r = await actCatch('arcade_plinko', { bet }); if (r && r.res) { const el = $(`[data-plinko-slot="${r.res.slot}"]`); if (el) el.classList.add('hit'); if (r.res.win) SND.win(); U.toast(esc(r.res.text), r.res.win ? 'good' : 'bad'); setTimeout(() => { sysPanel(true).then(renderArcade); }, 900); } break; }
      case 'dice_call': { const bet = parseInt(($('#dice-bet') || {}).value, 10) || 0; const r = await actCatch('arcade_dice', { bet, call: btn.dataset.call }); if (r && r.res) { U.toast(esc(r.res.text), r.res.hit ? 'good' : 'bad'); sysPanel(true).then(renderArcade); } break; }
      case 'coin_call': { const bet = parseInt(($('#coin-bet') || {}).value, 10) || 0; const r = await actCatch('arcade_coin', { bet, call: btn.dataset.call }); if (r && r.res) { U.toast(esc(r.res.text), r.res.win ? 'good' : 'bad'); sysPanel(true).then(renderArcade); } break; }
      case 'hoops_zone': { const r = await actCatch('arcade_hoops', { zone: +btn.dataset.zone }); if (r && r.res) { U.toast(esc(r.res.text), r.res.win ? 'good' : 'bad'); sysPanel(true).then(renderArcade); } break; }
      case 'buzz_start': {
        if (AR.buzzStart) { const ms = Date.now() - AR.buzzStart; AR.buzzStart = 0; const r = await actCatch('arcade_buzz', { ms }); if (r && r.res) { U.toast(esc(r.res.text), r.res.win ? 'good' : 'bad'); sysPanel(true).then(renderArcade); } }
        else { AR.buzzStart = Date.now(); btn.textContent = 'STOP!'; btn.classList.remove('cyan'); btn.classList.add('danger'); }
        break;
      }
      case 'mem_deal': {
        if (AR.memCards.length) break;
        const syms = ['🍒','🍋','💎','🔔','🍀','🎲','🚗','🎧'];
        AR.memCards = [...syms, ...syms].map(v => ({ v, done: false })).sort(() => Math.random() - 0.5);
        AR.memFlips = 0; AR.memOpen = []; AR.memDone = 0;
        btn.style.display = 'none'; paintMemory();
        break;
      }
      case 'safe_deal': {
        const r = await actCatch('arcade_safe', { op: 'deal', len: +btn.dataset.len });
        if (r && r.res && r.res.seq) { AR.safeSeq = r.res.seq; AR.safeLen = r.res.len; paintSafe(); }
        break;
      }
      case 'scratch_go': {
        const r = await actCatch('scratch', { qty: +btn.dataset.qty });
        if (r && r.res) {
          const out = $('#scratch-out');
          if (out) out.innerHTML = r.res.results.map(x => `<div class="card" style="padding:8px;margin-top:8px;display:inline-grid;grid-template-columns:repeat(3,34px);gap:4px;margin-right:10px">${x.grid.map(s => `<span style="text-align:center;font-size:18px">${s}</span>`).join('')}</div>`).join('') + `<p style="color:${r.res.total ? 'var(--gold)' : 'var(--dim)'};font-size:12.5px;margin-top:8px">${esc(r.res.text)}</p>`;
          sysPanel(true);
        }
        break;
      }
      case 'lottery_go': { const r = await actCatch('lottery_buy', { qty: +btn.dataset.qty }); if (r) sysPanel(true).then(renderArcade); break; }
      case 'gig_do': { const r = await actCatch('gig_do', { gigId: btn.dataset.gig }); if (r) { U.toast(esc(r.res.text || 'Gig done.'), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'city_contract': { const r = await actCatch('city_contract', { contractId: btn.dataset.contract }); if (r) { U.toast(esc(r.res.text || 'Contract resolved.'), r.res.win ? 'good' : 'bad'); if (r.res.win) SND.win(); sysPanel(true).then(renderHustle); } break; }
      case 'night_lead': { const r = await actCatch('night_lead', { leadId: btn.dataset.lead }); if (r) { U.toast(esc(r.res.text || 'Brief resolved.'), r.res.win ? 'good' : 'bad'); if (r.res.win) SND.win(); sysPanel(true).then(renderHustle); } break; }
      case 'wire_favour': { const r = await actCatch('wire_favour', { favourId: btn.dataset.favour }); if (r) { U.toast(esc(r.res.text || 'Favour resolved.'), r.res.win ? 'good' : 'bad'); if (r.res.win) SND.win(); sysPanel(true).then(renderHustle); } break; }
      case 'street_eat': { const r = await actCatch('street_eat', { foodId: btn.dataset.food }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_out': { const r = await actCatch('street_out', { venueId: btn.dataset.venue }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_pet': { const r = await actCatch('street_pet', { petId: btn.dataset.pet }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_rehome': { const r = await actCatch('street_rehome', { petId: btn.dataset.pet }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_ink': { const r = await actCatch('street_ink', { tatId: btn.dataset.tat }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_meet': { const r = await actCatch('street_meet', { contactId: btn.dataset.contact }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_call': { const r = await actCatch('street_call', { contactId: btn.dataset.contact }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_hide': { const r = await actCatch('street_hide', { hideId: btn.dataset.hide }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_rest': { const r = await actCatch('street_rest'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_crate': { const r = await actCatch('street_crate', { crateId: btn.dataset.crate }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_skin': { const r = await actCatch('street_skin', { skinId: btn.dataset.skin }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_wear_skin': { const r = await actCatch('street_wear_skin', { skinId: btn.dataset.skin }); if (r) sysPanel(true).then(renderStreet); break; }
      case 'street_mod': { const r = await actCatch('street_mod', { idx: +btn.dataset.idx, modId: btn.dataset.mod }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_streak': { const r = await actCatch('street_streak'); if (r) { U.toast(esc(r.res.text), 'good'); SND.cash(); sysPanel(true).then(renderStreet); } break; }
      case 'street_cool': { const r = await actCatch('street_cool'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderStreet); } break; }
      case 'street_snack': { const r = await actCatch('street_snack'); if (r) { U.toast(esc(r.res.text), 'good'); } break; }
      case 'courier_take': { const r = await actCatch('courier_take'); if (r) sysPanel(true).then(renderHustle); break; }
      case 'courier_deliver': { const r = await actCatch('courier_deliver'); if (r) { U.toast(esc(r.res.text), r.res.late ? 'bad' : 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'fish_cast': { const r = await actCatch('fish_cast'); if (r) { U.toast(`${r.res.icon || '🎣'} ${esc(r.res.text)}`, 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'salvage_run': { const r = await actCatch('salvage_run'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'plasma_donate': { const r = await actCatch('plasma_donate'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'trial_join': { const r = await actCatch('trial_join'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'busk_play': { const r = await actCatch('busk_play'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'storage_open': openStorageModal(); break;
      case 'box_open': { const r = await actCatch('box_open'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); renderItemsSys(); } break; }
      case 'drop_buy': { const r = await actCatch('drop_buy', { itemId: btn.dataset.item }); if (r) { SND.big(); sysPanel(true).then(renderHustle); } break; }
      case 'clout_post': { const caption = ($('#clout-cap') || {}).value || ''; const r = await actCatch('clout_post', { caption }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'tag_wall': { const districtId = ($('#tag-district') || {}).value; const r = await actCatch('tag_wall', { districtId }); if (r) { U.toast(esc(r.res.text), r.res.busted ? 'bad' : 'good'); sysPanel(true).then(renderHustle); } break; }
      case 'car_buy': { const r = await actCatch('car_buy', { carId: btn.dataset.car }); if (r) { SND.win(); sysPanel(true).then(renderGarage); } break; }
      case 'car_sell': { const r = await actCatch('car_sell', { idx: +btn.dataset.idx }); if (r) sysPanel(true).then(renderGarage); break; }
      case 'chop_car': { if (!confirm('Feed this car to the chop shop? It comes back as parts and cash.')) break; const r = await actCatch('chop_car', { idx: +btn.dataset.idx }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderGarage); renderItemsSys(); } break; }
      case 'car_paint': openPaintModal(+btn.dataset.idx); break;
      case 'race_car': { const r = await actCatch('street_race', { idx: +btn.dataset.idx }); if (r && r.res) { U.toast(esc(r.res.text), r.res.win ? 'good' : 'bad'); if (r.res.win) SND.win(); sysPanel(true).then(renderGarage); } break; }
      case 'turf_claim': { const r = await actCatch('turf_claim', { districtId: btn.dataset.d }); if (r) { U.toast(esc(r.res.text), r.res.took === false ? 'bad' : 'good'); sysPanel(true).then(renderTurf); } break; }
      case 'turf_release': { const r = await actCatch('turf_release', { districtId: btn.dataset.d }); if (r) sysPanel(true).then(renderTurf); break; }
      case 'turf_collect': { const r = await actCatch('turf_collect'); if (r) { SND.cash(); sysPanel(true).then(renderTurf); } break; }
      case 'stake_ngt': { const amount = parseFloat(($('#stake-amt') || {}).value) || 0; const r = await actCatch('stake_ngt', { amount }); if (r) sysPanel(true).then(renderBankSys); break; }
      case 'unstake_ngt': { const amount = parseFloat(($('#stake-amt') || {}).value) || 0; const r = await actCatch('unstake_ngt', { amount }); if (r) sysPanel(true).then(renderBankSys); break; }
      case 'term_deposit': { const amount = parseInt(($('#term-amt') || {}).value, 10) || 0; const r = await actCatch('term_deposit', { amount, hours: +btn.dataset.hours }); if (r) sysPanel(true).then(renderBankSys); break; }
      case 'term_collect': { const r = await actCatch('term_collect'); if (r) sysPanel(true).then(renderBankSys); break; }
      case 'craft': { const r = await actCatch('craft', { recipeId: btn.dataset.recipe }); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderItemsSys); } break; }
      case 'card_open': { const r = await actCatch('card_open'); if (r) { U.toast(esc(r.res.text), 'good'); sysPanel(true).then(renderItemsSys); } break; }
      case 'challenge_claim': { const r = await actCatch('challenge_claim', { cid: btn.dataset.cid }); if (r) { SND.cash(); sysPanel(true).then(renderCitySys); } break; }
      case 'friend_add': { const target = ($('#friend-name') || {}).value; const r = await actCatch('friend_add', { target }); if (r) sysPanel(true).then(renderProfileSys); break; }
      case 'friend_remove': { const r = await actCatch('friend_remove', { target: btn.dataset.target }); if (r) sysPanel(true).then(renderProfileSys); break; }
      case 'block_add': { const target = ($('#block-name') || {}).value; const r = await actCatch('block_add', { target }); if (r) sysPanel(true).then(renderProfileSys); break; }
      case 'block_remove': { const r = await actCatch('block_remove', { target: btn.dataset.target }); if (r) sysPanel(true).then(renderProfileSys); break; }
      case 'gift_send': { const to = ($('#gift-to') || {}).value; const itemId = ($('#gift-item') || {}).value; const r = await actCatch('gift_send', { to, itemId, qty: 1 }); if (r) { U.toast(esc(r.res.text), 'good'); } break; }
      case 'respec_open': openRespecModal(); break;
      case 'respec_go': {
        const stats = {};
        for (const k of ['st','de','sp','dx']) stats[k] = parseInt(($('#rs-' + k) || {}).value, 10) || 0;
        const r = await actCatch('respec_apply', { stats });
        if (r) { $('#modal-root').innerHTML = ''; U.toast('Identity rewritten.', 'good'); }
        break;
      }
    }
  }
  // ---- storage unit modal
  async function openStorageModal() {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal"><div class="modal-card"><div class="modal-title">📦 <span class="head">The storage yard</span></div><p style="color:var(--dim);font-size:12.5px">${U.spinner ? 'Rolling the shutters…' : ''}</p></div></div>`;
    let r = null;
    try { r = await Net.post('/api/action', { name: 'storage_open' }); } catch (e) { root.innerHTML = ''; U.toast(esc(e.message), 'bad'); return; }
    if (!r || !r.res || !r.res.browse) { root.innerHTML = ''; U.toast(esc((r && r.err) || 'No units today.'), 'bad'); return; }
    root.innerHTML = `<div class="modal"><div class="modal-card">
      <div class="modal-title">📦 <span class="head">Pick a unit — one a day</span></div>
      ${r.res.units.map((u, i) => `<div class="kv" style="align-items:center"><span class="k" style="flex:1">Unit ${i+1} — <span style="color:var(--dim)">${esc(u.hint)}</span></span>
        <span class="v"><b class="mono" style="color:var(--gold)">${money(u.price)}</b> <button class="btn gold xs" data-sunit="${i}" ${G.me.money >= u.price ? '' : 'disabled'}>Open</button></span></div>`).join('')}
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn ghost" data-act="close-modal">Walk away</button></div></div></div>`;
    $$('[data-sunit]', root).forEach(b => b.addEventListener('click', async () => {
      const rr = await actCatch('storage_open', { unitIdx: +b.dataset.sunit });
      root.innerHTML = '';
      if (rr && rr.res) { U.toast(esc(rr.res.text), rr.res.profit > 0 ? 'good' : 'bad'); if (rr.res.profit > 0) SND.win(); sysPanel(true).then(renderHustle); }
    }));
  }
  // ---- paint modal
  function openPaintModal(idx) {
    const root = $('#modal-root');
    const colors = ['#16161a', '#e8e2d4', '#8f2f28', '#28395c', '#1f4d3a', '#d9c36a', '#4fc3f7', '#e2b714', '#9c4dc4', '#ff7043'];
    root.innerHTML = `<div class="modal"><div class="modal-card" style="max-width:380px">
      <div class="modal-title">🎨 <span class="head">Respray bay ${idx + 1}</span></div>
      <div class="chiprow" style="margin:10px 0">${colors.map(c => `<button class="chip swatch" data-pcolor="${c}" style="background:${c}"><span style="opacity:0">x</span></button>`).join('')}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-act="close-modal">Cancel</button></div></div></div>`;
    $$('[data-pcolor]', root).forEach(b => b.addEventListener('click', async () => {
      const r = await actCatch('car_paint', { idx, color: b.dataset.pcolor });
      root.innerHTML = '';
      if (r) sysPanel(true).then(renderGarage);
    }));
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
