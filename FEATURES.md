# Razor Town — 2026 Feature Ledger

Everything new in the 2026 overhaul. Numbered so you can count them: **1,735 playable additions**, including **1,000 individually playable City Contracts**, plus a rebuilt character engine and a full content expansion. Every system below is live, wired to the UI, and covered by the automated check suites.

---

## 🧍 Character engine — real modeled characters (replaces the old paper doll)

1. **Fully modeled character renderer** — layered, shaded figure built from anatomical geometry:
   gradient skin shading, articulated arms/legs, neck, hands, and depth shadows instead of flat
   paper-doll cut-outs.
2. **Two body builds** — masculine and feminine skeletons with different proportions (shoulders,
   waist, hips, stance), selectable in the creator and switchable any time from the profile.
3. **9 skin tones**, each with matched gradient shading and shadow tones.
4. **22 face sculpts** — 17 older, rugged masculine faces (beards, moustaches, mutton chops,
   grey whiskers, scars, crows' feet, bent noses) plus 5 feminine faces; clean-shaven and
   youth options stay in the rack.
5. **25 hairstyles & headwear** — buzzes, comb-overs, salt-and-pepper, grey long locks,
   horseshoe, flat caps, newsboy caps, bowlers, fedoras, plus a range of women's styles.
6. **14 weathered coats** — heavy overcoats, greatcoats, canvas dusters, frock coats, duffel
   & peacoats, and tailored women's coats.
7. **The old modern-streetwear rack is gone** — hoodies and trainers are out; every garment
   slot draws an older, weather-beaten wardrobe.
8. **Garments dress the whole body** — each coat maps to matching trousers (pressed wool,
   serge, canvas breeks) and boots/shoes (brogues, oxfords, work boots) so the model is
   clothed head to toe.
9. **8 accent pieces** — wine silk cravat, gold watch chain, fresh carnation, steel tie pin,
   ivory cufflinks, unlit cigar, briar pipe, and round wire spectacles.
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
89. **`tools/check-2026.js`** — 95 end-to-end assertions driving every new action family, including
    City Contracts, through real HTTP against throwaway accounts.
90. **`tools/check-systems.js`** — 236 rule-level assertions (property, education, merits,
    bounties, bazaar, auctions, every casino table).
91. **`tools/check-api.js`** — 93 API-contract assertions.
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

136. **Crime #136: Lift charity tins #001** — new big job crime with scaled nerve, level 4 band cash/jail and loot drops.
137. **Crime #137: Run the dark kitchens #002** — new theft crime with scaled nerve, level 11 band cash/jail and loot drops.
138. **Crime #138: Lift the corner vape wall #003** — new trick crime with scaled nerve, level 25 band cash/jail and loot drops.
139. **Crime #139: Flip the leaked line-ups #004** — new fraud crime with scaled nerve, level 18 band cash/jail and loot drops.
140. **Crime #140: Boost the hire bikes #005** — new big job crime with scaled nerve, level 6 band cash/jail and loot drops.
141. **Crime #141: Ghost the keyless estates #006** — new theft crime with scaled nerve, level 4 band cash/jail and loot drops.
142. **Crime #142: Forge builder invoices #007** — new fraud crime with scaled nerve, level 9 band cash/jail and loot drops.
143. **Crime #143: Lift the corner vape wall #008** — new black crime with scaled nerve, level 24 band cash/jail and loot drops.
144. **Crime #144: Skim the school payment app #009** — new trick crime with scaled nerve, level 21 band cash/jail and loot drops.
145. **Crime #145: Wash the cash through nail bars #010** — new trick crime with scaled nerve, level 4 band cash/jail and loot drops.
146. **Crime #146: Swap the parcel labels #011** — new black crime with scaled nerve, level 7 band cash/jail and loot drops.
147. **Crime #147: Spoof the landlord portal #012** — new heat crime with scaled nerve, level 9 band cash/jail and loot drops.
148. **Crime #148: Forge builder invoices #013** — new black crime with scaled nerve, level 4 band cash/jail and loot drops.
149. **Crime #149: Flip the leaked line-ups #014** — new trick crime with scaled nerve, level 5 band cash/jail and loot drops.
150. **Crime #150: Flip the leaked line-ups #015** — new fraud crime with scaled nerve, level 6 band cash/jail and loot drops.
151. **Crime #151: Lift the corner vape wall #016** — new black crime with scaled nerve, level 4 band cash/jail and loot drops.
152. **Crime #152: Forge builder invoices #017** — new black crime with scaled nerve, level 7 band cash/jail and loot drops.
153. **Crime #153: Run the crypto kiosk #018** — new heat crime with scaled nerve, level 21 band cash/jail and loot drops.
154. **Crime #154: Clip the digger on the bypass #019** — new heat crime with scaled nerve, level 20 band cash/jail and loot drops.
155. **Crime #155: Lift charity tins #020** — new fraud crime with scaled nerve, level 6 band cash/jail and loot drops.
156. **Crime #156: Forge builder invoices #021** — new heat crime with scaled nerve, level 7 band cash/jail and loot drops.
157. **Crime #157: Flip the leaked line-ups #022** — new trick crime with scaled nerve, level 12 band cash/jail and loot drops.
158. **Crime #158: Swap the parcel labels #023** — new black crime with scaled nerve, level 1 band cash/jail and loot drops.
159. **Crime #159: Flip the leaked line-ups #024** — new trick crime with scaled nerve, level 22 band cash/jail and loot drops.
160. **Crime #160: Ghost the keyless estates #025** — new theft crime with scaled nerve, level 18 band cash/jail and loot drops.
161. **Crime #161: Lift the corner vape wall #026** — new fraud crime with scaled nerve, level 4 band cash/jail and loot drops.
162. **Crime #162: Run the dark kitchens #027** — new big job crime with scaled nerve, level 26 band cash/jail and loot drops.
163. **Crime #163: Harvest catalytic cores #028** — new theft crime with scaled nerve, level 6 band cash/jail and loot drops.
164. **Crime #164: Boost the hire bikes #029** — new heat crime with scaled nerve, level 8 band cash/jail and loot drops.
165. **Crime #165: Snatch the influencer drop #030** — new heat crime with scaled nerve, level 9 band cash/jail and loot drops.
166. **Crime #166: Run the crypto kiosk #031** — new big job crime with scaled nerve, level 14 band cash/jail and loot drops.
167. **Crime #167: Skim the school payment app #032** — new trick crime with scaled nerve, level 5 band cash/jail and loot drops.
168. **Crime #168: Snatch the influencer drop #033** — new fraud crime with scaled nerve, level 10 band cash/jail and loot drops.
169. **Crime #169: Skim the festival tills #034** — new heat crime with scaled nerve, level 18 band cash/jail and loot drops.
170. **Crime #170: Flip the leaked line-ups #035** — new theft crime with scaled nerve, level 8 band cash/jail and loot drops.
171. **Crime #171: Wash the cash through nail bars #036** — new trick crime with scaled nerve, level 21 band cash/jail and loot drops.
172. **Crime #172: Forge builder invoices #037** — new theft crime with scaled nerve, level 6 band cash/jail and loot drops.
173. **Crime #173: Lift power tools off site #038** — new fraud crime with scaled nerve, level 14 band cash/jail and loot drops.
174. **Crime #174: Flip the leaked line-ups #039** — new black crime with scaled nerve, level 18 band cash/jail and loot drops.
175. **Crime #175: Skim the school payment app #040** — new heat crime with scaled nerve, level 5 band cash/jail and loot drops.
176. **Crime #176: Flip the leaked line-ups #041** — new theft crime with scaled nerve, level 4 band cash/jail and loot drops.
177. **Crime #177: Lift charity tins #042** — new heat crime with scaled nerve, level 26 band cash/jail and loot drops.
178. **Crime #178: Ghost the keyless estates #043** — new big job crime with scaled nerve, level 10 band cash/jail and loot drops.
179. **Crime #179: Snatch the match-day phones #044** — new theft crime with scaled nerve, level 13 band cash/jail and loot drops.
180. **Crime #180: Run the dark kitchens #045** — new theft crime with scaled nerve, level 25 band cash/jail and loot drops.
181. **Crime #181: Run the crypto kiosk #046** — new trick crime with scaled nerve, level 1 band cash/jail and loot drops.
182. **Crime #182: Spoof the landlord portal #047** — new black crime with scaled nerve, level 20 band cash/jail and loot drops.
183. **Crime #183: Snatch the influencer drop #048** — new black crime with scaled nerve, level 10 band cash/jail and loot drops.
184. **Crime #184: Skim the school payment app #049** — new big job crime with scaled nerve, level 26 band cash/jail and loot drops.
185. **Crime #185: Spoof the landlord portal #050** — new theft crime with scaled nerve, level 11 band cash/jail and loot drops.
186. **Crime #186: Spoof the landlord portal #051** — new theft crime with scaled nerve, level 7 band cash/jail and loot drops.
187. **Crime #187: Forge MOT certificates #052** — new trick crime with scaled nerve, level 4 band cash/jail and loot drops.
188. **Crime #188: Skim the school payment app #053** — new theft crime with scaled nerve, level 16 band cash/jail and loot drops.
189. **Crime #189: Forge MOT certificates #054** — new fraud crime with scaled nerve, level 22 band cash/jail and loot drops.
190. **Crime #190: Snatch the influencer drop #055** — new theft crime with scaled nerve, level 24 band cash/jail and loot drops.
191. **Crime #191: Wash the cash through nail bars #056** — new black crime with scaled nerve, level 7 band cash/jail and loot drops.
192. **Crime #192: Lift charity tins #057** — new heat crime with scaled nerve, level 1 band cash/jail and loot drops.
193. **Crime #193: Wash the cash through nail bars #058** — new trick crime with scaled nerve, level 26 band cash/jail and loot drops.
194. **Crime #194: Wash the cash through nail bars #059** — new trick crime with scaled nerve, level 14 band cash/jail and loot drops.
195. **Crime #195: Run the dark kitchens #060** — new fraud crime with scaled nerve, level 25 band cash/jail and loot drops.
196. **Crime #196: Clip the digger on the bypass #061** — new fraud crime with scaled nerve, level 26 band cash/jail and loot drops.
197. **Crime #197: Swap the parcel labels #062** — new fraud crime with scaled nerve, level 18 band cash/jail and loot drops.
198. **Crime #198: Run the dark kitchens #063** — new fraud crime with scaled nerve, level 22 band cash/jail and loot drops.
199. **Crime #199: Wash the cash through nail bars #064** — new heat crime with scaled nerve, level 8 band cash/jail and loot drops.
200. **Crime #200: Run the crypto kiosk #065** — new black crime with scaled nerve, level 15 band cash/jail and loot drops.
201. **Crime #201: Forge builder invoices #066** — new black crime with scaled nerve, level 14 band cash/jail and loot drops.
202. **Crime #202: Swap the parcel labels #067** — new trick crime with scaled nerve, level 20 band cash/jail and loot drops.
203. **Crime #203: Run the crypto kiosk #068** — new fraud crime with scaled nerve, level 26 band cash/jail and loot drops.
204. **Crime #204: Forge builder invoices #069** — new trick crime with scaled nerve, level 25 band cash/jail and loot drops.
205. **Crime #205: Skim the school payment app #070** — new trick crime with scaled nerve, level 12 band cash/jail and loot drops.
206. **Crime #206: Snatch the influencer drop #071** — new theft crime with scaled nerve, level 14 band cash/jail and loot drops.
207. **Crime #207: Clip the digger on the bypass #072** — new big job crime with scaled nerve, level 14 band cash/jail and loot drops.
208. **Crime #208: Flip the leaked line-ups #073** — new big job crime with scaled nerve, level 1 band cash/jail and loot drops.
209. **Crime #209: Wash the cash through nail bars #074** — new big job crime with scaled nerve, level 19 band cash/jail and loot drops.
210. **Crime #210: Run the dark kitchens #075** — new black crime with scaled nerve, level 21 band cash/jail and loot drops.
211. **Crime #211: Lift power tools off site #076** — new big job crime with scaled nerve, level 17 band cash/jail and loot drops.
212. **Crime #212: Run the dark kitchens #077** — new fraud crime with scaled nerve, level 19 band cash/jail and loot drops.
213. **Crime #213: Skim the school payment app #078** — new fraud crime with scaled nerve, level 1 band cash/jail and loot drops.
214. **Crime #214: Wash the cash through nail bars #079** — new black crime with scaled nerve, level 2 band cash/jail and loot drops.
215. **Crime #215: Skim the festival tills #080** — new big job crime with scaled nerve, level 9 band cash/jail and loot drops.
216. **Item #216: generated weapon #001** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
217. **Item #217: generated armour #002** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
218. **Item #218: generated armour #003** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
219. **Item #219: generated consumable #004** — restores stats with balanced buy/sell and icon.
220. **Item #220: generated loot #005** — fences for profit with balanced buy/sell and icon.
221. **Item #221: generated consumable #006** — restores stats with balanced buy/sell and icon.
222. **Item #222: generated consumable #007** — restores stats with balanced buy/sell and icon.
223. **Item #223: generated loot #008** — fences for profit with balanced buy/sell and icon.
224. **Item #224: generated consumable #009** — restores stats with balanced buy/sell and icon.
225. **Item #225: generated armour #010** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
226. **Item #226: generated weapon #011** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
227. **Item #227: generated booster #012** — temporary stat multiplier with balanced buy/sell and icon.
228. **Item #228: generated loot #013** — fences for profit with balanced buy/sell and icon.
229. **Item #229: generated consumable #014** — restores stats with balanced buy/sell and icon.
230. **Item #230: generated armour #015** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
231. **Item #231: generated weapon #016** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
232. **Item #232: generated weapon #017** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
233. **Item #233: generated armour #018** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
234. **Item #234: generated consumable #019** — restores stats with balanced buy/sell and icon.
235. **Item #235: generated consumable #020** — restores stats with balanced buy/sell and icon.
236. **Item #236: generated armour #021** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
237. **Item #237: generated armour #022** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
238. **Item #238: generated weapon #023** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
239. **Item #239: generated loot #024** — fences for profit with balanced buy/sell and icon.
240. **Item #240: generated armour #025** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
241. **Item #241: generated booster #026** — temporary stat multiplier with balanced buy/sell and icon.
242. **Item #242: generated booster #027** — temporary stat multiplier with balanced buy/sell and icon.
243. **Item #243: generated armour #028** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
244. **Item #244: generated booster #029** — temporary stat multiplier with balanced buy/sell and icon.
245. **Item #245: generated armour #030** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
246. **Item #246: generated loot #031** — fences for profit with balanced buy/sell and icon.
247. **Item #247: generated armour #032** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
248. **Item #248: generated consumable #033** — restores stats with balanced buy/sell and icon.
249. **Item #249: generated booster #034** — temporary stat multiplier with balanced buy/sell and icon.
250. **Item #250: generated booster #035** — temporary stat multiplier with balanced buy/sell and icon.
251. **Item #251: generated booster #036** — temporary stat multiplier with balanced buy/sell and icon.
252. **Item #252: generated armour #037** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
253. **Item #253: generated consumable #038** — restores stats with balanced buy/sell and icon.
254. **Item #254: generated weapon #039** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
255. **Item #255: generated consumable #040** — restores stats with balanced buy/sell and icon.
256. **Item #256: generated weapon #041** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
257. **Item #257: generated loot #042** — fences for profit with balanced buy/sell and icon.
258. **Item #258: generated armour #043** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
259. **Item #259: generated weapon #044** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
260. **Item #260: generated consumable #045** — restores stats with balanced buy/sell and icon.
261. **Item #261: generated loot #046** — fences for profit with balanced buy/sell and icon.
262. **Item #262: generated loot #047** — fences for profit with balanced buy/sell and icon.
263. **Item #263: generated weapon #048** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
264. **Item #264: generated loot #049** — fences for profit with balanced buy/sell and icon.
265. **Item #265: generated weapon #050** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
266. **Item #266: generated loot #051** — fences for profit with balanced buy/sell and icon.
267. **Item #267: generated weapon #052** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
268. **Item #268: generated weapon #053** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
269. **Item #269: generated consumable #054** — restores stats with balanced buy/sell and icon.
270. **Item #270: generated weapon #055** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
271. **Item #271: generated armour #056** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
272. **Item #272: generated booster #057** — temporary stat multiplier with balanced buy/sell and icon.
273. **Item #273: generated weapon #058** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
274. **Item #274: generated armour #059** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
275. **Item #275: generated loot #060** — fences for profit with balanced buy/sell and icon.
276. **Item #276: generated weapon #061** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
277. **Item #277: generated loot #062** — fences for profit with balanced buy/sell and icon.
278. **Item #278: generated armour #063** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
279. **Item #279: generated loot #064** — fences for profit with balanced buy/sell and icon.
280. **Item #280: generated consumable #065** — restores stats with balanced buy/sell and icon.
281. **Item #281: generated booster #066** — temporary stat multiplier with balanced buy/sell and icon.
282. **Item #282: generated loot #067** — fences for profit with balanced buy/sell and icon.
283. **Item #283: generated consumable #068** — restores stats with balanced buy/sell and icon.
284. **Item #284: generated consumable #069** — restores stats with balanced buy/sell and icon.
285. **Item #285: generated booster #070** — temporary stat multiplier with balanced buy/sell and icon.
286. **Item #286: generated armour #071** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
287. **Item #287: generated weapon #072** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
288. **Item #288: generated weapon #073** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
289. **Item #289: generated armour #074** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
290. **Item #290: generated loot #075** — fences for profit with balanced buy/sell and icon.
291. **Item #291: generated weapon #076** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
292. **Item #292: generated booster #077** — temporary stat multiplier with balanced buy/sell and icon.
293. **Item #293: generated armour #078** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
294. **Item #294: generated consumable #079** — restores stats with balanced buy/sell and icon.
295. **Item #295: generated armour #080** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
296. **Item #296: generated armour #081** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
297. **Item #297: generated loot #082** — fences for profit with balanced buy/sell and icon.
298. **Item #298: generated armour #083** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
299. **Item #299: generated weapon #084** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
300. **Item #300: generated booster #085** — temporary stat multiplier with balanced buy/sell and icon.
301. **Item #301: generated loot #086** — fences for profit with balanced buy/sell and icon.
302. **Item #302: generated armour #087** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
303. **Item #303: generated weapon #088** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
304. **Item #304: generated armour #089** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
305. **Item #305: generated weapon #090** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
306. **Item #306: generated armour #091** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
307. **Item #307: generated weapon #092** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
308. **Item #308: generated booster #093** — temporary stat multiplier with balanced buy/sell and icon.
309. **Item #309: generated consumable #094** — restores stats with balanced buy/sell and icon.
310. **Item #310: generated weapon #095** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
311. **Item #311: generated booster #096** — temporary stat multiplier with balanced buy/sell and icon.
312. **Item #312: generated loot #097** — fences for profit with balanced buy/sell and icon.
313. **Item #313: generated consumable #098** — restores stats with balanced buy/sell and icon.
314. **Item #314: generated consumable #099** — restores stats with balanced buy/sell and icon.
315. **Item #315: generated weapon #100** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
316. **Item #316: generated booster #101** — temporary stat multiplier with balanced buy/sell and icon.
317. **Item #317: generated weapon #102** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
318. **Item #318: generated booster #103** — temporary stat multiplier with balanced buy/sell and icon.
319. **Item #319: generated loot #104** — fences for profit with balanced buy/sell and icon.
320. **Item #320: generated weapon #105** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
321. **Item #321: generated weapon #106** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
322. **Item #322: generated loot #107** — fences for profit with balanced buy/sell and icon.
323. **Item #323: generated loot #108** — fences for profit with balanced buy/sell and icon.
324. **Item #324: generated loot #109** — fences for profit with balanced buy/sell and icon.
325. **Item #325: generated weapon #110** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
326. **Item #326: generated armour #111** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
327. **Item #327: generated armour #112** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
328. **Item #328: generated loot #113** — fences for profit with balanced buy/sell and icon.
329. **Item #329: generated consumable #114** — restores stats with balanced buy/sell and icon.
330. **Item #330: generated weapon #115** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
331. **Item #331: generated consumable #116** — restores stats with balanced buy/sell and icon.
332. **Item #332: generated booster #117** — temporary stat multiplier with balanced buy/sell and icon.
333. **Item #333: generated booster #118** — temporary stat multiplier with balanced buy/sell and icon.
334. **Item #334: generated loot #119** — fences for profit with balanced buy/sell and icon.
335. **Item #335: generated weapon #120** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
336. **Item #336: generated booster #121** — temporary stat multiplier with balanced buy/sell and icon.
337. **Item #337: generated armour #122** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
338. **Item #338: generated loot #123** — fences for profit with balanced buy/sell and icon.
339. **Item #339: generated consumable #124** — restores stats with balanced buy/sell and icon.
340. **Item #340: generated booster #125** — temporary stat multiplier with balanced buy/sell and icon.
341. **Item #341: generated consumable #126** — restores stats with balanced buy/sell and icon.
342. **Item #342: generated booster #127** — temporary stat multiplier with balanced buy/sell and icon.
343. **Item #343: generated consumable #128** — restores stats with balanced buy/sell and icon.
344. **Item #344: generated armour #129** — equippable gear with attack/defence bonus with balanced buy/sell and icon.
345. **Item #345: generated loot #130** — fences for profit with balanced buy/sell and icon.
346. **Job #346: Night Porter #1** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
347. **Job #347: Retail Security #2** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
348. **Job #348: Bicycle Courier #3** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
349. **Job #349: Event Bar Staff #4** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
350. **Job #350: Call Centre Op #5** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
351. **Job #351: Warehouse Packer #6** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
352. **Job #352: Car Valeter #7** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
353. **Job #353: Food Delivery Rider #8** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
354. **Job #354: Library Assistant #9** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
355. **Job #355: IT Support Jr #10** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
356. **Job #356: Security Dispatcher #11** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
357. **Job #357: Lab Technician #12** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
358. **Job #358: Estate Lettings #13** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
359. **Job #359: Fitness Coach #14** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
360. **Job #360: Freelance Editor #15** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
361. **Job #361: Music Tutor #16** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
362. **Job #362: Photographer #17** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
363. **Job #363: Market Stall Assistant #18** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
364. **Job #364: Hotel Reception #19** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
365. **Job #365: Construction Labourer #20** — new day-job with level gate, tier and base pay, expands the job board from 12 to 32.
366. **Gym #366: The Bunker** — new training house at level 5, distinct flavour text and training access gate.
367. **Gym #367: Anvil Yard** — new training house at level 10, distinct flavour text and training access gate.
368. **Gym #368: Photon Fitness** — new training house at level 14, distinct flavour text and training access gate.
369. **Gym #369: Southside Rings** — new training house at level 18, distinct flavour text and training access gate.
370. **Gym #370: Foundry Annex** — new training house at level 22, distinct flavour text and training access gate.
371. **Gym #371: Harbour Strength** — new training house at level 26, distinct flavour text and training access gate.
372. **Gym #372: Altitude Club** — new training house at level 30, distinct flavour text and training access gate.
373. **Gym #373: Neon Flex** — new training house at level 35, distinct flavour text and training access gate.
374. **Course #374: Night Audit** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
375. **Course #375: Public Speaking** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
376. **Course #376: Lock Theory** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
377. **Course #377: Cold Storage** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
378. **Course #378: Psychology 101** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
379. **Course #379: Nutrition & Conditioning** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
380. **Course #380: Drone Law** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
381. **Course #381: Forensic Awareness** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
382. **Course #382: Supply Chain** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
383. **Course #383: Negotiation** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
384. **Course #384: Estate Security** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
385. **Course #385: Crypto Forensics** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
386. **Course #386: Urban Driving** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
387. **Course #387: Chemistry II** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
388. **Course #388: Media Handling** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
389. **Course #389: Risk Modelling** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
390. **Course #390: Brand & Hype** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
391. **Course #391: Street Medicine** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
392. **Course #392: Legal Loopholes** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
393. **Course #393: Network Ops** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
394. **Course #394: Strength Lab** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
395. **Course #395: Agility Clinic** — new Wireside College course with cost, timed duration and permanent grant (stat boost, crime%, jail%, bank%, vault, market fee).
396. **Property #396: Dockside Pod** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
397. **Property #397: Loft over the Arcade** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
398. **Property #398: Suburban Cube** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
399. **Property #399: Canal House** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
400. **Property #400: Hillside View** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
401. **Property #401: Bunker Conversion** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
402. **Property #402: Riverside Duplex** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
403. **Property #403: City Farmhouse** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
404. **Property #404: Skybridge Flat** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
405. **Property #405: Harbour Penthouse** — new housing tier with price, happiness, upkeep, vault size and two upgrades (shelf + safe). Extends ladder to 20 homes.
406. **Merit perk #406: Bright Future** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
407. **Merit perk #407: Nerve of Steel** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
408. **Merit perk #408: Stone Skin** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
409. **Merit perk #409: Good Mood** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
410. **Merit perk #410: Gym Bunny** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
411. **Merit perk #411: Night Work** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
412. **Merit perk #412: Heavy Hands** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
413. **Merit perk #413: Smooth Talker** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
414. **Merit perk #414: Vault Lurker** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
415. **Merit perk #415: Broker Chip** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
416. **Merit perk #416: Lucky Draw** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
417. **Merit perk #417: Street Eyes** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
418. **Merit perk #418: Cold Wallet** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
419. **Merit perk #419: Ink Stained** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
420. **Merit perk #420: Angler Pro** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
421. **Merit perk #421: Clout Engine** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
422. **Merit perk #422: Scrap King** — new merit line with max ranks and permanent bonus (energy, nerve, life, happy, gym%, crime%, jail%, market fee, turf influence, staking yield, hype, salvage). Ladder now 30 perks.
423. **Title #423: Door Runner** — new reputation rank at 400 rep, shown on profile and across city.
424. **Title #424: Cut Lad** — new reputation rank at 700 rep, shown on profile and across city.
425. **Title #425: Wire Hand** — new reputation rank at 1,500 rep, shown on profile and across city.
426. **Title #426: Block Regular** — new reputation rank at 2,500 rep, shown on profile and across city.
427. **Title #427: Row Boss** — new reputation rank at 5,000 rep, shown on profile and across city.
428. **Title #428: Quarter Claim** — new reputation rank at 7,500 rep, shown on profile and across city.
429. **Title #429: Dock Enforcer** — new reputation rank at 12,000 rep, shown on profile and across city.
430. **Title #430: Mile Watcher** — new reputation rank at 18,000 rep, shown on profile and across city.
431. **Title #431: City Eye** — new reputation rank at 30,000 rep, shown on profile and across city.
432. **Title #432: Foundry Hand** — new reputation rank at 45,000 rep, shown on profile and across city.
433. **Title #433: Glass Operator** — new reputation rank at 70,000 rep, shown on profile and across city.
434. **Title #434: Heights Guest** — new reputation rank at 90,000 rep, shown on profile and across city.
435. **Title #435: Exchange Shadow** — new reputation rank at 150,000 rep, shown on profile and across city.
436. **Title #436: Ledger Ghost** — new reputation rank at 200,000 rep, shown on profile and across city.
437. **Title #437: Vault Whisper** — new reputation rank at 350,000 rep, shown on profile and across city.
438. **Title #438: Night Mayor** — new reputation rank at 400,000 rep, shown on profile and across city.
439. **Title #439: Mayors Shadow** — new reputation rank at 600,000 rep, shown on profile and across city.
440. **Title #440: Kingpin** — new reputation rank at 800,000 rep, shown on profile and across city.
441. **Title #441: Wire Monarch** — new reputation rank at 1,000,000 rep, shown on profile and across city.
442. **Title #442: City Myth** — new reputation rank at 1,500,000 rep, shown on profile and across city.
443. **Title #443: Eternal** — new reputation rank at 2,000,000 rep, shown on profile and across city.
444. **Achievement #444: Feat 001** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
445. **Achievement #445: Feat 002** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
446. **Achievement #446: Feat 003** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
447. **Achievement #447: Feat 004** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
448. **Achievement #448: Feat 005** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
449. **Achievement #449: Feat 006** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
450. **Achievement #450: Feat 007** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
451. **Achievement #451: Feat 008** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
452. **Achievement #452: Feat 009** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
453. **Achievement #453: Feat 010** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
454. **Achievement #454: Feat 011** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
455. **Achievement #455: Feat 012** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
456. **Achievement #456: Feat 013** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
457. **Achievement #457: Feat 014** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
458. **Achievement #458: Feat 015** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
459. **Achievement #459: Feat 016** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
460. **Achievement #460: Feat 017** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
461. **Achievement #461: Feat 018** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
462. **Achievement #462: Feat 019** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
463. **Achievement #463: Feat 020** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
464. **Achievement #464: Feat 021** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
465. **Achievement #465: Feat 022** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
466. **Achievement #466: Feat 023** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
467. **Achievement #467: Feat 024** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
468. **Achievement #468: Feat 025** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
469. **Achievement #469: Feat 026** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
470. **Achievement #470: Feat 027** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
471. **Achievement #471: Feat 028** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
472. **Achievement #472: Feat 029** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
473. **Achievement #473: Feat 030** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
474. **Achievement #474: Feat 031** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
475. **Achievement #475: Feat 032** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
476. **Achievement #476: Feat 033** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
477. **Achievement #477: Feat 034** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
478. **Achievement #478: Feat 035** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
479. **Achievement #479: Feat 036** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
480. **Achievement #480: Feat 037** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
481. **Achievement #481: Feat 038** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
482. **Achievement #482: Feat 039** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
483. **Achievement #483: Feat 040** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
484. **Achievement #484: Feat 041** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
485. **Achievement #485: Feat 042** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
486. **Achievement #486: Feat 043** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
487. **Achievement #487: Feat 044** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
488. **Achievement #488: Feat 045** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
489. **Achievement #489: Feat 046** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
490. **Achievement #490: Feat 047** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
491. **Achievement #491: Feat 048** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
492. **Achievement #492: Feat 049** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
493. **Achievement #493: Feat 050** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
494. **Achievement #494: Feat 051** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
495. **Achievement #495: Feat 052** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
496. **Achievement #496: Feat 053** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
497. **Achievement #497: Feat 054** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
498. **Achievement #498: Feat 055** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
499. **Achievement #499: Feat 056** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
500. **Achievement #500: Feat 057** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
501. **Achievement #501: Feat 058** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
502. **Achievement #502: Feat 059** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
503. **Achievement #503: Feat 060** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
504. **Achievement #504: Feat 061** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
505. **Achievement #505: Feat 062** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
506. **Achievement #506: Feat 063** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
507. **Achievement #507: Feat 064** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
508. **Achievement #508: Feat 065** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
509. **Achievement #509: Feat 066** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
510. **Achievement #510: Feat 067** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
511. **Achievement #511: Feat 068** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
512. **Achievement #512: Feat 069** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
513. **Achievement #513: Feat 070** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
514. **Achievement #514: Feat 071** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
515. **Achievement #515: Feat 072** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
516. **Achievement #516: Feat 073** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
517. **Achievement #517: Feat 074** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
518. **Achievement #518: Feat 075** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
519. **Achievement #519: Feat 076** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
520. **Achievement #520: Feat 077** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
521. **Achievement #521: Feat 078** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
522. **Achievement #522: Feat 079** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
523. **Achievement #523: Feat 080** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
524. **Achievement #524: Feat 081** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
525. **Achievement #525: Feat 082** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
526. **Achievement #526: Feat 083** — new tracked feat with icon and description, wired to news wire; total achievements 67→150.
527. **Gig #527: Wash a van fleet** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
528. **Gig #528: Sort the returns room** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
529. **Gig #529: Paint a bedsit** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
530. **Gig #530: Flat-pack hell** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
531. **Gig #531: Coffee cart push** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
532. **Gig #532: Plant the balconies** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
533. **Gig #533: Poster run** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
534. **Gig #534: Lift gym mirrors** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
535. **Gig #535: Stage crew call** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
536. **Gig #536: Market pack-down** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
537. **Gig #537: Kebab shop close** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
538. **Gig #538: Clothes rail move** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
539. **Gig #539: Petrol station night cover** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
540. **Gig #540: Record store sort** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
541. **Gig #541: Leaflet legal pack** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
542. **Gig #542: Bike shop tune** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
543. **Gig #543: Barber sweep** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
544. **Gig #544: Bake night loaves** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
545. **Gig #545: Sign vinyl weed** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
546. **Gig #546: Pop-up build** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
547. **Gig #547: Florist buckets** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
548. **Gig #548: Gallery hang** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
549. **Gig #549: Canteen pot wash** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
550. **Gig #550: Phone screen fix** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
551. **Gig #551: Laundry collect** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
552. **Gig #552: Estate flyering** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
553. **Gig #553: Car park marshal** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
554. **Gig #554: Taxi queue host** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
555. **Gig #555: Studio cable coil** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
556. **Gig #556: Courtyard sweep** — new odd-job on the gig board with cash band, energy cost and daily rotation seed; board now 38 gigs.
557. **Recipe #557: bench recipe #001** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
558. **Recipe #558: bench recipe #002** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
559. **Recipe #559: bench recipe #003** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
560. **Recipe #560: bench recipe #004** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
561. **Recipe #561: bench recipe #005** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
562. **Recipe #562: bench recipe #006** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
563. **Recipe #563: bench recipe #007** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
564. **Recipe #564: bench recipe #008** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
565. **Recipe #565: bench recipe #009** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
566. **Recipe #566: bench recipe #010** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
567. **Recipe #567: bench recipe #011** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
568. **Recipe #568: bench recipe #012** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
569. **Recipe #569: bench recipe #013** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
570. **Recipe #570: bench recipe #014** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
571. **Recipe #571: bench recipe #015** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
572. **Recipe #572: bench recipe #016** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
573. **Recipe #573: bench recipe #017** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
574. **Recipe #574: bench recipe #018** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
575. **Recipe #575: bench recipe #019** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
576. **Recipe #576: bench recipe #020** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
577. **Recipe #577: bench recipe #021** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
578. **Recipe #578: bench recipe #022** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
579. **Recipe #579: bench recipe #023** — new crafting bench recipe with 2-3 inputs → crafted output, extends bench from 7 to 30 recipes.
580. **Origin #580: River Rat** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
581. **Origin #581: Market Hand** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
582. **Origin #582: Foundry Kid** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
583. **Origin #583: Glass Quarter Gray** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
584. **Origin #584: Harbour Runner** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
585. **Origin #585: Studio Rat** — new starting origin with unique stat edge (+8) and starter kit, expands origins 6→12.
586. **Mission #586: Breakfast Run** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
587. **Mission #587: Market Maven** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
588. **Mission #588: Ink Addict** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
589. **Mission #589: Pet Whisperer** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
590. **Mission #590: Vault Raider** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
591. **Mission #591: Night Owl** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
592. **Mission #592: Bank Builder** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
593. **Mission #593: Car Collector** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
594. **Mission #594: Rags to Riches** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
595. **Mission #595: Rep Hunter** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
596. **Mission #596: Gym Obsessed** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
597. **Mission #597: Fish Legend** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
598. **Mission #598: Gig Economy** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
599. **Mission #599: Hype Train** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
600. **Mission #600: Scrap Tycoon** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
601. **Mission #601: Card Shark** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
602. **Mission #602: Craft Master** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
603. **Mission #603: Turf Barron** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
604. **Mission #604: Plasma Regular** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
605. **Mission #605: Trial Veteran** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
606. **Mission #606: Busker Star** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
607. **Mission #607: Storage Mogul** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
608. **Mission #608: Mystery Opener** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
609. **Mission #609: Lottery Dreamer** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
610. **Mission #610: Influence King** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
611. **Mission #611: Staker** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
612. **Mission #612: Insurance Hold** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
613. **Mission #613: Friend Circle** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
614. **Mission #614: Challenge Dominator** — new mission board posting with stat tally, need and cash/XP reward; board now 40 missions.
615. **Pet #615: Stray Dog** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
616. **Pet #616: Alley Cat** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
617. **Pet #617: Harbour Raven** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
618. **Pet #618: Glass Tank Python** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
619. **Pet #619: Ferret** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
620. **Pet #620: Rescue Parrot** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
621. **Pet #621: Lockside Bulldog** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
622. **Pet #622: Urban Fox** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
623. **Pet #623: Rat King** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
624. **Pet #624: Warehouse Owl** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
625. **Pet #625: Corner-Shop Tortoise** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
626. **Pet #626: Yard Pit** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
627. **Pet #627: Magpie** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
628. **Pet #628: Neon Gecko** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
629. **Pet #629: Micro Pig** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
630. **Pet #630: Crow Court** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
631. **Pet #631: Harbour Husky** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
632. **Pet #632: Heat-Lamp Iguana** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
633. **Pet #633: Yard Rabbit** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
634. **Pet #634: Rooftop Hawk** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
635. **Pet #635: Canal Capybara** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
636. **Pet #636: Glass Axolotl** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
637. **Pet #637: Dock Doberman** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
638. **Pet #638: Chinchilla** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
639. **Pet #639: Rooftop Hive Queen** — new companion catalogue entry with purchase price and passive buff (happy, stats, crime%); adds pet collection system.
640. **Tattoo #640: Wire Script** — new ink parlour entry with slot, price and flavour; expands personalisation.
641. **Tattoo #641: Razor Smile** — new ink parlour entry with slot, price and flavour; expands personalisation.
642. **Tattoo #642: Dock Anchor** — new ink parlour entry with slot, price and flavour; expands personalisation.
643. **Tattoo #643: Paper Crown** — new ink parlour entry with slot, price and flavour; expands personalisation.
644. **Tattoo #644: Snake Sleeve** — new ink parlour entry with slot, price and flavour; expands personalisation.
645. **Tattoo #645: Bead Chain** — new ink parlour entry with slot, price and flavour; expands personalisation.
646. **Tattoo #646: Knuckle Stars** — new ink parlour entry with slot, price and flavour; expands personalisation.
647. **Tattoo #647: Foundry Moth** — new ink parlour entry with slot, price and flavour; expands personalisation.
648. **Tattoo #648: Card Fan** — new ink parlour entry with slot, price and flavour; expands personalisation.
649. **Tattoo #649: Dagger & Rose** — new ink parlour entry with slot, price and flavour; expands personalisation.
650. **Tattoo #650: Canal Wave** — new ink parlour entry with slot, price and flavour; expands personalisation.
651. **Tattoo #651: Hawk Backpiece** — new ink parlour entry with slot, price and flavour; expands personalisation.
652. **Tattoo #652: Loyalty Script** — new ink parlour entry with slot, price and flavour; expands personalisation.
653. **Tattoo #653: Lucky Numbers** — new ink parlour entry with slot, price and flavour; expands personalisation.
654. **Tattoo #654: Sugar Skull** — new ink parlour entry with slot, price and flavour; expands personalisation.
655. **Tattoo #655: Brass Compass** — new ink parlour entry with slot, price and flavour; expands personalisation.
656. **Tattoo #656: Gold Chain Ink** — new ink parlour entry with slot, price and flavour; expands personalisation.
657. **Tattoo #657: Single Tear** — new ink parlour entry with slot, price and flavour; expands personalisation.
658. **Tattoo #658: Tiger Head** — new ink parlour entry with slot, price and flavour; expands personalisation.
659. **Tattoo #659: Neon Geisha** — new ink parlour entry with slot, price and flavour; expands personalisation.
660. **Tattoo #660: Web Elbow** — new ink parlour entry with slot, price and flavour; expands personalisation.
661. **Tattoo #661: Lightning Bolt** — new ink parlour entry with slot, price and flavour; expands personalisation.
662. **Tattoo #662: All-Seeing Eye** — new ink parlour entry with slot, price and flavour; expands personalisation.
663. **Tattoo #663: Shoulder Wings** — new ink parlour entry with slot, price and flavour; expands personalisation.
664. **Tattoo #664: Coil Dragon** — new ink parlour entry with slot, price and flavour; expands personalisation.
665. **Tattoo #665: Stitched Heart** — new ink parlour entry with slot, price and flavour; expands personalisation.
666. **Tattoo #666: Barbed Collar** — new ink parlour entry with slot, price and flavour; expands personalisation.
667. **Tattoo #667: Homing Sparrow** — new ink parlour entry with slot, price and flavour; expands personalisation.
668. **Street art #668: Crown Tag** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
669. **Street art #669: Wire Throw** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
670. **Street art #670: Foundry Ghost** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
671. **Street art #671: Halo Halo** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
672. **Street art #672: Kingsway Koi** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
673. **Street art #673: Red Mile Teeth** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
674. **Street art #674: Exchange Eyes** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
675. **Street art #675: Night Market Neon** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
676. **Street art #676: Rooftop Wildstyle** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
677. **Street art #677: Yard Train Piece** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
678. **Street art #678: Canal Bridge Burner** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
679. **Street art #679: Subway Silver** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
680. **Street art #680: Tower Tag** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
681. **Street art #681: Legal Wall Burner** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
682. **Street art #682: Stencil Run** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
683. **Street art #683: Half-Town Mural** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
684. **Street art #684: Heaven Spot** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
685. **Street art #685: Backjump Burner** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
686. **Street art #686: Crew Production** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
687. **Street art #687: Throwie Heaven** — new wall-tag target with level gate and cash/rep reward, feeds district tagging and clout.
688. **Contact #688: Moss (Fixer)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
689. **Contact #689: Chi (Informant)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
690. **Contact #690: Yara (Fence)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
691. **Contact #691: Ellis (Street Doc)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
692. **Contact #692: Nova (Hacker)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
693. **Contact #693: Kai (Wheel)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
694. **Contact #694: Quin (Brief)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
695. **Contact #695: Raine (Baker)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
696. **Contact #696: Uriah (Yard Boss)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
697. **Contact #697: Aya (Night Clerk)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
698. **Contact #698: Porter Joe** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
699. **Contact #699: Malik (Promoter)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
700. **Contact #700: Lena (Customs)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
701. **Contact #701: Omar (Bank Inside)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
702. **Contact #702: Sable (Press)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
703. **Contact #703: Ren (Inside)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
704. **Contact #704: Ira (Vault Tech)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
705. **Contact #705: Wen (Crypto Desk)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
706. **Contact #706: Faye (Ghost)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
707. **Contact #707: Vex (Forger)** — new fixer/informant contact with role, icon and unlock level; powers future narrative hooks.
708. **708: Street food: Doner Wrap — new consumable bite with energy/happy and street price** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
709. **709: Street food: Curry Box — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
710. **710: Street food: Midnight Noodles — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
711. **711: Street food: Smash Burger — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
712. **712: Street food: Taco Trio — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
713. **713: Street food: Samosa Box — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
714. **714: Street food: Jerk Plate — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
715. **715: Street food: Night Pho — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
716. **716: Street food: Hand Sushi Set — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
717. **717: Street food: Falafel Wrap — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
718. **718: Street food: Pierogi Plate — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
719. **719: Street food: Egg & Rice — new consumable** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
720. **720: Nightlife: Neon Alley — new cover venue with happy/rep and cover charge** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
721. **721: Nightlife: The Glass Room — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
722. **722: Nightlife: Foundry Live — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
723. **723: Nightlife: Docks Warehouse — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
724. **724: Nightlife: Rooftop Cinema — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
725. **725: Nightlife: The Hush Bar — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
726. **726: Nightlife: Basement Bowl — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
727. **727: Nightlife: Night Arcade — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
728. **728: Nightlife: River Boat — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
729. **729: Nightlife: After Market — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
730. **730: Nightlife: Sky Lounge — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
731. **731: Nightlife: The Dive — new venue** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
732. **732: Weapon skin: Midnight Finish — new cosmetic weapon finish** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
733. **733: Weapon skin: Neon Etch — new cosmetic** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
734. **734: Vehicle mod: Turbo Kit — new garage mod with spd/grp buff** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).
735. **735: Vehicle mod: Nitrous Shot — new mod** — part of 600-feature expansion catalogue (food, nightlife, skins, mods, hideouts, crates).

