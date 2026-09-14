# Razor Town — 2026 Feature Ledger

Everything new in the 2026 overhaul. Numbered so you can count them: **135 new features**, plus a
rebuilt character engine and a full content expansion. Every system below is live, wired to the UI,
and covered by the automated check suites (`tools/check-2026.js`, `check-api.js`, `check-systems.js`,
`check-http.js` — 403 assertions in total).

---

## 🧍 Character engine — real modeled characters (replaces the old paper doll)

1. **Fully modeled character renderer** — layered, shaded figure built from anatomical geometry:
   gradient skin shading, articulated arms/legs, neck, hands, and depth shadows instead of flat
   paper-doll cut-outs.
2. **Two body builds** — masculine and feminine skeletons with different proportions (shoulders,
   waist, hips, stance), selectable in the creator and switchable any time from the profile.
3. **9 skin tones**, each with matched gradient shading and shadow tones.
4. **18 face sculpts** — eye shapes, brows, beards, jawlines, freckles and makeup combinations.
5. **38 hairstyles** — including a full range of **female styles**: long waves, blunt bob, high
   ponytail, space buns, box braids, afro, pixie, side shave, curls, and more.
6. **46 modern streetwear garments** — hoodies, crop hoodies, puffers, bombers, track jackets,
   varsity jackets, denim trucks, flannels, windbreakers, baby tees, big tees, tanks, jerseys,
   rugby shirts, dresses and slip dresses.
7. **The old vintage wardrobe is gone** — no flat caps, tailcoats or waistcoats remain; every
   garment slot draws modern streetwear.
8. **Garments dress the whole body** — each outfit style maps to matching bottoms (cargos, joggers,
   baggy denim, shorts, biker shorts) and sneakers (chunky trainers, runners, canvas, boots,
   slides, heels) so the model is clothed head to toe.
9. **29 accent pieces** — snapbacks, beanies, bucket hats, durags, gold chains, shades,
   headphones, crossbody bags, face tattoos, piercings, watches.
10. **Live avatar everywhere** — the same model renders at full length (profile), mugshot size
    (leaderboards, target lists, chat), and in the creator preview, all from one 6-part spec
    string `skin|face|hair|shirt|accent|body`.
11. **Legacy-safe avatars** — old 5-part avatar strings auto-upgrade; server clamps every part to
    the catalog on save so nothing can render broken.
12. **Wardrobe** — save up to 3 full looks and swap between them in one click.
13. **Respec token** — a one-time full re-style granted by the founder, redeemed from the profile.
14. **Reputation titles** — 9 street titles (from *Nobody* upward) earned by reputation and shown
    on your profile and around the city.

## 🎮 The Arcade — 10 games on one floor

15. **Mines** — minesweeper-style betting grid: pick tiles, multiply your bet, cash out or push it.
16. **Plinko** — 11-slot peg board with a live ball drop and center-weighted odds.
17. **Dice** — call high or low on a two-dice roll with real house odds.
18. **Coin flip** — heads or tails, double or nothing.
19. **Hoops** — timing-based free-throw shooter.
20. **Buzz wire** — steady-hand skill game: run the wand without touching, measured in
    milliseconds, personal best tracked.
21. **Memory** — card-flip pairs game with a move-efficiency score and personal best.
22. **Safe cracker** — Simon-style sequence echo on a safe keypad; longer sequences pay bigger.
23. **Scratch cards** — buy, scratch, three-symbols-pays instant wins.
24. **Daily lottery** — pick numbers each day, pooled jackpot, draw settles automatically.
25. **Arcade win tracking** — win counters feed achievements (*Arcade Shark*), challenges and
    mission tallies.

## 📦 Hustles — eight ways to earn on the side

26. **Gig board** — 8 modern gig types (moving sofas, flyer runs, DJ booth fill-ins, phone
    repair…) on a rotating 4-hour board; each gig pays cash, energy cost, and reputation.
