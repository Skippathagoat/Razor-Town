// Razor Town — world seeder: bot citizens + NPC factions
'use strict';
const dbm = require('./db.js');
const A = require('./accounts.js');
const C = require('./game/content.js');
const E = require('./game/engine.js');

function xpForLevel(lvl) {
  let need = 300, acc = 0;
  for (let l = 1; l < lvl; l++) { acc += need; need = Math.floor(need * 1.06) + 100; }
  return acc;
}

function rnd(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rnd(arr.length)]; }
function randItemId(types) {
  const ids = Object.keys(C.ITEMS).filter(id => types.includes(C.ITEMS[id].type));
  return ids.length ? pick(ids) : 'volt_cola';
}

function makeBotPlayer(i) {
  const db = dbm.getDb();
  const username = '~bot' + i;
  if (db.prepare('SELECT id FROM accounts WHERE username=?').get(username)) return null;
  const salt = A.makeSalt ? A.makeSalt() : '';
  db.prepare('INSERT INTO accounts (id, username, pass_hash, salt, kind, created_at) VALUES (?,?,?,?,?,?)')
    .run(-i, username, 'x', salt || 'bot', 'bot', Date.now() - Math.floor(Math.random() * 30) * 86400000);

  const level = [1,1,2,2,3,4,5,6,8,10,13,16,19,22,26,30][Math.min(15, i % 16)] * (0.8 + Math.random() * 0.5) | 0;
  const origin = pick(C.ORIGINS);
  const name = pick(C.BOT_FIRST) + ' ' + pick(C.BOT_LAST);
  const p = A.defaultPlayerJson({ name, origin: origin.id, avatar: [rnd(4), rnd(6), rnd(6), rnd(7), rnd(5)].join('|'), bio: '' });
  p.xp = xpForLevel(level) + Math.floor(Math.random() * 200);
  const e = E.levelFromXp(p.xp);
  p.level = e.level;
  const s = p.stats;
  const t = Math.max(1, Math.round((p.level * (2 + Math.random())) * (Math.random() < 0.2 ? 2.4 : 1)));
  // spread stats around a total, with a specialty
  const sp = (() => { const ks = ['st','de','sp','dx']; let left = t; const v = {}; for (let k = 0; k < 3; k++) { v[ks[k]] = Math.max(2, Math.round(left * (0.18 + Math.random() * 0.2))); left -= v[ks[k]]; } v[ks[3]] = Math.max(2, left); return v; })();
  p.stats.st = s.st + sp.st; p.stats.de = s.de + sp.de; p.stats.sp = s.sp + sp.sp; p.stats.dx = s.dx + sp.dx;
  const cash = Math.round(Math.pow(p.level, 2.1) * (120 + Math.random() * 220));
  p.money = Math.round(cash * (0.5 + Math.random() * 0.7));
  p.bank = Math.round(cash * (0.6 + Math.random() * 1.6));
  p.happy = 40 + rnd(55);
  p.total_crimes = p.level * (6 + rnd(10));
  p.wins = Math.round(p.level * (1.5 + Math.random() * 3));
  p.losses = Math.round(p.wins * (0.4 + Math.random() * 0.8));
  p.reputation = p.total_crimes * 4 + p.wins * 25 + rnd(800);
  p.total_success = Math.round(p.total_crimes * 0.72);
  // loot odds
  const junk = ['thick_wallet','neon_phone','pixelbox_x','volt_cola','rainy_ale','black_espr','noir_whisky','gold_chain','crypto_rig'];
  for (const id of junk) if (Math.random() < 0.35) p.items[id] = 1 + rnd(3);
  if (Math.random() < 0.25) p.items['trauma_kit'] = 1 + rnd(2);
  if (Math.random() < 0.3) p.items['lockpicks'] = 1 + rnd(3);
  if (p.level >= 10 && Math.random() < 0.5) p.items['spike'] = 1 + rnd(2);
  if (Math.random() < 0.08) p.items['ice_ring'] = 1;
  // job
  const jobs = C.JOBS.filter(j => p.level >= j.minLvl && Math.random() < 0.5);
  if (jobs.length) p.job = pick(jobs).id;
  p.energy = Math.min(p.max_energy, 40 + rnd(60));
  p.nerve = Math.min(p.max_nerve, Math.round(p.max_nerve * (0.4 + Math.random() * 0.6)));
  p.life = Math.min(p.max_life, Math.round(p.max_life * (0.35 + Math.random() * 0.65)));
  p.boosters = {};
  const j = JSON.stringify(p);
  db.prepare('INSERT INTO players (acc_id, name, avatar, json, updated_at) VALUES (?,?,?,?,?)')
    .run(-i, p.name, p.avatar, j, Date.now());
  return p;
}

function seedWorld(opts = {}) {
  const db = dbm.getDb();
  const want = opts.bots || 42;
  const have = db.prepare('SELECT COUNT(*) c FROM accounts WHERE kind=?').get('bot').c;
  if (have < want) {
    for (let i = 1; i <= want; i++) {
      try { makeBotPlayer(i); } catch (e) { /* id collision across boots is fine */ }
    }
  }
  // NPC factions if none and enough bot players
  const factionCount = db.prepare('SELECT COUNT(*) c FROM factions').get().c;
  if (factionCount === 0) {
    const bots = db.prepare('SELECT id FROM accounts WHERE kind=? ORDER BY id LIMIT 40').all('bot');
    const mk = (name, tag, desc, slice) => {
      const members = bots.slice(slice[0], slice[1]).map(r => r.id);
      db.prepare('INSERT INTO factions (name, tag, json, created_at) VALUES (?,?,?,?)')
        .run(name, tag, JSON.stringify({ desc, ownerAcc: members[0] || -1, ownerName: 'Boss', memberIds: members, power: members.length * 100, createdAt: Date.now() }), Date.now());
    };
    mk('The Crown Street Gang', 'CROWN', 'Old money, older grudges. The town runs on their clock.', [0, 14]);
    mk('The Canal Basin Mob', 'BASIN', 'New blood with sharp razors and louder ambitions.', [14, 26]);
    mk('The Rag Market Crew', 'RAGS', 'Small crew, big ideas, and the quickest hands in the market.', [26, 36]);
  }
  // some ambient news on a fresh world
  const nCount = db.prepare('SELECT COUNT(*) c FROM news').get().c;
  if (nCount === 0) {
    const now = Date.now();
    const msgs = [
      ['faction', '\uD83E\uDE92', 'The Crown Street Gang tightens its grip on the Bull Ring.'],
      ['crime', '\uD83D\uDCB8', 'A wages van vanished between checkpoints last night. Nobody is talking.'],
      ['news', '\uD83D\uDEA8', 'The Town Hall denies there is a crime wave. The crime wave applauds the denial.'],
      ['fight', '\u2694\uFE0F', 'Street fights are up 40% this quarter. The boxing halls are making a killing.'],
    ];
    msgs.forEach((m, i) => db.prepare('INSERT INTO news (ts, kind, icon, message) VALUES (?,?,?,?)').run(now - (msgs.length - i) * 600000, m[0], m[1], m[2]));
  }
  return { bots: want };
}

module.exports = { seedWorld, makeBotPlayer, xpForLevel };