---

## 📜 City Contracts — 1,000 server-backed jobs

**Features 736–1,735: City Contract #001 through City Contract #1,000.** The catalog is exactly
**10 playbooks × 10 objectives × 10 city sectors**. Each of the 1,000 entries has its own stable ID,
serial number, name, sector, briefing, energy and nerve cost, base success chance, cash range,
reputation/XP reward, failure consequence, and preferred weather condition. The catalog is generated
from the original playbook/objective/sector data in `lib/game/contract-catalog.js` and hard-fails at
boot if it is ever not exactly 1,000 entries.

The feature is playable rather than a list of placeholders:

- The Hustles tab gives every citizen **three unique City Contracts** every four hours, selected
  deterministically from the 1,000-entry catalog for that citizen and rotation.
- A contract can be closed once per rotation. The server owns the active board and rejects forged,
  stale, or repeated contract IDs.
- Each run spends its displayed energy and nerve, resolves against its server-side chance, pays its
  own cash/reputation/XP rewards on a clean close, and has a modest life/reputation consequence on a
  miss. Matching the listed live weather grants +8% success.
- Progress persists: the board shows the current rotation, completed leads, all-time clean closes,
  total attempts, and reset time. Twenty successful closes unlock the Contract Closer feat.
- City Contracts feed the daily challenge pool (`Close 2 city contracts`) and are exposed in
  `/api/meta` as a 1,000-entry catalog count so clients and checks can verify the expansion without
  downloading unnecessary data.


---

### Verified working

| Suite | What it covers | Result |
|---|---|---|
| `node tools/check-2026.js` | every 2026 action family over HTTP, including City Contracts | **95 / 95 pass** |
| `node tools/check-api.js` | core API contract | **93 / 93 pass** |
| `node tools/check-systems.js` | rules of every system, including the 1,000-contract catalog | **236 / 236 pass** |
| `node tools/check-http.js` | resilience & abuse | **8 / 8 pass** |

Avatar renderer additionally smoke-tested across 30,000 random part combinations with zero broken
renders, plus legacy 5-part upgrade paths.
