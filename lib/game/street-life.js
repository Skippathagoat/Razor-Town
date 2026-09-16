// Street Life — pets, ink, food, nightlife, contacts, hideouts, crates,
// weapon skins, vehicle mods, login streak, street heat.
'use strict';

module.exports = function streetLife(ctx) {
  const { W, C, E, sys, locked, err, now, MIN, HOUR, DAY, rnd, pick, M } = ctx;

  function ensure(p) {
    const s = sys(p);
    if (!s.life || typeof s.life !== 'object') s.life = {};
    const L = s.life;
    if (!Array.isArray(L.pets)) L.pets = [];
    if (!Array.isArray(L.ink)) L.ink = [];
    if (!Array.isArray(L.contacts)) L.contacts = [];
    if (!Array.isArray(L.skins)) L.skins = [];
    if (L.hideout == null) L.hideout = null;
    if (!Number.isFinite(L.foodAt)) L.foodAt = 0;
    if (!Number.isFinite(L.nightAt)) L.nightAt = 0;
    if (!Number.isFinite(L.callAt)) L.callAt = 0;
    if (!Number.isFinite(L.heat)) L.heat = 0;
    if (!Number.isFinite(L.heatAt)) L.heatAt = now();
    if (!L.streak || typeof L.streak !== 'object') L.streak = { day: 0, n: 0, claimed: false };
    decayHeat(p);
    tickStreak(p);
    return L;
  }

  function dayNum() { return M.floor(now() / DAY); }

  function decayHeat(p) {
    const L = p.sys.life;
    const elapsed = now() - (L.heatAt || now());
    const drop = M.floor(elapsed / (3 * MIN));
    if (drop > 0) {
      L.heat = M.max(0, (L.heat || 0) - drop);
      L.heatAt = now();
    }
  }

  function addHeat(p, n) {
    const L = ensure(p);
    L.heat = M.min(100, (L.heat || 0) + n);
    L.heatAt = now();
  }

  function tickStreak(p) {
    const L = p.sys.life;
    const d = dayNum();
    if (L.streak.day === d) return;
    if (L.streak.day === d - 1) {
      L.streak.n = (L.streak.n || 0);
      L.streak.claimed = false;
      L.streak.day = d;
    } else if (L.streak.day !== d) {
      if (L.streak.day && L.streak.day < d - 1) L.streak.n = 0;
      L.streak.day = d;
      L.streak.claimed = false;
    }
  }

  function applyEffect(p, effect) {
    if (!effect) return;
    if (effect.energy) p.energy = M.min(p.max_energy || 100, (p.energy || 0) + effect.energy);
    if (effect.happy) p.happy = M.min(p.max_happy || 100, (p.happy || 0) + effect.happy);
    if (effect.nerve) p.nerve = M.min(p.max_nerve || 20, (p.nerve || 0) + effect.nerve);
    if (effect.life) p.life = M.min(p.max_life || 200, (p.life || 0) + effect.life);
    if (effect.rep) p.reputation = (p.reputation || 0) + effect.rep;
  }

  function petBuffs(p) {
    const L = ensure(p);
    const out = { happy: 0, crimePct: 0, st: 0, de: 0, sp: 0, dx: 0 };
    for (const id of L.pets) {
      const pet = (C.PETS || []).find(x => x.id === id);
      if (!pet || !pet.buff) continue;
      for (const k of Object.keys(out)) out[k] += pet.buff[k] || 0;
    }
    return out;
  }

  function eatFood(accId, foodId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const food = (C.STREET_FOOD || []).find(x => x.id === String(foodId || ''));
    if (!food) return err('That stall packed up.');
    if (now() - L.foodAt < 8 * MIN) return err('Still full — wait ' + M.ceil((L.foodAt + 8 * MIN - now()) / MIN) + ' min.');
    if ((p.money || 0) < food.price) return err('Not enough cash for ' + food.name + '.');
    p.money -= food.price;
    applyEffect(p, food.effect);
    L.foodAt = now();
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { food: food.name, text: `${food.icon} ${food.name}. ${food.desc}` } };
  }

  function goOut(accId, venueId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const v = (C.NIGHTLIFE_VENUES || []).find(x => x.id === String(venueId || ''));
    if (!v) return err('That door is dark tonight.');
    if (now() - L.nightAt < 20 * MIN) return err('The night is still ringing. Wait ' + M.ceil((L.nightAt + 20 * MIN - now()) / MIN) + ' min.');
    if ((p.money || 0) < v.cover) return err('Cover is $' + v.cover + '.');
    if ((p.energy || 0) < 4) return err('Too tired to go out.');
    p.money -= v.cover;
    p.energy -= 4;
    applyEffect(p, v.effect);
    L.nightAt = now();
    addHeat(p, 2);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { venue: v.name, text: `${v.icon} ${v.name}: ${v.desc}` } };
  }

  function adoptPet(accId, petId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const pet = (C.PETS || []).find(x => x.id === String(petId || ''));
    if (!pet) return err('That animal is gone.');
    if (L.pets.includes(pet.id)) return err('You already keep ' + pet.name + '.');
    if (L.pets.length >= 4) return err('Four is a menagerie. Rehome one first.');
    if ((p.money || 0) < pet.price) return err('Not enough cash.');
    p.money -= pet.price;
    L.pets.push(pet.id);
    applyEffect(p, { happy: (pet.buff && pet.buff.happy) || 6 });
    try { W.unlock(p, 'friend_of_all'); } catch (_) {}
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { pet: pet.name, text: `${pet.icon} ${pet.name} is yours. ${pet.desc}` } };
  }

  function rehomePet(accId, petId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const id = String(petId || '');
    const i = L.pets.indexOf(id);
    if (i < 0) return err('You do not keep that one.');
    const pet = (C.PETS || []).find(x => x.id === id);
    L.pets.splice(i, 1);
    const refund = M.floor(((pet && pet.price) || 0) * 0.35);
    p.money += refund;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `${(pet && pet.name) || 'Pet'} finds another stoop. $${refund.toLocaleString()} back.` } };
  }

  function getInk(accId, tatId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const tat = (C.TATTOOS || []).find(x => x.id === String(tatId || ''));
    if (!tat) return err('The artist packed up.');
    if (L.ink.includes(tat.id)) return err('That piece is already on you.');
    if ((p.money || 0) < tat.price) return err('Ink costs $' + tat.price + '.');
    if ((p.life || 0) < 8) return err('Too sore for a sitting.');
    p.money -= tat.price;
    p.life = M.max(1, p.life - 4);
    p.happy = M.min(p.max_happy || 100, (p.happy || 0) + 8);
    p.reputation = (p.reputation || 0) + 2;
    L.ink.push(tat.id);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { tat: tat.name, text: `${tat.icon} ${tat.name} on the ${tat.slot}. ${tat.desc}` } };
  }

  function meetContact(accId, cid) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const c = (C.CONTACTS || []).find(x => x.id === String(cid || ''));
    if (!c) return err('Nobody by that name.');
    const lvl = (p.level || 1);
    if (c.lvl && lvl < c.lvl) return err(`${c.name} will not take your call until level ${c.lvl}.`);
    if (L.contacts.includes(c.id)) return err('You already have their number.');
    const cost = 400 + (c.lvl || 1) * 180;
    if ((p.money || 0) < cost) return err('Introductions cost $' + cost + '.');
    p.money -= cost;
    L.contacts.push(c.id);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `${c.icon || '📡'} ${c.name} (${c.role || 'Contact'}) is in your book. ${c.desc}` } };
  }

  function callContact(accId, cid) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const id = String(cid || '');
    if (!L.contacts.includes(id)) return err('You do not have that number.');
    if (now() - L.callAt < 15 * MIN) return err('Lines are hot. Wait ' + M.ceil((L.callAt + 15 * MIN - now()) / MIN) + ' min.');
    const c = (C.CONTACTS || []).find(x => x.id === id);
    L.callAt = now();
    const roll = M.random();
    let text, pay = 0;
    if (roll < 0.35) {
      pay = 800 + rnd(2200);
      p.money += pay;
      text = `${c.name} slides you $${pay.toLocaleString()} for a quiet errand.`;
    } else if (roll < 0.7) {
      p.energy = M.min(p.max_energy || 100, (p.energy || 0) + 8);
      text = `${c.name} tips a route. You feel the city open. +8 energy.`;
    } else {
      addHeat(p, 6);
      p.nerve = M.max(0, (p.nerve || 0) - 1);
      text = `${c.name} goes quiet. Heat ticks up.`;
    }
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { pay, text } };
  }

  function buyHideout(accId, hid) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const h = (C.HIDEOUTS || []).find(x => x.id === String(hid || ''));
    if (!h) return err('That unit is gone.');
    if (L.hideout === h.id) return err('You already hold that hide.');
    if ((p.money || 0) < h.price) return err('Need $' + h.price.toLocaleString() + '.');
    p.money -= h.price;
    L.hideout = h.id;
    p.happy = M.min(p.max_happy || 100, (p.happy || 0) + (h.happy || 0) / 4);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `${h.name} is yours. Vault room $${(h.vault || 0).toLocaleString()}. ${h.desc}` } };
  }

  function restHideout(accId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    if (!L.hideout) return err('You do not hold a hide.');
    const h = (C.HIDEOUTS || []).find(x => x.id === L.hideout);
    if (now() - (L.restAt || 0) < 30 * MIN) return err('You just crashed. Wait ' + M.ceil(((L.restAt || 0) + 30 * MIN - now()) / MIN) + ' min.');
    L.restAt = now();
    p.energy = M.min(p.max_energy || 100, (p.energy || 0) + 18);
    p.life = M.min(p.max_life || 200, (p.life || 0) + 20);
    L.heat = M.max(0, L.heat - 12);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `You crash at ${h ? h.name : 'the hide'}. Energy up, heat down.` } };
  }

  function openCrate(accId, crateId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const cr = (C.LOOT_CRATES || []).find(x => x.id === String(crateId || ''));
    if (!cr) return err('No such crate.');
    if ((p.money || 0) < cr.price) return err('Need $' + cr.price.toLocaleString() + '.');
    p.money -= cr.price;
    p.items = p.items || {};
    const pool = (cr.pool || []).filter(id => C.ITEMS[id]);
    if (!pool.length) return err('That crate is empty on this build.');
    const itemId = pick(pool);
    p.items[itemId] = (p.items[itemId] || 0) + 1;
    W.save(accId, p);
    const nm = (C.ITEMS[itemId] || {}).name || itemId;
    return { ok: true, p: W.publicView(p), res: { itemId, text: `${cr.name} pops: ${nm}.` } };
  }

  function buySkin(accId, skinId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const sk = (C.WEAPON_SKINS || []).find(x => x.id === String(skinId || ''));
    if (!sk) return err('Finish not in the book.');
    if (L.skins.includes(sk.id)) return err('You already own that finish.');
    if ((p.money || 0) < sk.price) return err('Need $' + sk.price.toLocaleString() + '.');
    p.money -= sk.price;
    L.skins.push(sk.id);
    L.skinOn = sk.id;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `${sk.icon} ${sk.name} fitted. ${sk.desc}` } };
  }

  function wearSkin(accId, skinId) {
    const p = W.ready(W.load(accId)); const L = ensure(p);
    const id = String(skinId || '');
    if (id && !L.skins.includes(id)) return err('You do not own that finish.');
    L.skinOn = id || null;
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: id ? 'Finish equipped.' : 'Finish stripped.' } };
  }

  function fitMod(accId, idx, modId) {
    const p = W.ready(W.load(accId)); const s = sys(p); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const i = parseInt(idx, 10);
    const car = s.cars && s.cars[i];
    if (!car) return err('No car in that bay.');
    const mod = (C.VEHICLE_MODS || []).find(x => x.id === String(modId || ''));
    if (!mod) return err('No such kit.');
    car.mods = car.mods || [];
    if (car.mods.includes(mod.id)) return err('Already fitted.');
    if (car.mods.length >= 6) return err('The bay is full — six kits max.');
    if ((p.money || 0) < mod.price) return err('Need $' + mod.price.toLocaleString() + '.');
    p.money -= mod.price;
    car.mods.push(mod.id);
    if (mod.buff) {
      if (mod.buff.spd) car.spd = (car.spd || 0) + mod.buff.spd;
      if (mod.buff.grp) car.grp = (car.grp || 0) + mod.buff.grp;
    }
    applyEffect(p, { happy: (mod.buff && mod.buff.happy) || 0 });
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `${mod.icon} ${mod.name} bolted onto the ${car.id}.` } };
  }

  function claimStreak(accId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    tickStreak(p);
    if (L.streak.claimed) return err('Today’s drop is already in your pocket.');
    L.streak.n = (L.streak.n || 0) + 1;
    L.streak.claimed = true;
    L.streak.day = dayNum();
    const slot = ((L.streak.n - 1) % 7);
    const bonus = (C.DAILY_BONUSES || [])[slot] || { cash: 800, desc: 'A thin envelope.' };
    p.money += bonus.cash || 0;
    if (bonus.item && C.ITEMS[bonus.item]) {
      p.items = p.items || {};
      p.items[bonus.item] = (p.items[bonus.item] || 0) + 1;
    }
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { streak: L.streak.n, text: `${bonus.desc} +$${(bonus.cash || 0).toLocaleString()}.` } };
  }

  function coolHeat(accId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const cost = 2500 + L.heat * 40;
    if ((p.money || 0) < cost) return err('A quiet word costs $' + cost.toLocaleString() + '.');
    p.money -= cost;
    L.heat = M.max(0, L.heat - 25);
    W.save(accId, p);
    return { ok: true, p: W.publicView(p), res: { text: `Cash talks. Heat now ${L.heat}.` } };
  }

  function quickSnack(accId) {
    const p = W.ready(W.load(accId)); const L = ensure(p); const lock = locked(p); if (lock) return lock;
    const foods = (C.STREET_FOOD || []).slice().sort((a, b) => a.price - b.price);
    const cheap = foods[0];
    if (!cheap) return err('No stalls open.');
    return eatFood(accId, cheap.id);
  }

  function panel(p) {
    const L = ensure(p);
    const hide = (C.HIDEOUTS || []).find(x => x.id === L.hideout) || null;
    return {
      heat: L.heat,
      pets: L.pets.map(id => (C.PETS || []).find(x => x.id === id)).filter(Boolean),
      ink: L.ink.map(id => (C.TATTOOS || []).find(x => x.id === id)).filter(Boolean),
      contacts: L.contacts.map(id => (C.CONTACTS || []).find(x => x.id === id)).filter(Boolean),
      skins: L.skins,
      skinOn: L.skinOn || null,
      hideout: hide,
      streak: { n: L.streak.n || 0, claimed: !!L.streak.claimed, next: (C.DAILY_BONUSES || [])[((L.streak.n || 0) % 7)] },
      foodReady: now() - L.foodAt >= 8 * MIN,
      nightReady: now() - L.nightAt >= 20 * MIN,
      callReady: now() - L.callAt >= 15 * MIN,
      restReady: now() - (L.restAt || 0) >= 30 * MIN,
      catalogs: {
        food: C.STREET_FOOD || [],
        venues: C.NIGHTLIFE_VENUES || [],
        pets: C.PETS || [],
        tats: C.TATTOOS || [],
        contacts: C.CONTACTS || [],
        hideouts: C.HIDEOUTS || [],
        crates: C.LOOT_CRATES || [],
        skins: C.WEAPON_SKINS || [],
        mods: C.VEHICLE_MODS || []
      },
      buffs: petBuffs(p)
    };
  }

  return {
    ensure, addHeat, petBuffs, panel,
    eatFood, goOut, adoptPet, rehomePet, getInk, meetContact, callContact,
    buyHideout, restHideout, openCrate, buySkin, wearSkin, fitMod, claimStreak, coolHeat, quickSnack
  };
};
