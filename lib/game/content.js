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
  { id:'drone_heist',   cat:'trick',  name:'Hijack the delivery drones mid-route',      nerve:4, req:{sp:48,dx:42}, base:58, cash:[3500,9000],    drop:[['neon_phone',10],['lockpicks',6]],        jail:[150,350], bust:'jail',
    lvl:5, tag:'pro',
    blurb:'The drone follows a route file, the route file follows a GPS whisper, and the whisper writes itself for a price.' },
  { id:'deepfake',      cat:'fraud',  name:'Deepfake the quarterly budget call',        nerve:5, req:{dx:64}, base:54, cash:[8000,22000],    drop:[['silk_laptop',10]],                        jail:[240,600], bust:'jail',
    lvl:7, tag:'pro',
    blurb:'The CFO\u2019s face, the CFO\u2019s voice, a nine-second clip. The wire room on the call was yours.' },
  { id:'smarthome',     cat:'theft',  name:'Peel the smart-home estates',        nerve:6, req:{sp:66,dx:60}, base:48, cash:[16000,42000],   drop:[['vault_watch',12],['crypto_rig',8]],       jail:[300,700], bust:'hospital',
    lvl:9, tag:'pro',
    blurb:'Twenty ways in when the door brain thinks it knows your walk. In and out between two cloud updates.' },
  { id:'stadium',       cat:'org',    name:'Siphon the stadium payroll vault',          nerve:9,  req:{st:60,de:55,dx:64}, base:36, cash:[90000,280000], drop:[['ice_ring',12],['pink_diamond',5]],  jail:[800,1600], bust:'hospital',
    lvl:20, tag:'legend',
    blurb:'Ten screens of cameras and a room of temporary staff. The payroll rig never leaves the ground floor.' },
  { id:'vault',         cat:'org',    name:'The exchange vault job',             nerve:10, req:{dx:95,sp:70,de:60}, base:30, cash:[160000,600000], drop:[['pink_diamond',25],['ice_ring',20]], jail:[1440,2880], bust:'hospital',
    lvl:26, tag:'legend',
    blurb:'The Wire Exchange vault: steel, glass and forty years of \u2018it cannot be done\u2019. One more try, then never again.' },
  // ---------------------------------------------------------------- HEISTS — three linked stages; break the chain, scatter the crew
  { id:'hs_cour_recon', cat:'heist',  name:'Mark the Exchange convoy',            nerve:3,  req:{dx:45,sp:44}, base:78, cash:[600,1500],          drop:[['lockpicks',5]],                        jail:[60,140],   bust:'jail',
    lvl:8,  tag:'heist', heist:{ group:'courier', gname:'the Exchange Run', step:1 },
    blurb:'Three nights on a rooftop off the ring road, counting drones and clock-watching the guard gap. Nothing sells yet — you are learning the shape of it.' },
  { id:'hs_cour_hit',   cat:'heist',  name:'Jam the drone cage',                  nerve:4,  req:{dx:52,de:30},  base:64, cash:[3000,7000],        drop:[['neon_phone',6]],                       jail:[200,420],  bust:'jail',
    lvl:10, tag:'heist', heist:{ group:'courier', gname:'the Exchange Run', step:2 },
    blurb:'Signal flood, forty seconds, two birds down in the alley fold. Everything after that is running.' },
  { id:'hs_cour_score', cat:'heist',  name:'Lift the Exchange vault',             nerve:6,  req:{dx:60,sp:55,de:45}, base:46, cash:[26000,72000], drop:[['crypto_rig',8]],                     jail:[600,1200], bust:'jail',
    lvl:14, tag:'heist', heist:{ group:'courier', gname:'the Exchange Run', step:3 },
    blurb:'The mag-lock costs a minute you do not have. Then the trolley is on the lift and the whole convoy ledger is yours.' },
  { id:'hs_led_recon',  cat:'heist',  name:'Trace the Ledger mesh',               nerve:4,  req:{dx:56},        base:74, cash:[900,2200],         drop:[],                                     jail:[90,200],   bust:'jail',
    lvl:10, tag:'heist', heist:{ group:'ledger', gname:'the Ghost Ledger', step:1 },
    blurb:'Six hops of municipal money that audit never reads twice. You map the notary nodes until the picture stops moving.' },
  { id:'hs_led_hit',    cat:'heist',  name:'Forge the notary key',                nerve:5,  req:{dx:62,sp:50},  base:58, cash:[4200,9800],        drop:[['silk_laptop',4]],                    jail:[300,600],  bust:'jail',
    lvl:12, tag:'heist', heist:{ group:'ledger', gname:'the Ghost Ledger', step:2 },
    blurb:'A reclaimed stamp, a clean shell, and one hour where the vault believes you are the mayor of somewhere.' },
  { id:'hs_led_score',  cat:'heist',  name:'Drift the Ghost Ledger',              nerve:7,  req:{dx:70,de:52,sp:58}, base:42, cash:[38000,96000], drop:[['crypto_rig',10]],                  jail:[700,1500],  bust:'jail',
    lvl:16, tag:'heist', heist:{ group:'ledger', gname:'the Ghost Ledger', step:3 },
    blurb:'Seventeen transfers inside the night batch, each one too dull to read twice. By morning the ledger forgets the money ever had owners.' },
  { id:'hs_crn_recon',  cat:'heist',  name:'Scratch the Penthouse AI',            nerve:5,  req:{sp:60,dx:58},  base:70, cash:[1200,3000],        drop:[['vault_watch',4]],                    jail:[120,260],  bust:'jail',
    lvl:12, tag:'heist', heist:{ group:'crown', gname:'the Crown Suite', step:1 },
    blurb:'The house AI quotes poetry and locks doors. You teach it one new habit, politely, through the maintenance hatch.' },
  { id:'hs_crn_hit',    cat:'heist',  name:'Ride the service spine',              nerve:6,  req:{st:20,sp:66,dx:62}, base:54, cash:[5600,13000], drop:[['lockpicks',5]],                     jail:[400,900],  bust:'jail',
    lvl:14, tag:'heist', heist:{ group:'crown', gname:'the Crown Suite', step:2 },
    blurb:'Up the laundry shaft with a cart of pressed shirts, one heartbeat per floor window.' },
  { id:'hs_crn_score',  cat:'heist',  name:'Clean the Crown Suite',               nerve:8,  req:{dx:78,sp:70,st:55}, base:38, cash:[58000,150000], drop:[['pink_diamond',8],['ice_ring',8]], jail:[900,1800],  bust:'jail',
    lvl:18, tag:'heist', heist:{ group:'crown', gname:'the Crown Suite', step:3 },
    blurb:'Two cases of other people\u2019s winter, down the same spine. The suite wakes up light; you wake up a story nobody can prove.' },
  // ---------------------------------------------------------------- 2026 STREET ADDITIONS
  { id:'scooter_ring',  cat:'theft',  name:'Lift e-scooters off the racks',       nerve:1,  req:{sp:16,dx:14}, base:80, cash:[140,540],      drop:[['scrap_metal',18]],                    jail:[10,30],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'One bolt cutter, one blanket, one app that never notices the GPS going dark.' },
  { id:'cat_strip',     cat:'theft',  name:'Strip catalytics in the long-stay',   nerve:2,  req:{dx:30,sp:26}, base:68, cash:[800,2900],     drop:[['scrap_metal',14],['rare_cat',6]],     jail:[40,110],  bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Ninety seconds under a hatchback. The metal in the pipe is worth more than the pipe\u2019s opinions.' },
  { id:'cable_pull',    cat:'theft',  name:'Pull copper off the substation site', nerve:2,  req:{st:26,sp:22}, base:70, cash:[550,2100],     drop:[['scrap_metal',22]],                    jail:[35,95],   bust:'jail',
    lvl:2, tag:'entry',
    blurb:'The site sleeps at 3am. The cable does not weigh itself.' },
  { id:'contactless',   cat:'fraud',  name:'Clone contactless taps',              nerve:1,  req:{dx:24}, base:78, cash:[260,980],       drop:[['neon_phone',6]],                      jail:[20,55],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'A reader in a backpack, a crowded carriage, and forty small taps that never happened to you.' },
  { id:'depot_boost',   cat:'theft',  name:'Boost a pallet from the depot',       nerve:3,  req:{st:34,sp:30}, base:62, cash:[2200,8200],    drop:[['sneaker_box',12],['pixelbox_x',8]],   jail:[80,200],  bust:'jail',
    lvl:4, tag:'entry',
    blurb:'Hi-vis, clipboard, confidence. The gate waves you through and the pallet is simply yours now.' },
  { id:'vape_warehouse',cat:'black',  name:'Raid the vape warehouse',             nerve:3,  req:{sp:38,st:26}, base:60, cash:[2600,9000],    drop:[['crate_vape',10]],                     jail:[100,260], bust:'jail',
    lvl:5, tag:'pro',
    blurb:'Ten thousand flavours, one open loading bay, and a van with very neutral plates.' },
  { id:'sim_swap',      cat:'trick',  name:'The SIM-swap shuffle',                nerve:3,  req:{dx:50,de:20}, base:58, cash:[3200,11000],   drop:[['silk_laptop',6]],                     jail:[120,300], bust:'jail',
    lvl:6, tag:'pro',
    blurb:'A polite call to the carrier, a forwarded number, and suddenly every 2FA code texts you.' },
  { id:'watch_flip',    cat:'black',  name:'Fence the grey-market watch lot',     nerve:2,  req:{de:28,dx:24}, base:72, cash:[900,3400],     drop:[['vault_watch',10]],                    jail:[45,120],  bust:'jail',
    lvl:3, tag:'entry',
    blurb:'No papers, no box, no questions. Time moves differently for these ones.' },
  // ---- THE MINT DROP — a fourth three-stage heist
  { id:'hs_mint_recon', cat:'heist',  name:'Case the Mint merch drop',            nerve:4,  req:{sp:62,dx:60},  base:72, cash:[1400,3400],        drop:[['sneaker_box',6]],                    jail:[130,280],   bust:'jail',
    lvl:13, tag:'heist', heist:{ group:'mint', gname:'the Mint Drop', step:1 },
    blurb:'A pop-up, a queue of bots, and a cash van that leaves at nine sharp. You count everything twice.' },
  { id:'hs_mint_hit',   cat:'heist',  name:'Blind the pop-up cameras',            nerve:5,  req:{dx:66,de:40},  base:56, cash:[6200,14000],       drop:[['crypto_rig',4]],                     jail:[420,900],   bust:'jail',
    lvl:15, tag:'heist', heist:{ group:'mint', gname:'the Mint Drop', step:2 },
    blurb:'Forty seconds of looped footage. The cameras dream of an empty room while you walk the corridor.' },
  { id:'hs_mint_score', cat:'heist',  name:'Take the Mint Drop float',            nerve:7,  req:{dx:74,sp:68,de:50}, base:40, cash:[64000,160000], drop:[['pink_diamond',6],['ice_ring',10]],  jail:[950,1900],  bust:'jail',
    lvl:19, tag:'heist', heist:{ group:'mint', gname:'the Mint Drop', step:3 },
    blurb:'The float never makes the bank run. Somewhere between queue and cash-desk it simply chooses a new owner.' },
];

