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
  // NPC factions if none and enough bot players (skipped entirely in a real-players-only world)
  const factionCount = db.prepare('SELECT COUNT(*) c FROM factions').get().c;
  if (factionCount === 0 && want > 0) {
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

// Remove every NPC from the world: bot accounts, their characters, the seeded gangs,
// and any news that mentions them. Real accounts, real gangs and their leader can keep
// playing. Returns a summary of what was deleted. Safe to run repeatedly.
function purgeNPCs() {
  const db = dbm.getDb();
  const bots = db.prepare("SELECT a.id AS id, p.name AS name FROM accounts a LEFT JOIN players p ON p.acc_id=a.id WHERE a.kind='bot'").all();
  const botIds = bots.map(b => b.id);
  const botNames = bots.map(b => b.name).filter(Boolean);

  // A gang is "seeded" when it was NOT founded by a real account. seed.js gives them a
  // bot owner; player-founded gangs store the founder's real account id (createFaction).
  // Real players who joined a seeded gang are simply pulled out of it below.
  const humanIds = new Set(db.prepare("SELECT id FROM accounts WHERE kind!='bot'").all().map(r => r.id));
  const factions = db.prepare('SELECT id, name, tag, json FROM factions').all();
  const npcFactions = [];
  const npcGangNames = [];
  for (const f of factions) {
    let j = {};
    try { j = JSON.parse(f.json || '{}'); } catch (e) {}
    if (humanIds.has(j.ownerAcc)) continue;            // founded by a real player -> keep
    npcFactions.push(f.id);
    if (f.name) npcGangNames.push(f.name);
  }

  const result = { bots: 0, characters: 0, messages: 0, factions: 0, membersRemoved: 0, news: 0 };
  const tx = db.transaction(() => {
    for (const id of botIds) {
      result.messages += db.prepare('DELETE FROM messages WHERE from_acc=? OR to_acc=?').run(id, id).changes;
      result.characters += db.prepare('DELETE FROM players WHERE acc_id=?').run(id).changes;
      result.bots += db.prepare('DELETE FROM accounts WHERE id=?').run(id).changes;
    }
    const gone = new Set(npcFactions);
    for (const fid of npcFactions) {
      result.factions += db.prepare('DELETE FROM factions WHERE id=?').run(fid).changes;
    }
    // pull every player out of the gangs we just deleted (bots are already gone)
    const players = db.prepare('SELECT acc_id, json FROM players').all();
    for (const r of players) {
      let q;
      try { q = JSON.parse(r.json); } catch (e) { continue; }
      if (q.faction != null && gone.has(q.faction)) {
        q.faction = null;
        db.prepare('UPDATE players SET json=? WHERE acc_id=?').run(JSON.stringify(q), r.acc_id);
        result.membersRemoved++;
      }
    }
    // news about people and gangs that no longer exist would read as ghosts
    const tokens = [...botNames, ...npcGangNames];
    if (tokens.length) {
      const rows = db.prepare('SELECT id, message FROM news').all();
      for (const n of rows) {
        if (tokens.some(t => n.message.includes(t))) result.news += db.prepare('DELETE FROM news WHERE id=?').run(n.id).changes;
      }
    }
  });
  tx();
  return result;
}

// QA verification probes: throwaway `qa_*` accounts my browser harness registers against a
// deployment to walk the live build. They must never linger in the world — and a scrub is a
// removal, not a hiding. The activity guard protects a human who picks a `qa_*` name and
// actually plays: any crime, training, banking, cash movement or reputation keeps their account alive.
// Note the origin pick seeds xp=60 at registration, so xp alone cannot tell probes from players.
function purgeQAProbes() {
  const db = dbm.getDb();
  const cands = db.prepare(
    "SELECT a.id AS id FROM accounts a LEFT JOIN players p ON p.acc_id=a.id " +
    "WHERE a.kind='user' AND a.username LIKE 'qa\\_%' ESCAPE '\\'"
  ).all();
  const ids = [];
  for (const c of cands) {
    const row = db.prepare('SELECT json FROM players WHERE acc_id=?').get(c.id);
    let active = false;
    try {
      const q = JSON.parse(row.json);
      active = (q.reputation || 0) > 0 || (q.total_crimes || 0) > 0 || (q.total_gyms || 0) > 0 ||
               (q.bank || 0) > 0 || (q.vault || 0) > 0 || (q.money !== undefined && q.money !== 2500);
    } catch (e) { active = true; }
    if (!active) ids.push(c.id);
  }
  if (!ids.length) return 0;
  let removed = 0;
  const tx = db.transaction(() => {
    for (const id of ids) {
      db.prepare('DELETE FROM messages WHERE from_acc=? OR to_acc=?').run(id, id);
      db.prepare('DELETE FROM bounties WHERE from_acc=? OR (target_acc=? AND claimed_by IS NULL)').run(id, id);
      db.prepare('DELETE FROM listings WHERE seller_acc=?').run(id);
      db.prepare('DELETE FROM players WHERE acc_id=?').run(id);
      removed += db.prepare('DELETE FROM accounts WHERE id=?').run(id).changes;
    }
  });
  tx();
  return removed;
}

module.exports = { seedWorld, makeBotPlayer, xpForLevel, purgeNPCs, purgeQAProbes };
