// Razor Town — content database (2026 — present-day Wire City)
// A present-day life of crime in Razor Town: burner phones, relay-theft cars,
// cold wallets, plate carriers and plate lunches. All names & fiction original;
'use strict';

// ---------------------------------------------------------------- CRIMES
// req: recommended stat floor. base = success % when you meet it.
const CRIMES = [
  { id:'shoplift',      cat:'theft',  name:'Lift stock from the corner shops',         nerve:1,  req:{dx:8},   base:88, cash:[40,150],        drop:[['neon_phone',3],['volt_cola',8]],      jail:[8,20],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Hands like rain. The shelf alarm never even wakes up.' },
  { id:'snatch',        cat:'theft',  name:'Snatch a phone at the station',       nerve:1,  req:{sp:12,dx:10}, base:78, cash:[90,330],    drop:[['thick_wallet',25]],                    jail:[15,40],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Headphones on, world off. Yours by the second platform gate.' },
  { id:'pickpocket',    cat:'theft',  name:'Dip pockets at the night market',       nerve:1,  req:{dx:18}, base:74, cash:[120,520],     drop:[['vault_watch',4],['thick_wallet',15]],  jail:[10,30],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Crowd noise, coat sleeves, and a queue of people holding their phones in the wrong hand.' },
  { id:'fence',         cat:'theft',  name:'Fence goods through the back rooms',     nerve:1,  req:{de:8},  base:86, cash:[150,620],     drop:[],                                    jail:[5,15],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Cash in a jiffy bag, goods into the van, and nobody\'s name on anything.' },
  { id:'burglary',      cat:'theft',  name:'Burgle a new-build semi',         nerve:2,  req:{sp:24,dx:26}, base:66, cash:[500,1900],  drop:[['pixelbox_x',10],['gold_chain',8],['vault_watch',6]], jail:[45,120], bust:'jail',
    lvl:2, tag:'entry',
    blurb:'Ring doorbell disabled, glass cut quiet, and the whole street\'s streaming something loud.' },
  { id:'car_jack',      cat:'theft',  name:'Ghost a car off the drive',              nerve:3,  req:{sp:40,dx:35,st:15}, base:58, cash:[1400,5200], drop:[['lockpicks',18],['crypto_rig',4]],   jail:[90,240], bust:'jail',
    lvl:4, tag:'entry',
    blurb:'Two people, one laptop, a relay box waving the key signal at the door. Sixty seconds to a new VIN.' },
  { id:'card_skim',     cat:'fraud',  name:'Skim card readers at fuel stops',   nerve:1,  req:{dx:20}, base:80, cash:[220,900],      drop:[['thick_wallet',10],['neon_phone',5]],   jail:[25,60],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Skimmer on the pay-at-pump, firmware flashed, takings at brunch. Small numbers, big volume.' },
  { id:'fake_id',       cat:'fraud',  name:'Forge polished identities',            nerve:2,  req:{dx:32}, base:70, cash:[700,2600],     drop:[],                                        jail:[60,150], bust:'jail',
    lvl:2, tag:'entry',
    blurb:'Clean name, clean credit, a face that matches the photocard. Then you sell it by the month.' },
  { id:'invoice',       cat:'fraud',  name:'Invoice fraud — the shell companies',            nerve:3,  req:{dx:38}, base:64, cash:[1600,6000],    drop:[['silk_laptop',6]],                        jail:[90,200], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Three invoices for logistics that never happened, to firms that only exist on paper. VAT, darling, VAT.' },
  { id:'tourist_scam',  cat:'fraud',  name:'The QR-code con',        nerve:1,  req:{sp:26,dx:30}, base:72, cash:[300,1100], drop:[['thick_wallet',12]],                     jail:[15,45],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'A sticker over the gin bar\'s tip-code, a redirect, a thank-you page. The punters pay you by mistake, politely.' },
  { id:'booze_run',     cat:'black',  name:'Run contraband on the ring road',        nerve:2,  req:{sp:30},  base:72, cash:[450,1700],    drop:[['noir_whisky',12],['rainy_ale',20]],     jail:[30,80],  bust:'jail',
    lvl:2, tag:'entry',
    blurb:'White van, second junction on the roundabout — goods moving fast enough that a checkpoint sees only paintwork.' },
  { id:'watches',       cat:'black',  name:'Shift knock-off smartphones', nerve:2,  req:{de:20},  base:76, cash:[700,2400],    drop:[['vault_watch',8]],                        jail:[30,90],  bust:'jail',
    lvl:2, tag:'entry',
    blurb:'Sea-freight \u2018flagships\u2019, ghost-flashed, boxed like new. The punters unbox them like Christmas.' },
  { id:'corner_trade',  cat:'black',  name:'Work the pavement trade',           nerve:3,  req:{de:30,sp:20}, base:64, cash:[1800,6500], drop:[['happy_caps',12],['spike',3]],           jail:[90,240], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Parlay slips and burner odds. Cops watch the betting shops; the money moves through the app nobody admits to.' },
  { id:'smuggle',       cat:'black',  name:'Run packs past port security', nerve:4,  req:{sp:52,de:34}, base:52, cash:[4500,16000], drop:[['spike',6],['crate_iron',8]],          jail:[180,420], bust:'hospital',
    lvl:6, tag:'pro',
    blurb:'Every container a decoy except one. The scanner loves the decoys.' },
  { id:'phish',         cat:'trick',  name:'Romance-scam messaging',      nerve:1,  req:{dx:26}, base:80, cash:[250,1000],     drop:[['neon_phone',6],['silk_laptop',3]],      jail:[30,70],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Deployed overseas, widowed, banking trouble, face from a modelling stock library. The lonely pay you first.' },
  { id:'crypto_job',    cat:'trick',  name:'The coin presale rug',          nerve:2,  req:{dx:44}, base:68, cash:[900,3800],     drop:[['crypto_rig',8],['silk_laptop',4]],       jail:[60,150], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'A whitepaper, an \u2018audited\u2019 contract, a countdown timer. Liquidity removes itself at zero-hour.' },
  { id:'bank_hack',     cat:'org',    name:'Drain the bank\'s cold wallet',         nerve:4,  req:{dx:70}, base:44, cash:[9000,32000],   drop:[['crypto_rig',20],['pink_diamond',2]],     jail:[240,600], bust:'hospital',
    lvl:8, tag:'pro',
    blurb:'Seed phrase on a cloud backup \u2018for safekeeping\u2019. It is now keeping someone else very safe indeed.' },
  { id:'shakedown',     cat:'heat',   name:'Collect the street rents',       nerve:2,  req:{st:28,de:22}, base:72, cash:[600,2200], drop:[['thick_wallet',8]],                        jail:[20,60],  bust:'jail',
    lvl:2, tag:'petty',
    blurb:'Fire insurance. Breakage insurance. Polite-words insurance. The stallholders pay all three to you.' },
  { id:'enforcer',      cat:'heat',   name:'Collect on the late ledger',        nerve:3,  req:{st:42,de:34,sp:22}, base:64, cash:[1900,7000], drop:[['heavy_iron',6]],                   jail:[60,150], bust:'hospital',
    lvl:4, tag:'entry',
    blurb:'The ledger says three weeks overdue. The van outside the shutter says you are here to settle the bill.' },
  { id:'liquor_rob',    cat:'heat',   name:'Hit the late-night corner shop',    nerve:3,  req:{sp:36,st:30}, base:60, cash:[2800,9500], drop:[['heavy_iron',8],['lockpicks',8]],        jail:[120,300], bust:'hospital',
    lvl:5, tag:'pro',
    blurb:'Ninety seconds. The till float, the scratchies, the clerk\'s phone — the CCTV, regrettably, looped.' },
  { id:'gem_heist',     cat:'org',    name:'Hit the gold courier van', nerve:6, req:{sp:60,dx:58,st:30}, base:50, cash:[13000,48000], drop:[['pink_diamond',8],['ice_ring',15],['vault_watch',10]], jail:[360,900], bust:'hospital',
    lvl:10, tag:'pro',
    blurb:'Same route, same lights, every Friday. This Friday there\'s a flatbed in the way and men in balaclavas.' },
  { id:'armored',       cat:'org',    name:'Stop the cash-in-transit',          nerve:8,  req:{st:55,de:50,sp:48}, base:40, cash:[42000,150000], drop:[['heavy_iron',15],['ice_ring',10]], jail:[600,1440], bust:'hospital',
    lvl:16, tag:'legend',
    blurb:'Two guards, one route, armoured everything. Armour opens from the inside — with the right brick through the right sensor panel.' },
  { id:'vault',         cat:'org',    name:'The exchange vault job',             nerve:10, req:{dx:95,sp:70,de:60}, base:30, cash:[160000,600000], drop:[['pink_diamond',25],['ice_ring',20]], jail:[1440,2880], bust:'hospital',
    lvl:26, tag:'legend',
    blurb:'The Wire Exchange vault: steel, glass and forty years of \u2018it cannot be done\u2019. One more try, then never again.' },
];

const CRIME_CATS = {
  theft:  { name:'Theft & Dip',        icon:'\uD83C\uDFA9' },
  fraud:  { name:'Fraud & Forge',      icon:'\uD83E\uDDFE' },
  black:  { name:'Black Market',       icon:'\uD83D\uDEEB\uFE0F' },
  trick:  { name:'Sharp Practice',     icon:'\uD83C\uDFB2' },
  heat:   { name:'Strong-Arm Work',    icon:'\uD83E\uDE91' },
  org:    { name:'Big Jobs',           icon:'\uD83C\uDFED\uFE0F' },
};

// ---------------------------------------------------------------- ITEMS
const ITEMS = {
  volt_cola:   { name:'Energy Drink', icon:'\uD83C\uDF75', type:'use', buy:120,  sell:30,  effect:{energy:6, happy:12}, desc:'Sized for night shifts and longer nights. +6 energy, +12 happy.' },
  black_espr:  { name:'Double Espresso',icon:'\u2615', type:'use', buy:70,   sell:15,  effect:{energy:4, happy:6},  desc:'Oily, bitter, immediate. +4 energy.' },
  diesel_shake:{ name:'Greasy-Spoon Breakfast',   icon:'\uD83E\uDD67',type:'use',buy:320,sell:70, effect:{energy:22,happy:18}, desc:'Full tray, brown sauce, dignity optional. +22 energy, +18 happy.' },
  rainy_ale:   { name:'Corner-shop Beer', icon:'\uD83C\uDF7A', type:'use', buy:45,  sell:10, effect:{happy:28},          desc:'Bought at midnight, cold enough. +28 happy.' },
  noir_whisky: { name:'Single Malt Whisky',    icon:'\uD83E\uDD43', type:'use', buy:240, sell:60, effect:{happy:70},          desc:'Twelve years in oak, still warm on the way down. +70 happy.' },
  champagne:   { name:'French Champagne',    icon:'\uD83C\uDF7E', type:'use', buy:900, sell:220,effect:{happy:150},         desc:'Real label, real cork, borrowed budget. +150 happy.' },
  happy_caps:  { name:'Night Nurse Pack', icon:'\uD83E\uDDEA', type:'use', buy:700, sell:180,effect:{happy:90},  desc:'Whatever was in the packet works. +90 happy.' },
  trauma_kit:  { name:'Field Trauma Kit',      icon:'\uD83D\uDEC9', type:'use', buy:1500,sell:380,effect:{life:100},          desc:'Tourniquet, gauze and a steady hand. Fully restores life.' },
  nerve_tab:   { name:'Steady-State Nerve Tabs', icon:'\uD83E\uDDEA', type:'use', buy:6000,sell:1500,effect:{nerve:15}, desc:'Pharmacy-grade calm in blister foil. +15 nerve.' },
  spike:   { name:'Adrenal Shot \u2014 Strength', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'st',mult:1.5,min:30}, desc:'Legal nowhere, effective everywhere. Strength x1.5 for 30 minutes.' },
  stim:    { name:'Reflex Booster \u2014 Speed', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'sp',mult:1.5,min:30}, desc:'Run like the sirens are behind you. Speed x1.5 for 30 minutes.' },
  cortex:  { name:'Micro-Dose \u2014 Dexterity', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'dx',mult:1.5,min:30}, desc:'Fingers quicker than the camera\u2019s eye. Dexterity x1.5 for 30 minutes.' },
  plating: { name:'Pain-Killer Pack \u2014 Defense', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'de',mult:1.5,min:30}, desc:'Everything bounces off. Defense x1.5 for 30 minutes.' },
  thick_wallet:{ name:'Fat Wallet',  icon:'\uD83D\uDCB5', type:'loot', sell:160,  desc:'Somebody\u2019s bankroll is now your logistics budget. Fence it quick.' },
  neon_phone:  { name:'Burner Smartphone', icon:'\uD83D\uDCF1', type:'loot', sell:950,  desc:'Wiped, hot, and already answering somebody else\u2019s messages. Fences quick.' },
  silk_laptop: { name:'Ghost-Build Laptop', icon:'\uD83D\uDCBB', type:'loot', sell:4100, desc:'No cameras in the BIOS and a very interesting browser history. Worth real money.' },
  pixelbox_x:  { name:'Next-Gen Console', icon:'\uD83C\uDFAE', type:'loot', sell:1300, desc:'Still shrink-wrapped and already \u2018lost\u2019 somewhere off the M6.' },
  crypto_rig:  { name:'Crypto Mining Rig', icon:'\u26CF\uFE0F', type:'loot', sell:9500, desc:'Hashes NGT for you around the clock while you own it. Check the Exchange for your wallet.' },
  vault_watch: { name:'Smartwatch Pro', icon:'\uD83D\uDD70\uFE0F', type:'loot', sell:2600, desc:'Still pinging its late owner\u2019s phone. Sell it before the tracker updates.' },
  gold_chain:  { name:'Gold Chain',    icon:'\uD83D\uDD17', type:'loot', sell:1400, desc:'The kind that anchors a music video — now ballast for your starting stake.' },
  ice_ring:    { name:'Diamond Ring',  icon:'\uD83D\uDC8D', type:'loot', sell:16000, desc:'A stone that said \u2018forever\u2019, now reading \u2018whereabouts unknown\u2019.' },
  pink_diamond:{ name:'The Aurora Diamond',  icon:'\uD83D\uDC8E', type:'loot', sell:56000, desc:'Glows under UV like a traffic stop. Every fence in town wants a piece of it.' },
  lockpicks:   { name:'Lockpick Set',  icon:'\uD83D\uDDDD\uFE0F', type:'loot', buy:1500, sell:600, desc:'Five wafers, a hundred doors, no keyholder\u2019s permission required.' },
  heavy_iron:  { name:'Boot Knife',    icon:'\uD83E\uDE91', type:'loot', buy:6000, sell:2500, desc:'A legal question with a practical answer. Sells quick at the yard if the yard knows you.' },
  crate_iron:  { name:'Crate of Knives',icon:'\uD83D\uDCE6', type:'loot', sell:28000, desc:'A whole crate, padded like museum stock. You are, technically, an arsenal now.' },  // ---------------- GEAR: iron & plate. type 'gear', equip:{slot} with attack or
  // defence bonus pct wired through world.battleStats. One equipped per slot.
  g9_pistol:  { name:'GT-9 Compact',        icon:'\uD83D\uDD2B', type:'gear', buy:9000,   sell:3600,  equip:{slot:'weapon', atk:15}, desc:'A tidy nine that never jams when it matters. +15% attack strength while carried.' },
  sawn_12:    { name:'Ironbridge 12G',      icon:'\uD83D\uDD2B', type:'gear', buy:22000,  sell:8800,  equip:{slot:'weapon', atk:28}, desc:'Short, loud, persuasive. +28% attack strength while carried.' },
  x7_carbine: { name:'X-7 Patrol Carbine',  icon:'\uD83D\uDE94', type:'gear', buy:65000,  sell:26000, equip:{slot:'weapon', atk:45}, desc:'Police-marked, twice erased. +45% attack strength while carried.' },
  longline_sr:{ name:'Longline LR-308',     icon:'\uD83C\uDFAF', type:'gear', buy:150000, sell:60000, equip:{slot:'weapon', atk:65}, desc:'Two junctions away and already certain. +65% attack strength while carried.' },
  kevlar_s1:  { name:'Soft Kevlar Liner',   icon:'\uD83E\uDDBA', type:'gear', buy:7000,   sell:2800,  equip:{slot:'armour', def:15}, desc:'Sits invisible under a track top. +15% defense while worn.' },
  plate_l3:   { name:'Level III Plate Carrier', icon:'\uD83D\uDEE1\uFE0F', type:'gear', buy:26000, sell:10400, equip:{slot:'armour', def:30}, desc:'Ceramic front, ceramic back. +30% defense while worn.' },
  riot_shell: { name:'TPS Riot Shell',      icon:'\uD83D\uDC82', type:'gear', buy:80000,  sell:32000, equip:{slot:'armour', def:45}, desc:'Built for baton rounds and worse. +45% defense while worn.' },
};

// ---------------------------------------------------------------- GYMS
const GYMS = [
  { id:'abandoned_gym', name:'The Underpass Gym', lvl:1, desc:'Pillars, a chain-hung bag and a boat-load of echo. No mirrors, no fob needed.' },
  { id:'boxing_club',   name:'Crown Park Boxing Club', lvl:8, desc:'Blood on the boards, trophies in the lobby. The bouncer is blind to faces by arrangement.' },
  { id:'synth_fit',     name:'Foundry Performance Lab', lvl:16, desc:'Paid members only, biometric door, supplements fridge. Serious people before serious work.' },
];

// ---------------------------------------------------------------- JOBS
const JOBS = [
  { id:'street_cleaner', name:'Night Bin Crew', minLvl:1, tier:'blue',   base:180,  desc:'Ride the truck while the town sleeps. Honest pay, terrible hours.' },
  { id:'diner',          name:'Greasy Spoon Kitchen', minLvl:1, tier:'blue',   base:150,  desc:'Bacon, bread and gossip. The regulars tip well when their partners aren\u2019t watching.' },
  { id:'grocery',        name:'Depot Night Picker', minLvl:2, tier:'blue',   base:260,  desc:'Third shift in the fulfilment shed. Crates, coffee and no questions.' },
  { id:'taxi',           name:'Ride-App Driver', minLvl:4, tier:'blue',   base:420,  desc:'You drive, you listen, the app logs none of it interestingly.' },
  { id:'casino',         name:'Odds Compiler', minLvl:8, tier:'blue',   base:760,  desc:'Run the lines for the big bookies. The house always wins; you get paid either way.' },
  { id:'hospital',       name:'Hospital Porter', minLvl:12, tier:'blue',  base:1250, desc:'You see every kind of Saturday night. A&E tells the best stories.' },
  { id:'tech',           name:'Telecoms Engineer', minLvl:16, tier:'white', base:2100, desc:'Fix the town\u2019s fibre and leave a few cabinets open. Professionally.' },
  { id:'law',            name:'Legal Aide', minLvl:20, tier:'white', base:3200, desc:'File the motions by day, note the interesting case numbers by night.' },
  { id:'army',           name:'Private Security Lead', minLvl:26, tier:'white', base:5200, desc:'Regimented, decorated, and trained at looking away for the right contract.' },
];

// ---------------------------------------------------------------- ORIGINS
const ORIGINS = [
  { id:'street',  name:'Estate Runner',   icon:'\uD83E\uDDE2', stat:'sp', bonus:8,  trait:'+8 starting Speed. Every stairwell, alley and cycle cut in the postal district is yours.', starter:['volt_cola','volt_cola','thick_wallet'] },
  { id:'schemer', name:'Odds Runner',icon:'\uD83E\uDDFE', stat:'dx', bonus:8, trait:'+8 starting Dexterity. You can count a punt, a wallet and a quick escape in the same breath.', starter:['black_espr','black_espr'] },
  { id:'bruiser', name:'Yard Fighter',icon:'\uD83E\uDD4A', stat:'st', bonus:8, trait:'+8 starting Strength. Warehouse shifts by day, cage side-bouts by night.', starter:['diesel_shake','rainy_ale'] },
  { id:'hacker',  name:'Forum Ghost',  icon:'\uD83C\uDFA9', stat:'de', bonus:8, trait:'+8 starting Defense. Three handles, two VPNs, and a door nobody\u2019s ever knocked on.', starter:['black_espr','volt_cola'] },
];

// ---------------------------------------------------------------- ACHIEVEMENTS
const ACHIEVEMENTS = {
  first_crime:     { name:'First Dip',            icon:'\uD83C\uDF1F', desc:'Do your first job.' },
  ten_crimes:      { name:'Slippery Fingers',     icon:'\uD83E\uDDB5', desc:'Do 10 jobs.' },
  fifty_crimes:    { name:'A Seasoned Crim',      icon:'\uD83C\uDFC6', desc:'Do 50 jobs.' },
  big_payout:      { name:'Big Score',            icon:'\uD83E\uDE99', desc:'Pocket $10,000+ from one job.' },
  richer:          { name:'The War Chest',        icon:'\uD83D\uDCB0', desc:'Hold $100,000 to your name.' },
  rich:            { name:'King of the Town',     icon:'\uD83C\uDFAF', desc:'Hold $1,000,000 to your name.' },
  level5:          { name:'Getting Known',        icon:'\u2B50', desc:'Reach level 5.' },
  level10:         { name:'Man of the Town',      icon:'\uD83D\uDC51', desc:'Reach level 10.' },
  level20:         { name:'Boss of the Town',     icon:'\uD83D\uDC51', desc:'Reach level 20.' },
  first_win:       { name:'First Fist',           icon:'\u26D4', desc:'Win your first fight.' },
  five_wins:       { name:'Hard Knuckles',        icon:'\uD83E\uDD3B', desc:'Win 5 fights.' },
  hitlist:         { name:'Feared',               icon:'\uD83D\uDE91', desc:'Win 25 fights.' },
  jailbird:        { name:'Guest of His Majesty', icon:'\uD83D\uDE8C', desc:'Get nicked for the first time.' },
  survivor:        { name:'Back on the Cobbles',  icon:'\uD83C\uDF96\uFE0F', desc:'Survive your first trip to the infirmary.' },
  jobber:          { name:'Honest Hours',         icon:'\uD83D\uDCBC', desc:'Work 20 shifts at any job.' },
  faction:         { name:'The Crew',             icon:'\uD83E\uDE92', desc:'Join or found a gang.' },
  casino:          { name:'Beat the Book',        icon:'\uD83D\uDCB0', desc:'Win a bet at the betting shop.' },
  spender:         { name:'Deep Pockets',         icon:'\uD83D\uDECD\uFE0F', desc:'Spend $50,000 at the market.' },
  collector:       { name:'Collector',            icon:'\uD83D\uDCC1', desc:'Own 15 different items at once.' },
  banker:          { name:'Money in the Mattress',icon:'\uD83C\uDFE2', desc:'Deposit $250,000 into the bank.' },
  firstlot:        { name:'Under the Gavel',       icon:'\uD83D\uDD28', desc:'Win a lot at auction.' },
  buyout:          { name:'Hammer Stiller',        icon:'\uD83D\uDCB8', desc:'Stop a sale with a buy-out bid.' },
  firststock:      { name:'On the Tape',           icon:'\uD83D\uDCC8', desc:'Buy your first shares.' },
  daytrader:       { name:'Tape Runner',           icon:'\uD83D\uDCCA', desc:'Make 25 stock trades.' },
  whale:           { name:'Block Order',           icon:'\uD83D\uDC0B', desc:'Move $100,000 in a single share trade.' },
  firstcoin:       { name:'Cold Hands',            icon:'\uD83E\uDD99', desc:'Buy your first crypto.' },
  miner:           { name:'Hash Rate',             icon:'\u26CF\uFE0F', desc:'Mine your first NGT with a rig.' },
  guncollector:    { name:'Tooled Up',             icon:'\uD83D\uDD2B', desc:'Own every gun on the books.' },
  plated:          { name:'Ceramic Mindset',       icon:'\uD83D\uDEE1\uFE0F', desc:'Wear plate armour.' },
};

// ---------------------------------------------------------------- NEWS flavor
const NEWS_FLAIR = [
  '{name} was seen leaving the bookies grinning like a screen recording.',
  'Scuffles reported near {place}. Nobody saw a thing, of course.',
  '{name} tipped every driver on the block. Nobody asked where the money came from.',
  'The word on the street is that {name} is planning something big.',
  '{name} paid off a neighbour\u2019s council tax. The estate is suddenly very loyal.',
  'An e-scooter fleet went missing near {place}. The GPS tags were in the canal.',
];

const PLACES = ['the Underpass','Kingsway Docks','the Glass Quarter','Foundry Row','Halo Heights','the Night Market','Central Yard','the Old Mill Quarter'];

// ---------------------------------------------------------------- BOT names (era citizens)
const BOT_FIRST = ['Amara','Bailey','Casey','Darren','Ella','Faisal','Grace','Harvey','Imogen','Jordan','Kai','Lacey','Mason','Nadia','Owen','Piper','Quinn','Reece','Sasha','Tyler','Una','Vinnie','Willow','Xavi','Yasmin','Zayn','Carter','Dev','Freya','Hugo','Isla','Josh','Kiera','Leon'];
const BOT_LAST = ['Barker','Crow','Dalton','Fitch','Garvey','Hobbs','Ingram','Jakes','Kemp','Lucas','Marsh','Naylor','Oakes','Pargeter','Quick','Rudd','Stokes','Tarrant','Vale','Wright','Yardley','Moss','Perrin'];


// ---------------------------------------------------------------- EDUCATION
// Courses at Wireside College. Timed, one at a time, and the
// grants are permanent — the classic way to grow a character between crimes.
const COURSES = [
  { id: 'bookkeeping', name: 'Bookkeeping & Ledger Hygiene', icon: '📒', cost: 5000, minutes: 45,
    desc: 'Double entry, petty cash and how to make a shortfall disappear.',
    grant: { crimePct: 1 }, grantText: '+1% crime success' },
  { id: 'shorthand', name: 'Touch Typing & Transcription', icon: '✍️', cost: 8000, minutes: 60,
    desc: 'Take a conversation down at the speed it happens — even through a wall.',
    grant: { dx: 3 }, grantText: '+3 Dexterity' },
  { id: 'carpentry', name: 'Fabrication & Joinery', icon: '🪚', cost: 12000, minutes: 90,
    desc: 'Tenons, jigs and doors that open when you want them to.',
    grant: { st: 4 }, grantText: '+4 Strength' },
  { id: 'driving', name: 'Advanced Driving', icon: '🚗', cost: 30000, minutes: 150,
    desc: 'Beyond the driving test: turning through a cordon is a steering exercise, not a prayer.',
    grant: { sp: 4, dx: 2 }, grantText: '+4 Speed, +2 Dexterity' },
  { id: 'firstaid', name: 'Emergency First Response', icon: '🩹', cost: 20000, minutes: 120,
    desc: 'Tourniquets, airways and staying conscious long enough to run.',
    grant: { jailPct: -15 }, grantText: '15% shorter sentences (you look after the guards too)' },
  { id: 'selfdefence', name: 'Combat Sports', icon: '🥊', cost: 35000, minutes: 180,
    desc: 'Ground work plus footwork — the door staff learn your name.',
    grant: { de: 5, gymPct: 2 }, grantText: '+5 Defence, +2% training gains' },
  { id: 'engineering', name: 'Mechanical Engineering', icon: '⚙️', cost: 90000, minutes: 300,
    desc: 'Lathes, 3-axis CNC and the mathematics of swinging a heavy object.',
    grant: { gymPct: 3 }, grantText: '+3% training gains' },
  { id: 'chemistry', name: 'Industrial Chemistry', icon: '⚗️', cost: 65000, minutes: 240,
    desc: 'Solvents, precursors and what not to mix in a shared rental kitchen.',
    grant: { crimePct: 3 }, grantText: '+3% crime success' },
  { id: 'accountancy', name: 'Quantitative Finance', icon: '🧮', cost: 150000, minutes: 420,
    desc: 'Books that balance, books that merely appear to, and the maths between them.',
    req: { course: 'bookkeeping', level: 5 },
    grant: { crimePct: 2, bankPct: 1 }, grantText: '+2% crime success, +1% bank interest', }
,  { id: 'law', name: 'Property & Business Law', icon: '⚖️', cost: 200000, minutes: 480,
    desc: 'Leases, SPVs and precisely which registrar enjoys a courtesy bottle.',
    req: { course: 'shorthand', level: 5 },
    grant: { propDiscPct: 10, jailPct: -10 }, grantText: '10% off homes and upgrades, 10% shorter sentences' },
  { id: 'medicine', name: 'Anatomy & Trauma', icon: '🩺', cost: 260000, minutes: 540,
    desc: 'Where the bones are and how long a body stays down.',
    req: { course: 'firstaid', level: 8 },
    grant: { maxLife: 30 }, grantText: '+30 maximum life' },
  { id: 'navigation', name: 'Logistics & Routing', icon: '🧭', cost: 120000, minutes: 300,
    desc: 'Manifests, satellite tiles and the routes the couriers do not declare.',
    req: { level: 4 },
    grant: { sp: 4, maxNerve: 1 }, grantText: '+4 Speed, +1 maximum nerve' },
  { id: 'physicalculture', name: 'Strength & Conditioning', icon: '🤸', cost: 45000, minutes: 200,
    desc: 'Sleds, prowler pushes and a cold plunge every morning.',
    grant: { st: 3, maxEnergy: 4 }, grantText: '+3 Strength, +4 maximum energy' },
  { id: 'commercialfrench', name: 'International Trade Desk', icon: '🗼', cost: 40000, minutes: 180,
    desc: 'Currency desks, incoterms and the words customs brokers charge for.',
    grant: { marketFee: -1 }, grantText: '1% lower trading fees' }
];

// ---------------------------------------------------------------- PROPERTIES
// Where you live sets how happy you can get, how much you can keep in a safe,
// and how much the place costs you to run every week.
const PROPERTIES = [
  { id: 'shack', name: 'City Flatlet', icon: '🏚️', price: 0, happy: 100, upkeep: 0, vault: 0,
    desc: 'One room, a pull-out sofa and a lingering curry smell. It is yours.',
    upgrades: [
      { id: 'range', name: 'Induction Hob', icon: '🔥', cost: 2000, happy: 10 },
      { id: 'bed', name: 'Clean Bedding', icon: '🛏️', cost: 1500, happy: 8 },
      { id: 'lock', name: 'Strong Door Lock', icon: '🔒', cost: 3000, happy: 4 }
    ] },
  { id: 'cottage', name: 'Lockside Terrace', icon: '🏡', price: 5000, happy: 130, upkeep: 10, vault: 10000,
    desc: 'A little yard, cycle path behind the fence, houseboats knocking all night.',
    upgrades: [
      { id: 'stove', name: 'Smart Oven', icon: '🍳', cost: 4000, happy: 12 },
      { id: 'radio', name: 'Home Cinema', icon: '📻', cost: 6000, happy: 10 },
      { id: 'safe', name: 'Iron Safe', icon: '🗄️', cost: 8000, happy: 0, vault: 5000 }
    ] },
  { id: 'rooms', name: 'Mill Quarter Loft', icon: '🏘️', price: 25000, happy: 160, upkeep: 25, vault: 50000,
    desc: 'Exposed brick, freight lift, coffee-roaster downstairs wakes at six.',
    upgrades: [
      { id: 'bath', name: 'Bathroom Fitted', icon: '🛁', cost: 12000, happy: 14 },
      { id: 'piano', name: 'Console Corner', icon: '🎹', cost: 20000, happy: 16 },
      { id: 'vault', name: 'Wall Safe', icon: '🔐', cost: 15000, happy: 0, vault: 25000 }
    ] },
  { id: 'semi', name: 'Semi on the Ring Road', icon: '🏠', price: 75000, happy: 200, upkeep: 70, vault: 150000,
    desc: 'A drive, a garden, neighbours who blink once and move along.',
    upgrades: [
      { id: 'garden', name: 'Landscaped Garden', icon: '🌳', cost: 25000, happy: 18 },
      { id: 'motor', name: 'Electric Saloon', icon: '🚙', cost: 45000, happy: 20, vault: 0 },
      { id: 'housekeeper', name: 'Housekeeper', icon: '🧹', cost: 30000, happy: 22 }
    ] },
  { id: 'detached', name: 'Detached in the Ward', icon: '🏛️', price: 300000, happy: 260, upkeep: 150, vault: 400000,
    desc: 'Trees, gated automation and a drive long enough to hide a sprinter van.',
    upgrades: [
      { id: 'wing', name: 'New Wing', icon: '🏗️', cost: 90000, happy: 24 },
      { id: 'cellar', name: 'Converted Basement', icon: '🍷', cost: 70000, happy: 12, vault: 100000 },
      { id: 'chauffeur', name: 'Chauffeur', icon: '🧥', cost: 60000, happy: 26 }
    ] },
  { id: 'townhouse', name: 'Quartier Townhouse', icon: '🏦', price: 750000, happy: 330, upkeep: 300, vault: 1000000,
    desc: 'Tall frontage, four floors, lift to the master suite.',
    upgrades: [
      { id: 'library', name: 'Reading Room', icon: '📚', cost: 150000, happy: 28 },
      { id: 'billiard', name: 'Billiard Room', icon: '🎱', cost: 120000, happy: 26 },
      { id: 'strongroom', name: 'Strong Room', icon: '🏰', cost: 200000, happy: 0, vault: 250000 }
    ] },
  { id: 'country', name: 'Beltway Country Pile', icon: '🏞️', price: 2000000, happy: 420, upkeep: 600, vault: 3000000,
    desc: 'Twelve acres, a dark lake, and no neighbours in drone range.',
    upgrades: [
      { id: 'stables', name: 'Paddock & Horses', icon: '🐎', cost: 400000, happy: 32 },
      { id: 'orangery', name: 'Orangery', icon: '🍊', cost: 300000, happy: 30 },
      { id: 'garage', name: 'Motor Garage Block', icon: '🏎️', cost: 350000, happy: 28 }
    ] },
  { id: 'manor', name: 'The Heights Estate', icon: '🏰', price: 6000000, happy: 550, upkeep: 1500, vault: 10000000,
    desc: 'Old stone, new glass, and a concierge who remembers nothing.',
    upgrades: [
      { id: 'shoot', name: 'Clay Range', icon: '🦌', cost: 900000, happy: 34 },
      { id: 'gymroom', name: 'Private Gymnasium', icon: '🏋️', cost: 1200000, happy: 30, gymPct: 2 },
      { id: 'airfield', name: 'Helipad & Hangar', icon: '✈️', cost: 1500000, happy: 36 }
    ] }
];

// ---------------------------------------------------------------- MERITS
// Earned one per level. Spent permanently here.
const MERIT_PERKS = [
  { id: 'energy', name: 'Extra Energy', icon: '⚡', max: 10, desc: '+2 maximum energy' },
  { id: 'nerve', name: 'Extra Nerve', icon: '🧠', max: 5, desc: '+1 maximum nerve' },
  { id: 'life', name: 'Tougher Hide', icon: '❤️', max: 10, desc: '+20 maximum life' },
  { id: 'happy', name: 'Good Spirits', icon: '🙂', max: 5, desc: '+10 maximum happiness' },
  { id: 'gym', name: 'Gym Rat', icon: '🏋️', max: 10, desc: '+2% training gains' },
  { id: 'crime', name: 'Old Hand', icon: '🧢', max: 10, desc: '+1% crime success' },
  { id: 'mug', name: 'Heavy Handed', icon: '💰', max: 5, desc: '+3% taken when you mug someone' },
  { id: 'jail', name: 'Quiet Word', icon: '⚖️', max: 5, desc: '3% shorter sentences' }
];

// ---------------------------------------------------------------- THE EXCHANGE
// Six listed firms and two chain assets, walking a live tick. Prices live in the
// stock_prices table; the math lives in world.js.
const STOCKS = [
  { sym:'RZST', name:'Razor City Steel Works', icon:'\uD83C\uDFED', base:18.00,  vol:0.028, drift:0.0004, desc:'The last big furnace yard. Contracts solid, unions louder.' },
  { sym:'VLTX', name:'VoltEdge Energy Group',  icon:'\uD83D\uDD0C', base:64.50,  vol:0.034, drift:0.0006, desc:'Battery farms from here to the coast. Grid money, grid politics.' },
  { sym:'OMNI', name:'OmniChip Semiconductors',icon:'\uD83E\uDD16', base:142.00, vol:0.052, drift:0.0009, desc:'Fab cleanrooms and NDAs. The poster child until a fab coughs.' },
  { sym:'HRLW', name:'Harlow Freight Lines',   icon:'\uD83D\uDE9B', base:9.75,   vol:0.030, drift:0.0002, desc:'Five hundred box bodies and one very tired dispatch office.' },
  { sym:'BZRD', name:'Buzzard Media Group',    icon:'\uD83D\uDC41\uFE0F', base:33.25, vol:0.044, drift:0.0003, desc:'Streams the city back at itself. Clips, ads and influence.' },
  { sym:'SQRL', name:'Squirrel Foods',         icon:'\uD83D\uDC3F\uFE0F', base:11.80, vol:0.015, drift:0.0005, desc:'Owns half the snack aisles. Boring, defensive, forever.' }
];
const COINS = [
  { sym:'RZC', name:'RazorCoin',        icon:'\uD83E\uDE99', base:42.00, vol:0.075, drift:0.0008, desc:'The city coin, born on a forum and never left. Heavy hands.' },
  { sym:'NGT', name:'Nightshade Token', icon:'\uD83C\uDF19', base:3.50,  vol:0.115, drift:0.0010, desc:'Settlement token for people who do not ask questions. Mined by rigs.' }
];
const RIG_MINE_NGT_PER_HOUR = 0.05;

module.exports = { STOCKS, COINS, RIG_MINE_NGT_PER_HOUR, CRIMES, CRIME_CATS, ITEMS, GYMS, JOBS, ORIGINS, ACHIEVEMENTS, NEWS_FLAIR, PLACES, BOT_FIRST, BOT_LAST, COURSES, PROPERTIES, MERIT_PERKS };