const CRIME_CATS = {
  theft:  { name:'Theft & Dip',        icon:'\uD83C\uDFA9' },
  fraud:  { name:'Fraud & Forge',      icon:'\uD83E\uDDFE' },
  black:  { name:'Black Market',       icon:'\uD83D\uDEEB\uFE0F' },
  trick:  { name:'Sharp Practice',     icon:'\uD83C\uDFB2' },
  heat:   { name:'Strong-Arm Work',    icon:'\uD83E\uDE91' },
  org:    { name:'Big Jobs',           icon:'\uD83C\uDFED\uFE0F' },
  heist:  { name:'Three-Stage Heists', icon:'\uD83C\uDFAF' },
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
  neon_syrup: { name:'Neon Syrup',          icon:'\uD83E\uDDEA', type:'use',  buy:0,     sell:900,   effect:{happy:35, energy:5},  desc:'Glows faintly in the bottle. Huge lift, tiny kicker. +35 happy, +5 energy.' },
  volt_salt:  { name:'Volt Salt',           icon:'\u26A1',        type:'use',  buy:0,     sell:1200,  effect:{nerve:6},            desc:'Sniffed off a battery terminal, allegedly. +6 nerve on the spot.' },
  glasswing:  { name:'Glasswing',           icon:'\uD83E\uDEB8', type:'boost',buy:0,     sell:1500,  boost:{stat:'sp', mult:1.15, min:10}, desc:'A decal that hums against the skin. +15% speed for ten minutes.' },
  g9_pistol:  { name:'GT-9 Compact',        icon:'\uD83D\uDD2B', type:'gear', buy:9000,   sell:3600,  equip:{slot:'weapon', atk:15}, desc:'A tidy nine that never jams when it matters. +15% attack strength while carried.' },
  sawn_12:    { name:'Ironbridge 12G',      icon:'\uD83D\uDD2B', type:'gear', buy:22000,  sell:8800,  equip:{slot:'weapon', atk:28}, desc:'Short, loud, persuasive. +28% attack strength while carried.' },
  x7_carbine: { name:'X-7 Patrol Carbine',  icon:'\uD83D\uDE94', type:'gear', buy:65000,  sell:26000, equip:{slot:'weapon', atk:45}, desc:'Police-marked, twice erased. +45% attack strength while carried.' },
  longline_sr:{ name:'Longline LR-308',     icon:'\uD83C\uDFAF', type:'gear', buy:150000, sell:60000, equip:{slot:'weapon', atk:65}, desc:'Two junctions away and already certain. +65% attack strength while carried.' },
  kevlar_s1:  { name:'Soft Kevlar Liner',   icon:'\uD83E\uDDBA', type:'gear', buy:7000,   sell:2800,  equip:{slot:'armour', def:15}, desc:'Sits invisible under a track top. +15% defense while worn.' },
  plate_l3:   { name:'Level III Plate Carrier', icon:'\uD83D\uDEE1\uFE0F', type:'gear', buy:26000, sell:10400, equip:{slot:'armour', def:30}, desc:'Ceramic front, ceramic back. +30% defense while worn.' },
  riot_shell: { name:'TPS Riot Shell',      icon:'\uD83D\uDC82', type:'gear', buy:80000,  sell:32000, equip:{slot:'armour', def:45}, desc:'Built for baton rounds and worse. +45% defense while worn.' },
  // ---------------- 2026 ADDITIONS ----------------
  scrap_metal:  { name:'Scrap Metal',        icon:'\u2699\uFE0F', type:'loot', sell:220,   desc:'Copper, alloy and patience. The craft bench turns this into something.' },
  rare_cat:     { name:'Rare Cat Core',      icon:'\uD83E\uDDF2', type:'loot', sell:3400,  desc:'Precious metals in a honeycomb sleeve. Refiners pay well.' },
  crate_vape:   { name:'Crate of Vapes',     icon:'\uD83D\uDCA8', type:'loot', sell:5200,  desc:'Ten thousand puffs of questionable mango. Moves fast at the bazaar.' },
  sneaker_box:  { name:'Deadstock Sneakers', icon:'\uD83D\uDC5F', type:'loot', sell:4800,  desc:'Still in the box, tags on. The resale chat is already pinging.' },
  car_part:     { name:'Stripped Car Parts', icon:'\uD83D\uDD29', type:'loot', sell:1900,  desc:'Alternator, ECU, mirrors. The chop shop buys these by the armful.' },
  street_drone: { name:'Delivery Drone',     icon:'\uD83E\uDE82', type:'loot', sell:7200,  desc:'Slightly confused about its employer. Yours now.' },
  lucky_charm:  { name:'Lucky Charm',        icon:'\uD83C\uDF40', type:'boost', buy:4200,  sell:900, boost:{stat:'de', mult:1.25, min:30}, desc:'Rabbit\u2019s foot, red string, zero logic. +25% defense for 30 minutes.' },
  focus_pill:   { name:'Focus Tabs',         icon:'\uD83E\uDDE0', type:'boost', buy:4800,  sell:1100, boost:{stat:'dx', mult:1.3, min:20}, desc:'Clean, legal, effective. +30% dexterity for 20 minutes.' },
  energy_shot:  { name:'Triple-Shot Energy', icon:'\u26A1',        type:'use', buy:420,   sell:90,  effect:{energy:14, happy:4}, desc:'Three espressos in a bottle. +14 energy.' },
  protein_box:  { name:'Meal-Prep Box',      icon:'\uD83C\uDF71', type:'use', buy:640,   sell:140, effect:{energy:18, happy:10, life:12}, desc:'Chicken, rice, broccoli. The gym religion\u2019s holy wafer. +18 energy, +12 life.' },
  zen_tea:      { name:'Ceremonial Tea Set', icon:'\uD83C\uDF75', type:'use', buy:980,   sell:210, effect:{happy:55, nerve:2}, desc:'Slow ritual, deep calm. +55 happy, +2 nerve.' },
  xp_chip:      { name:'XP Overclock Chip',  icon:'\uD83D\uDCBE', type:'boost', buy:16000, sell:3600, boost:{stat:'xp', mult:2, min:60}, desc:'Double XP gains for 60 minutes. The grind, accelerated.' },
  respec_token: { name:'Identity Rewrite',   icon:'\uD83D\uDCDD', type:'use', buy:60000, sell:12000, effect:{respec:true}, desc:'Use it to redistribute every stat point you have ever earned.' },
  scratch_card: { name:'Scratch Card',       icon:'\uD83C\uDFAB', type:'use', buy:500,   sell:60,  effect:{scratch:true}, desc:'Nine panels, three matching symbols wins. Use it to scratch.' },
  lottery_ticket:{ name:'Lottery Ticket',    icon:'\uD83C\uDF9F\uFE0F', type:'use', buy:1000, sell:10, effect:{lottery:true}, desc:'One entry in tonight\u2019s city draw. Use it to register your numbers.' },
  mystery_box:  { name:'Mystery Box',        icon:'\uD83C\uDF81', type:'use', buy:2500,  sell:400, effect:{mystery:true}, desc:'Taped shut, smells of opportunity. Use it to open.' },
  fish_cod:     { name:'Canal Cod',          icon:'\uD83D\uDC1F', type:'loot', sell:340,  desc:'Surprisingly edible. The chippy buys these no questions.' },
  fish_pike:    { name:'Old Lock Pike',      icon:'\uD83C\uDFA3', type:'loot', sell:900,  desc:'Fifty years old and angry. Restaurants pay for the story.' },
  fish_boot:    { name:'Leather Boot',       icon:'\uD83E\uDD7E', type:'loot', sell:20,   desc:'You caught a boot. The canal mocks you.' },
  fish_diamond: { name:'River Bling',        icon:'\uD83D\uDC8E', type:'loot', sell:22000,desc:'Someone\u2019s regret, now your retirement fund.' },
  vinyl_classic:{ name:'Classic Vinyl',      icon:'\uD83D\uDCBF', type:'loot', sell:2600, desc:'First pressing, mint sleeve. Collectors fight over this.' },
  retro_console:{ name:'Retro Console',      icon:'\uD83D\uDD79\uFE0F', type:'loot', sell:1700, desc:'Two controllers, forty memories.' },
  spray_can:    { name:'Crate of Spray Cans',icon:'\uD83D\uDD8C\uFE0F', type:'loot', buy:800, sell:300, desc:'Fat caps, loud colours. Street art needs ammunition.' },
  gig_poster:   { name:'Gig Poster Stack',   icon:'\uD83C\uDFB8', type:'loot', sell:120, desc:'Some band\u2019s big night. Paper sells.' },
  gold_lighter: { name:'Gold Lighter',       icon:'\uD83D\uDD25', type:'loot', sell:1100, desc:'Engraved initials you will never read out loud.' },
  designer_shades:{ name:'Designer Shades',  icon:'\uD83D\uDD76\uFE0F', type:'loot', sell:1500, desc:'Real ones this time. The case proves it.' },
  trading_pack: { name:'Trading Card Pack',  icon:'\uD83C\uDFB4', type:'use', buy:900,   sell:120, effect:{cardpack:true}, desc:'Five random cards. Chase the holographic wire-rider.' },
  insurance_pol:{ name:'Protection Policy',  icon:'\uD83D\uDCDC', type:'use', buy:25000, sell:4000, effect:{insure:true}, desc:'One week of capped losses: muggings can\u2019t take more than 2% of your cash.' },
  // collectible streetwear drops (happiness + clout; sell if you must)
  drop_hoodie:  { name:'Drop: Ghost Hoodie',    icon:'\uD83D\uDCE6', type:'loot', sell:8500,  desc:'Limited run, 200 made. Your clout purrs.' },
  drop_kicks:   { name:'Drop: Wire Runners',    icon:'\uD83D\uDC5F', type:'loot', sell:12000, desc:'The pair the whole city queued for. You didn\u2019t queue.' },
  drop_jacket:  { name:'Drop: Chrome Bomber',   icon:'\uD83E\uDDE5', type:'loot', sell:15000, desc:'Reflective shell, numbered tag. Pure flex.' },
  drop_cap:     { name:'Drop: Halo Cap',        icon:'\uD83E\uDDE2', type:'loot', sell:6000,  desc:'Six panels of pure status.' },
};