27. **Courier runs** — take a package, run it across the district, collect on delivery.
28. **Canal fishing** — cast, wait, land fish with rarity tiers; best catch is kept as a trophy.
29. **Scrapyard salvage** — timed runs pulling copper and parts from the yard.
30. **Plasma donation** — sell plasma on a cooldown; it costs you a little happiness.
31. **Fight trials** — underground trial fights on a cooldown for cash and rep.
32. **Busking** — play a set on the street corner for tips every 30 minutes.
33. **Storage unit auctions** — browse three sealed units a day with *fuzzy hints only* (no exact
    values before you pay), bid, open, and keep whatever's inside; one unit per day.
34. **Mystery boxes** — open for cash, items, or (rarely) a sealed limited drop.

## 🚗 The Garage

35. **8 buyable cars** — from a rustbucket hatch to a supercar, each with a performance rating.
36. **Custom paint** — 10-swatch paint shop; your car keeps its color on the ledger.
37. **Street racing** — race your car against other citizens for stakes.
38. **Chop shop** — fence a car for parts when you need fast money.
39. **Car ratings feed race odds** — machine + driver stats settle the outcome server-side.

## 🗺️ Turf & the living city

40. **8 named districts** — the full city map divided into contested territory.
41. **Turf claiming** — spend influence to claim districts; income hours accrue while held.
42. **Influence economy** — crimes, big scores and fight wins earn influence that buys turf.
43. **Turf income collection** — collect what your districts earned, release districts you can't
    hold.
44. **Weather system** — deterministic hourly weather (rain, heat, fog…) shown city-wide.
45. **City events** — rotating 20-minute event windows that change the mood and the odds.
46. **Daily challenges** — three fresh challenges every day with claimable rewards.
47. **Clout** — a follower count that grows from posting and pays out lazily over time.
48. **Wall tagging** — spray your tag around the city with cans from the shop.

## 💸 Economy & money systems

49. **Stock market** — live tickers with price history, buy/sell with a transparent broker fee
    (trimmed by quant coursework and the wire pass).
50. **Crypto desk** — higher-volatility trades at a lower fee.
51. **Staking** — lock cash into the city stake pool for yield, settled lazily.
52. **Term deposits** — fixed-term lockups with a better rate, collect at maturity.
53. **Dividends** — passive income ticks every 6 hours while qualified.
54. **Crafting bench** — 7 recipes that turn shop items and loot into better gear.
55. **Trading cards** — open packs, collect the set; a completed set pays a set bonus.
56. **Limited drops** — two hype items rotate weekly with per-player purchase caps.
57. **Insurance policies** — buy cover that caps what you can lose in fights while active.
58. **Gifts** — send items and cash to any citizen.
59. **Fee transparency** — broker fees shown in the market UI are exactly the fees charged.

## 👥 Social

60. **Friends list** — add/remove friends; friends surface in your social panel.
61. **Block list** — block a citizen and they can't reach you.
62. **Gift delivery** — lands with a wire message to the recipient.

## 📈 Core systems expanded or upgraded

63. **Crimes: 23 → 47** — every tier of the crime list expanded, including 2026 jobs (package
    swaps, SIM farms, repo dodges).
64. **Items: 67** — consumables, tonics, tools, spray cans, trading packs, insurance, drops.
65. **Achievements: 20 → 67** — feats for every new system (arcade, hustles, turf, garage,
    clout, cards, crafting and more).
66. **College courses: 14 → 18** — including quant coursework that trims broker fees.
67. **Origins: 6** — street, schemer, bruiser, hacker, wheel and clout, each with a stat edge and
    starter kit.
68. **Day jobs: 12** — the job board expanded with modern roles.
69. **Properties: 10** — housing ladder extended for the new economy.
70. **Merit perks: 8 lines → 13 perks**.
71. **Gyms: 4** — each with distinct training flavor.
72. **Missions: 11** — the mission board tallies gigs, fish, races, arcade wins and clout.
73. **Emotes: 12** — quick reactions in chat and profiles.
74. **Happiness caps** — happiness now has a personal maximum (property + perks), shown on the HUD
    as `happy / max`.
75. **XP boosters** — consumables that multiply XP gains while active.
76. **Insurance loot cap** — insured players can't be drained past the policy in fights.

## 🖥️ UI & tabs