// ---------------------------------------------------------------- GYMS
const GYMS = [
  { id:'abandoned_gym', name:'The Underpass Gym', lvl:1, desc:'Pillars, a chain-hung bag and a boat-load of echo. No mirrors, no fob needed.' },
  { id:'boxing_club',   name:'Crown Park Boxing Club', lvl:8, desc:'Blood on the boards, trophies in the lobby. The bouncer is blind to faces by arrangement.' },
  { id:'synth_fit',     name:'Foundry Performance Lab', lvl:16, desc:'Paid members only, biometric door, supplements fridge. Serious people before serious work.' },
  { id:'iron_cathedral',name:'The Iron Cathedral', lvl:24, desc:'A converted chapel, plates older than the congregation. Where the town\u2019s monsters are made.' },
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
  { id:'streamer',       name:'Stream Moderator', minLvl:6, tier:'blue', base:540, desc:'Ban bots, time raids, keep chat civil. The streamer never knows your name.' },
  { id:'forklift',       name:'Warehouse Forklift Ace', minLvl:10, tier:'blue', base:980, desc:'Certified. The pallets obey you. Occasionally you misplace one, professionally.' },
  { id:'barback',        name:'Nightclub Barback', minLvl:14, tier:'blue', base:1400, desc:'Ice, glassware, and seeing everything. Tips are excellent, witnesses optional.' },
];

// ---------------------------------------------------------------- ORIGINS
const ORIGINS = [
  { id:'street',  name:'Estate Runner',   icon:'\uD83E\uDDE2', stat:'sp', bonus:8,  trait:'+8 starting Speed. Every stairwell, alley and cycle cut in the postal district is yours.', starter:['volt_cola','volt_cola','thick_wallet'] },
  { id:'schemer', name:'Odds Runner',icon:'\uD83E\uDDFE', stat:'dx', bonus:8, trait:'+8 starting Dexterity. You can count a punt, a wallet and a quick escape in the same breath.', starter:['black_espr','black_espr'] },
  { id:'bruiser', name:'Yard Fighter',icon:'\uD83E\uDD4A', stat:'st', bonus:8, trait:'+8 starting Strength. Warehouse shifts by day, cage side-bouts by night.', starter:['diesel_shake','rainy_ale'] },
  { id:'hacker',  name:'Forum Ghost',  icon:'\uD83C\uDFA9', stat:'de', bonus:8, trait:'+8 starting Defense. Three handles, two VPNs, and a door nobody\u2019s ever knocked on.', starter:['black_espr','volt_cola'] },
  { id:'wheel',   name:'Wheel Runner', icon:'\uD83C\uDFCD\uFE0F', stat:'sp', bonus:8, trait:'+8 starting Speed. Raised on a pillion seat; every getaway route is muscle memory.', starter:['energy_shot','energy_shot'] },
  { id:'clout',   name:'Content Kid',  icon:'\uD83D\uDCF1', stat:'dx', bonus:8, trait:'+8 starting Dexterity. Ten thousand followers, zero income, one ring light. Starts with a head-start on clout.', starter:['neon_phone','scratch_card'] },
];