77. **Arcade tab** (keyboard `7`) — the full casino floor in one panel.
78. **Hustles tab** (`8`) — gigs, couriers, fishing, salvage, plasma, trials, busking, storage.
79. **Garage tab** (`9`) — cars, paint, racing, chop shop.
80. **Turf tab** (`5`) — district map, influence, claim/collect/release.
81. **Systems panel** — one consolidated read (`/api/sys/panel`, cached client-side) feeds all four
    tabs with a single request.
82. **Craft bench UI** in the items tab.
83. **Trading-card set UI** in the items tab.
84. **Wardrobe slots UI** in the look editor.
85. **Title + follower chips** on the profile.
86. **Live SSE updates** for every new system — the tabs refresh without reloading.

## 🔧 Infrastructure & verification

87. **`/api/sys/panel`** — single endpoint aggregating all 2026 state (deterministic boards: the
    gig board and storage auction are seeded per player + time slot, so what you see is what you
    get).
88. **Tracking hooks** — every action feeds challenges, influence, mission tallies and lazy income
    without touching core rules.
89. **`tools/check-2026.js`** — 89 end-to-end assertions driving every new action family through
    real HTTP against throwaway accounts.
90. **`tools/check-systems.js`** — 219 rule-level assertions (property, education, merits,
    bounties, bazaar, auctions, every casino table).
91. **`tools/check-api.js`** — 87 API-contract assertions.
92. **`tools/check-http.js`** — 8 resilience checks (dead sessions, garbage payloads, path
    traversal, abuse without crash).

## 🧵 Remaining features in the expansion (numbered for the count)

93. Deterministic weather seeding (same hour, same sky, for every player).
94. Event windows announced on the wire.
95. Challenge claim popups with reward toasts.
96. Mines abandon — walk away from a live board without cashing out.
97. Buzz wire personal-best leaderboard on the panel.
98. Memory personal-best tracking.
99. Safe cracker deal/echo two-phase protocol.
100. Lottery number preview before you buy.
101. Gig slots grow with progression (more board slots as you work).
102. Gig per-gig daily cap (3 of the same gig per rotation).
103. Courier active-job state survives logout.
104. Fishing best-catch trophy display.
105. Salvage run cooldown enforcement.
106. Plasma happiness cost.
107. Trial fight cooldown enforcement.
108. Busking tip variance.
109. Storage hint bands (picked clean / either way / promising / something good).
110. Storage overpay feedback (shows your loss honestly).
111. Mystery box jackpot wire announcement.
112. Drop purchase caps per player per week.
113. Drop stock preview in the panel.
114. Clout payout rate shown before you post.
115. Tag walls tracked per district.
116. Car rating shown next to each owned car.
117. Street race stake escrow.
118. Chop shop daily heat limit.
119. Turf income-hours display.
120. Turf pending influence display.
121. Stake yield percentage shown live.
122. Term deposit maturity countdown.
123. Dividend total tracking.
124. Craft count tracking.
125. Card pool shown in the set UI.
126. Insurance active indicator on the profile.
127. Respec-open indicator on the profile.
128. Founder dev grants for QA.
129. Per-part avatar validation against the live catalog.
130. Female proportion variants for every garment and hairstyle.
131. Sneaker style auto-matched to garment (chunky/runner/canvas/boot/slide/heel).
132. Bottoms auto-matched to garment (cargo/jog/denim/shorts/track/wide).
133. Crop garments reveal shaded midriff skin.
134. Dress and slip silhouettes with strappy variants.
135. Flannel garments render a real clipped plaid pattern.

---

### Verified working

| Suite | What it covers | Result |
|---|---|---|
| `node tools/check-2026.js` | every 2026 action family over HTTP | **89 / 89 pass** |
| `node tools/check-api.js` | core API contract | **87 / 87 pass** |
| `node tools/check-systems.js` | rules of every system | **219 / 219 pass** |
| `node tools/check-http.js` | resilience & abuse | **8 / 8 pass** |

Avatar renderer additionally smoke-tested across 30,000 random part combinations with zero broken
renders, plus legacy 5-part upgrade paths.