// ---------------------------------------------------------------- ACHIEVEMENTS
const ACHIEVEMENTS = {
  first_crime:     { name:'First Dip',            icon:'\uD83C\uDF1F', desc:'Do your first job.' },
  ten_crimes:      { name:'Slippery Fingers',     icon:'\uD83E\uDDB5', desc:'Do 10 jobs.' },
  fifty_crimes:    { name:'A Seasoned Crim',      icon:'\uD83C\uDFC6', desc:'Do 50 jobs.' },
  big_payout:      { name:'Big Score',            icon:'\uD83E\uDE99', desc:'Pocket $10,000+ from one job.' },
  heist_done:      { name:'The Clean Sweep',      icon:'\uD83C\uDFAF', desc:'Close all three stages of a heist chain.' },
  richer:          { name:'The War Chest',        icon:'\uD83D\uDCB0', desc:'Hold $100,000 to your name.' },
  rich:            { name:'King of the Town',     icon:'\uD83C\uDFAF', desc:'Hold $1,000,000 to your name.' },
  level5:          { name:'Getting Known',        icon:'\u2B50', desc:'Reach level 5.' },
  level10:         { name:'Man of the Town',      icon:'\uD83D\uDC51', desc:'Reach level 10.' },
  level20:         { name:'Boss of the Town',     icon:'\uD83D\uDC51', desc:'Reach level 20.' },
  first_win:       { name:'First Fist',           icon:'\u26D4', desc:'Win your first fight.' },
  five_wins:       { name:'Hard Knuckles',        icon:'\uD83E\uDD3B', desc:'Win 5 fights.' },
  hitlist:         { name:'Feared',               icon:'\uD83D\uDE91', desc:'Win 25 fights.' },
  jailbird:        { name:'First Time Down',      icon:'\uD83D\uDE8C', desc:'Get put inside for the first time.' },
  sweatshop:       { name:'Clean Sheets',         icon:'\uD83D\uDEE1\uFE0F', desc:'Clock 60 laundry shifts behind bars.' },
  escape_artist:   { name:'Through the Bars',     icon:'\uD83D\uDD27', desc:'Bust out of a cell once.' },
  survivor:        { name:'Back on Your Feet',    icon:'\uD83C\uDF96\uFE0F', desc:'Survive your first trip to A&E.' },
  jobber:          { name:'Honest Hours',         icon:'\uD83D\uDCBC', desc:'Work 20 shifts at any job.' },
  faction:         { name:'The Crew',             icon:'\uD83E\uDE92', desc:'Join or found a gang.' },
  casino:          { name:'Beat the House',       icon:'\uD83D\uDCB0', desc:'Win a bet at the casino.' },
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
  // ---------------- 2026 feats ----------------
  arcade_shark:    { name:'Arcade Shark',          icon:'\uD83C\uDFAE', desc:'Win 25 rounds in the Arcade.' },
  scratch_lucky:   { name:'Scratch & Win',         icon:'\uD83C\uDFAB', desc:'Hit three matching symbols on a scratch card.' },
  mines_clear:     { name:'Diamond Nerves',        icon:'\uD83D\uDCA3', desc:'Cash out a full 12-tile board in Mines.' },
  plinko_jackpot:  { name:'Plinko Prophet',        icon:'\uD83D\uDD34', desc:'Land the centre 10\u00D7 slot on Plinko.' },
  buzz_master:     { name:'Steady Hands',          icon:'\u26A1', desc:'Clear the Buzz Wire without a single touch.' },
  safecracker:     { name:'Vault Whisperer',       icon:'\uD83D\uDD10', desc:'Crack a length-8 safe sequence.' },
  memory_perfect:  { name:'Photographic',          icon:'\uD83E\uDDE0', desc:'Clear Memory in 12 flips or fewer.' },
  fisherman:       { name:'Rod & Line',            icon:'\uD83C\uDFA3', desc:'Catch 10 fish from the canal.' },
  big_fish:        { name:'The Old Lock Pike',     icon:'\uD83E\uDD88', desc:'Land something legendary from the canal.' },
  salvager:        { name:'Skip Diver',            icon:'\uD83D\uDDD1\uFE0F', desc:'Run 20 salvage sweeps.' },
  gig_worker:      { name:'Hustle Culture',        icon:'\uD83D\uDCE6', desc:'Finish 15 odd jobs.' },
  courier:          { name:'Same-Day Legend',       icon:'\uD83D\uDE9A', desc:'Complete 10 courier runs.' },
  plasma_veins:    { name:'Veins of Gold',         icon:'\uD83E\uDE78', desc:'Donate plasma five times.' },
  guinea_pig:      { name:'Guinea Pig',            icon:'\uD83E\uDDEA', desc:'Survive three clinical trials.' },
  busker:          { name:'Street Soul',           icon:'\uD83C\uDFB7', desc:'Busk 10 sets.' },
  storage_wars:    { name:'Unit Winner',           icon:'\uD83D\uDCE6', desc:'Open a storage unit worth more than you paid.' },
  drop_collector:  { name:'Hype Beast',            icon:'\uD83D\uDD25', desc:'Own all four limited drops at once.' },
  influencer:      { name:'Verified',              icon:'\uD83D\uDCF8', desc:'Reach 10,000 followers.' },
  super_influencer:{ name:'The Algorithm Loves You',icon:'\uD83C\uDF1F', desc:'Reach 100,000 followers.' },
  street_artist:   { name:'Ghost Writer',          icon:'\uD83C\uDFA8', desc:'Tag 10 walls across the districts.' },
  car_owner:       { name:'Keys to the City',      icon:'\uD83D\uDE97', desc:'Buy your first car.' },
  car_flipper:     { name:'Chop Shop Regular',     icon:'\uD83D\uDD27', desc:'Strip five cars for parts.' },
  race_winner:     { name:'Pink Slips',            icon:'\uD83C\uDFC1', desc:'Win 10 street races.' },
  turf_lord:       { name:'Turf Lord',             icon:'\uD83D\uDDFA\uFE0F', desc:'Hold three districts at once.' },
  crafter:         { name:'Bench Boss',            icon:'\uD83D\uDEE0\uFE0F', desc:'Craft 10 items at the bench.' },
  lottery_winner:  { name:'Numbers Up',            icon:'\uD83C\uDFB0', desc:'Win the city lottery.' },
  staked:          { name:'Cold Storage',          icon:'\uD83E\uDDCA', desc:'Stake 1,000 NGT.' },
  dividends:       { name:'Passive Income',        icon:'\uD83D\uDCB9', desc:'Collect your first dividend payout.' },
  insured:         { name:'Fully Covered',         icon:'\uD83D\uDCDC', desc:'Take out a protection policy.' },
  gifted:          { name:'The Giver',             icon:'\uD83C\uDF81', desc:'Gift an item to another citizen.' },
  friend_of_all:   { name:'Connected',             icon:'\uD83E\uDD1D', desc:'Add five friends.' },
  collector16:     { name:'Museum Grade',          icon:'\uD83C\uDFDB\uFE0F', desc:'Own 30 different items at once.' },
  hundred_crimes:  { name:'A Century of Sin',      icon:'\uD83D\uDE08', desc:'Do 100 jobs.' },
  heist_trifecta:  { name:'Chain Breaker',         icon:'\uD83D\uDD17', desc:'Close four different heist chains.' },
  mint_drop:       { name:'The Mint Drop',         icon:'\uD83C\uDFE6', desc:'Close every stage of the Mint Drop.' },
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
    grant: { marketFee: -1 }, grantText: '1% lower trading fees' },
  // ---------------- 2026 catalogue ----------------
  { id: 'cybersec', name: 'Applied Cyber-Security', icon: '🛡️', cost: 180000, minutes: 420,
    desc: 'Pentesting, social engineering defence, and which cameras are decorative.',
    req: { level: 6 },
    grant: { crimePct: 2, jailPct: -5 }, grantText: '+2% crime success, 5% shorter sentences' },
  { id: 'socialeng', name: 'Social Engineering', icon: '🎭', cost: 95000, minutes: 240,
    desc: 'People are the vulnerability. Confidence, uniforms and the right clipboard.',
    grant: { dx: 3, crimePct: 1 }, grantText: '+3 Dexterity, +1% crime success' },
  { id: 'dronepilot', name: 'Drone Piloting & Route Ops', icon: '🛸', cost: 70000, minutes: 200,
    desc: 'Licence, flight paths, and which corridors the scanners never watch.',
    grant: { sp: 3, maxEnergy: 2 }, grantText: '+3 Speed, +2 maximum energy' },
  { id: 'urbex', name: 'Urban Exploration', icon: '🧗', cost: 50000, minutes: 180,
    desc: 'Every city has a second map: roofs, tunnels and the doors between.',
    req: { level: 4 },
    grant: { sp: 2, st: 2, jailPct: -5 }, grantText: '+2 Speed, +2 Strength, 5% shorter sentences' }
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
    ] },
  { id: 'penthouse', name: 'Glass Quarter Penthouse', icon: '🌆', price: 3200000, happy: 480, upkeep: 900, vault: 5000000,
    desc: 'Forty floors up, the sirens sound like weather. Floor-to-ceiling everything.',
    upgrades: [
      { id: 'pool', name: 'Rooftop Pool', icon: '🏊', cost: 500000, happy: 30 },
      { id: 'studio', name: 'Streaming Studio', icon: '🎙️', cost: 420000, happy: 26, cloutPct: 25 },
      { id: 'garagebox', name: 'Private Parking Deck', icon: '🅿️', cost: 380000, happy: 20 }
    ] },
  { id: 'compound', name: 'The Compound', icon: '🛰️', price: 14000000, happy: 700, upkeep: 3000, vault: 25000000,
    desc: 'Walls, jammers, a gatehouse with teeth. The town\u2019s final address.',
    upgrades: [
      { id: 'ops', name: 'Operations Room', icon: '🖥️', cost: 2000000, happy: 30, crimePct: 1 },
      { id: 'medbay', name: 'Private Med Bay', icon: '🏥', cost: 1600000, happy: 28 },
      { id: 'vaultdoor', name: 'Bank-Grade Vault', icon: '🚪', cost: 2400000, happy: 0, vault: 15000000 }
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
  { id: 'jail', name: 'Quiet Word', icon: '⚖️', max: 5, desc: '3% shorter sentences' },
  // ---------------- 2026 perks ----------------
  { id: 'staker', name: 'Yield Farmer', icon: '🧊', max: 5, desc: '+10% staking yield on locked NGT' },
  { id: 'gigolo', name: 'Rolodex', icon: '📋', max: 3, desc: '+1 odd-job slot on the gig board' },
  { id: 'angler', name: 'Canal Whisperer', icon: '🎣', max: 5, desc: '+6% better catches when fishing' },
  { id: 'hype', name: 'Hype Machine', icon: '📸', max: 5, desc: '+10% followers from every post' },
  { id: 'grease', name: 'Grease Monkey', icon: '🔧', max: 5, desc: '+6% chop shop payouts' }
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

// ---------------- THE WIRE PASS (weekly subscription) ----------------
const WIRE_PASS = {
  price: 150000, days: 7,
  buffs: { energyRegenMult: 1.6, maxEnergy: 25, maxNerve: 5, crimePct: 8, gymPct: 15, feeMult: 0.5 },
  founders: ['ghost', 'killa1979', 'easybake'] // usernames, case-insensitive -> permanent pass
};

// ---------------- FACTION UPGRADES (paid from the gang bank) ----------------
const FACTION_UPGRADES = [
  { id:'muscle',      icon:'\uD83D\uDCAA', name:'Muscle Network',  cost:250000, desc:'Corners held by the whole crew. +6% crime success for every member.' },
  { id:'burner_ring', icon:'\uD83D\uDCE1', name:'Burner Ring',     cost:200000, desc:'Real-time eyes on every fight. +8% battle attack for every member.' },
  { id:'kevlar_net',  icon:'\uD83E\uDEA8', name:'Kevlar Network',  cost:200000, desc:'Plate gets where it needs to be. +8% battle defence for every member.' },
  { id:'dentist',     icon:'\uD83E\uDDB7', name:'The Dentist',     cost:300000, desc:'A fixer who pulls strings on sentencing. -15% jail time for every member.' },
  { id:'stash_house', icon:'\uD83C\uDFE0', name:'Stash Houses',    cost:150000, desc:'More floors, more soldiers. +10 member capacity.' }
];
const FACTION_MEMBER_CAP = 10;

// ---------------- CORNER SHOPS (per-player daily stock) ----------------
const SHOPS = [
  { id:'allnight', icon:'\uD83C\uDFEA', name:'The All-Night', area:'East Side', blurb:'Open when nothing else is. The man behind the counter has seen everything twice.',
    stock:[ {item:'volt_cola',  qty:6, mult:1.10}, {item:'lockpicks', qty:3, mult:1.15}, {item:'neon_syrup', qty:2, price:2600} ] },
  { id:'halogen',  icon:'\uD83D\uDCA1', name:'Halogen Lights', area:'North End', blurb:'A light shop that sells very little light after midnight.',
    stock:[ {item:'neon_syrup', qty:3, price:2500}, {item:'volt_salt', qty:2, price:3400}, {item:'thick_wallet', qty:1, mult:1.20} ] },
  { id:'wingstop', icon:'\uD83E\uDEB8', name:'The Wing Stop', area:'Red Mile', blurb:'No food. You knew that before you walked in.',
    stock:[ {item:'glasswing', qty:2, price:4300}, {item:'volt_salt', qty:3, price:3300}, {item:'neon_syrup', qty:2, price:2800} ] }
];

// ---------------- GARAGE — cars, stats drive street races ----------------
const CARS = [
  { id:'city_runabout', name:'City Runabout',     icon:'\uD83D\uDE97', price:18000,   spd:52, grp:48, desc:'Four wheels, an MOT, and ambition.' },
  { id:'hot_hatch',     name:'Hot Hatch GT',      icon:'\uD83D\uDE99', price:46000,   spd:64, grp:66, desc:'Corner mischief, factory warranty voided.' },
  { id:'drift_coupe',   name:'Drift Coup\u00E9',  icon:'\uD83D\uDE98', price:88000,   spd:72, grp:78, desc:'Sideways is a lifestyle.' },
  { id:'muscle_v8',     name:'Muscle V8',         icon:'\uD83D\uDEFB', price:135000,  spd:84, grp:60, desc:'Quarter-mile theology. Loud.' },
  { id:'euro_rs',       name:'Euro RS Spec',      icon:'\uD83C\uDFCE\uFE0F', price:240000, spd:90, grp:84, desc:'German precision, local intent.' },
  { id:'street_king',   name:'Street King Widebody', icon:'\uD83D\uDE93', price:420000, spd:95, grp:88, desc:'Wide arches, wider reputation.' },
  { id:'hyper_wire',    name:'Hyper Wire EV',     icon:'\u26A1',        price:850000, spd:99, grp:92, desc:'Instant torque, zero noise, all business.' },
  { id:'ghost_proto',   name:'Ghost Prototype',   icon:'\uD83D\uDC7B', price:2200000, spd:100, grp:97, desc:'Technically not street legal anywhere. Yet.' }
];
// Street-race opponents scale to your garage; names for the wire.
const RACE_OPPONENTS = ['Kestrel', 'Bolt-Jaw', 'Miss Shift', 'The Warden', 'Slipstream', 'Redline Rae', 'Torque', 'Half-Mile Haze'];

// ---------------- ODD JOBS (the gig board) ----------------
const GIGS = [
  { id:'move_sofa',   icon:'\uD83D\uDECB\uFE0F', name:'Help move a sofa (4 floors, no lift)', cash:[600,900],   energy:8,  desc:'It pivots. It does not fit. You carry it anyway.' },
  { id:'queue',       icon:'\uD83E\uDDCD', name:'Queue for a sneaker drop',        cash:[500,800],   energy:6,  desc:'Six hours on pavement. Bring a chair; bring nothing, actually.' },
  { id:'dog_walk',    icon:'\uD83D\uDC15', name:'Walk three large dogs',           cash:[420,700],   energy:5,  desc:'They walk you.' },
  { id:'flyers',      icon:'\uD83D\uDCE2', name:'Hand out club flyers',            cash:[380,600],   energy:5,  desc:'Smile. Rejected. Smile. Rejected. Paid.' },
  { id:'wash_windows',icon:'\uD83E\uDDFD', name:'Wash shopfront windows',          cash:[520,780],   energy:6,  desc:'Squeegee mastery is a transferable skill.' },
  { id:'assemble',    icon:'\uD83D\uDD28', name:'Assemble flat-pack furniture',    cash:[700,1000],  energy:8,  desc:'Eleven dowels remain. Nobody will ever know.' },
  { id:'dj_lift',     icon:'\uD83C\uDFA7', name:'Carry a DJ\u2019s decks upstairs',cash:[620,900],   energy:7,  desc:'Handle with fear. The bass is fragile.' },
  { id:'catering',    icon:'\uD83C\uDF7D\uFE0F', name:'Catering shift, canap\u00E9s',cash:[560,840], energy:6,  desc:'Eat nothing. You will eat everything.' }
];

// ---------------- CRAFT BENCH RECIPES ----------------
const RECIPES = [
  { id:'lockpicks',   out:'lockpicks',    qty:1, need:{ scrap_metal: 3 },            desc:'Five wafers from good scrap.' },
  { id:'boost_stim',  out:'stim',         qty:1, need:{ scrap_metal: 2, volt_cola: 4 }, desc:'Caffeine, chemistry, courage.' },
  { id:'car_part',    out:'car_part',     qty:2, need:{ scrap_metal: 5, rare_cat: 1 },   desc:'Refined into sellable parts.' },
  { id:'drone_fix',   out:'street_drone', qty:1, need:{ scrap_metal: 8, neon_phone: 2 }, desc:'Rebuild a drone from gutter tech.' },
  { id:'spray_crate', out:'spray_can',    qty:3, need:{ scrap_metal: 2, rainy_ale: 2 },  desc:'Cans, caps and courage.' },
  { id:'kevlar',      out:'kevlar_s1',    qty:1, need:{ scrap_metal: 12, car_part: 3 },  desc:'A liner that stops what needs stopping.' },
  { id:'charm',       out:'lucky_charm',  qty:1, need:{ fish_diamond: 1, gold_lighter: 1 }, desc:'Luck, assembled.' }
];

// ---------------- TURF — the eight districts ----------------
const DISTRICTS = [
  { id:'underpass',  name:'The Underpass',    icon:'\uD83C\uDF09', income:120,  minInfluence:50 },
  { id:'nightmarket',name:'The Night Market', icon:'\uD83C\uDFEE', income:260,  minInfluence:90 },
  { id:'glassq',     name:'Glass Quarter',    icon:'\uD83C\uDFD9\uFE0F', income:420, minInfluence:150 },
  { id:'foundry',    name:'Foundry Row',      icon:'\uD83C\uDFED', income:600,  minInfluence:220 },
  { id:'halo',       name:'Halo Heights',     icon:'\uD83C\uDFE2', income:850,  minInfluence:320 },
  { id:'kingsway',   name:'Kingsway Docks',   icon:'\u2693',        income:1150, minInfluence:450 },
  { id:'redmile',    name:'The Red Mile',     icon:'\uD83D\uDEA8', income:1500, minInfluence:600 },
  { id:'exchange',   name:'The Exchange',     icon:'\uD83C\uDFE6', income:2200, minInfluence:800 }
];
const TURF = { claimCost: 40, attackCost: 90, attackChance: 0.5, incomeHours: 4, maxHoldSolo: 3 };

// ---------------- SNEAKER & DROP ROTATION ----------------
const DROP_POOL = ['drop_hoodie', 'drop_kicks', 'drop_jacket', 'drop_cap'];
const SNEAKER_DROP_PRICE = { drop_hoodie: 22000, drop_kicks: 34000, drop_jacket: 46000, drop_cap: 15000 };

// ---------------- TITLES (rep ranks, shown next to your name) ----------------
const TITLES = [
  { rep: 0,       name: 'Newcomer' },
  { rep: 250,     name: 'Known Face' },
  { rep: 1000,    name: 'Street Name' },
  { rep: 3000,    name: 'Wire Favourite' },
  { rep: 8000,    name: 'Yard Boss' },
  { rep: 20000,   name: 'City Villain' },
  { rep: 50000,   name: 'The Blueprint' },
  { rep: 120000,  name: 'Living Legend' },
  { rep: 300000,  name: 'Mayor of the Night' }
];

// ---------------- CHAT EMOTES ----------------
const EMOTES = ['\uD83D\uDE0E', '\uD83D\uDD25', '\uD83D\uDC80', '\uD83D\uDE4F', '\uD83D\uDC40', '\uD83E\uDD2B', '\uD83D\uDCB8', '\uD83E\uDD4A', '\uD83D\uDE94', '\uD83C\uDFC6', '\uD83D\uDE24', '\uD83E\uDD1D'];

// ---------------- CITY EVENTS (rotate, claimable while live) ----------------
const EVENTS = [
  { id:'scrap_rush',  icon:'\u2699\uFE0F', name:'Scrap Rush',       desc:'Salvage pays double.', dur: 15, perk: 'salvage2x' },
  { id:'fish_bite',   icon:'\uD83C\uDFA3', name:'The Canal Is Thick',desc:'Fish are biting hard.', dur: 15, perk: 'fish2x' },
  { id:'quiet_cops',  icon:'\uD83D\uDE93', name:'Quiet Shift',      desc:'Crime feels safer tonight.', dur: 12, perk: 'crime2x' },
  { id:'hype_drop',   icon:'\uD83D\uDD25', name:'Surprise Drop',    desc:'Clout posts hit harder.', dur: 12, perk: 'clout2x' }
];

// ---------------- MISSION BOARD ----------------
const MISSIONS = [
  { id:'m_firstblood', icon:'\uD83D\uDDE1\uFE0F', name:'First Blood Money', need:3, stat:'crimes',   desc:'Pull 3 successful jobs. Show the city you mean it.', reward:{cash:15000, xp:60} },
  { id:'m_stall',      icon:'\uD83C\uDFEA', name:'Moving Product',          need:1, stat:'sold',     desc:'Shift 1 lot through your bazaar stall while you sleep.', reward:{cash:20000, xp:80} },
  { id:'m_paper',      icon:'\uD83D\uDCC8', name:'Paper Hands No More',     need:1, stat:'stocks',   desc:'Buy your first share on the Exchange.', reward:{cash:10000, xp:50} },
  { id:'m_bruiser',    icon:'\uD83E\uDD4A', name:'The Bruiser',             need:3, stat:'wins',     desc:'Put 3 fighters on the ground.', reward:{cash:30000, xp:120} },
  { id:'m_longcon',    icon:'\uD83D\uDD78\uFE0F', name:'The Long Con',     need:4, stat:'missions', chain:['m_firstblood','m_stall','m_paper','m_bruiser'], desc:'Finish every job on this board. The Wire remembers.', reward:{cash:250000, xp:800, item:'crypto_rig'} },
  // ---------------- 2026 board postings ----------------
  { id:'m_gig',        icon:'\uD83D\uDCE6', name:'Honest-ish Work',      need:5,  stat:'gigs',    desc:'Finish 5 odd jobs from the gig board.', reward:{cash:18000, xp:90} },
  { id:'m_fish',       icon:'\uD83C\uDFA3', name:'Canal Diet',           need:5,  stat:'fish',    desc:'Land 5 catches from the canal.', reward:{cash:15000, xp:80} },
  { id:'m_arcade',     icon:'\uD83C\uDFAE', name:'Quarter King',         need:10, stat:'arcade',  desc:'Win 10 rounds in the Arcade.', reward:{cash:30000, xp:140, item:'scratch_card'} },
  { id:'m_race',       icon:'\uD83C\uDFC1', name:'No Brakes',            need:3,  stat:'races',   desc:'Win 3 street races. Any car counts.', reward:{cash:45000, xp:160} },
  { id:'m_clout',      icon:'\uD83D\uDCF8', name:'Go Viral',             need:1000, stat:'clout', desc:'Reach 1,000 followers on the feed.', reward:{cash:25000, xp:120, item:'neon_phone'} },
  { id:'m_wire26',     icon:'\uD83C\uDF06', name:'The New Wire',         need:6,  stat:'missions2', chain:['m_gig','m_fish','m_arcade','m_race','m_clout'], desc:'Clear the whole 2026 board. The city pays attention.', reward:{cash:500000, xp:1500, item:'drop_kicks'} }
];

module.exports = { STOCKS, COINS, WIRE_PASS, FACTION_UPGRADES, FACTION_MEMBER_CAP, SHOPS, MISSIONS, RIG_MINE_NGT_PER_HOUR, CRIMES, CRIME_CATS, ITEMS, GYMS, JOBS, ORIGINS, ACHIEVEMENTS, NEWS_FLAIR, PLACES, BOT_FIRST, BOT_LAST, COURSES, PROPERTIES, MERIT_PERKS,
  CARS, RACE_OPPONENTS, GIGS, RECIPES, DISTRICTS, TURF, DROP_POOL, SNEAKER_DROP_PRICE, TITLES, EMOTES, EVENTS };
