// Razor Town — content database (1920s Birmingham flavor)
// A 1920s Birmingham razor-gang life of crime. Original names & fiction,
// styled after the era (flat caps, smoke, brass, bookmakers, canal whisky).
'use strict';

// ---------------------------------------------------------------- CRIMES
// req: recommended stat floor. base = success % when you meet it.
const CRIMES = [
  { id:'shoplift',      cat:'theft',  name:'Dip the market stalls',         nerve:1,  req:{dx:8},   base:88, cash:[40,150],        drop:[['neon_phone',3],['volt_cola',8]],      jail:[8,20],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'A coat slung over the arm, a wandering hand. The stallholder never feels a thing.' },
  { id:'snatch',        cat:'theft',  name:'Snatch a bag on the tram',       nerve:1,  req:{sp:12,dx:10}, base:78, cash:[90,330],    drop:[['thick_wallet',25]],                    jail:[15,40],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Jump on, grab, jump off. The tram grinds on and the lady is left clutching air.' },
  { id:'pickpocket',    cat:'theft',  name:'Dip pockets at the races',       nerve:1,  req:{dx:18}, base:74, cash:[120,520],     drop:[['vault_watch',4],['thick_wallet',15]],  jail:[10,30],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Racing men keep their wallets where they can feel them. That is your job — and theirs is your business.' },
  { id:'fence',         cat:'theft',  name:'Fence goods behind the pub',     nerve:1,  req:{de:8},  base:86, cash:[150,620],     drop:[],                                    jail:[5,15],   bust:'jail',
    lvl:1, tag:'petty',
    blurb:'The landlord takes a cut, asks no names, and keeps the whisky flowing while you talk.' },
  { id:'burglary',      cat:'theft',  name:'Burgle a terrace house',         nerve:2,  req:{sp:24,dx:26}, base:66, cash:[500,1900],  drop:[['pixelbox_x',10],['gold_chain',8],['vault_watch',6]], jail:[45,120], bust:'jail',
    lvl:2, tag:'entry',
    blurb:'Two-up two-down in the back streets. The family\'s at the Saturday matinee — you have an hour.' },
  { id:'car_jack',      cat:'theft',  name:'Steal a motor car',              nerve:3,  req:{sp:40,dx:35,st:15}, base:58, cash:[1400,5200], drop:[['lockpicks',18],['crypto_rig',4]],   jail:[90,240], bust:'jail',
    lvl:4, tag:'entry',
    blurb:'Crank the engine, mind the dogs, and pray the hill is downhill. A new Austin means a new life.' },
  { id:'card_skim',     cat:'fraud',  name:'Short-change the shopkeepers',   nerve:1,  req:{dx:20}, base:80, cash:[220,900],      drop:[['thick_wallet',10],['neon_phone',5]],   jail:[25,60],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Buy a newspaper, confuse the change, pocket the difference. It adds up quicker than honest wages.' },
  { id:'fake_id',       cat:'fraud',  name:'Forge the documents',            nerve:2,  req:{dx:32}, base:70, cash:[700,2600],     drop:[],                                        jail:[60,150], bust:'jail',
    lvl:2, tag:'entry',
    blurb:'A reference from a dead man, a rubber stamp from a pawned firm. The factory gatekeeper never checks twice.' },
  { id:'invoice',       cat:'fraud',  name:'Run the shell books',            nerve:3,  req:{dx:38}, base:64, cash:[1600,6000],    drop:[['silk_laptop',6]],                        jail:[90,200], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Three invoices for coal that was never delivered, to a mill that was never there. Paper is the honest con.' },
  { id:'tourist_scam',  cat:'fraud',  name:'Monte on the race train',        nerve:1,  req:{sp:26,dx:30}, base:72, cash:[300,1100], drop:[['thick_wallet',12]],                     jail:[15,45],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'Three cards, one marked king, and a queue of gentlemen who are about to learn about country manners.' },
  { id:'booze_run',     cat:'black',  name:'Run whisky on the canal',        nerve:2,  req:{sp:30},  base:72, cash:[450,1700],    drop:[['noir_whisky',12],['rainy_ale',20]],     jail:[30,80],  bust:'jail',
    lvl:2, tag:'entry',
    blurb:'The narrowboat glides at dusk with a cargo that smells strongly of the distillery it never left.' },
  { id:'watches',       cat:'black',  name:'Shift knock-off pocket watches', nerve:2,  req:{de:20},  base:76, cash:[700,2400],    drop:[['vault_watch',8]],                        jail:[30,90],  bust:'jail',
    lvl:2, tag:'entry',
    blurb:'Swiss if you squint, Brummagem if you don\'t. The punters at the market squint wonderfully.' },
  { id:'corner_trade',  cat:'black',  name:'Work the corner book',           nerve:3,  req:{de:30,sp:20}, base:64, cash:[1800,6500], drop:[['happy_caps',12],['spike',3]],           jail:[90,240], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Take the bets, keep the runners straight, and keep one eye down the street for the peelers.' },
  { id:'smuggle',       cat:'black',  name:'Run brandy past the dock watch', nerve:4,  req:{sp:52,de:34}, base:52, cash:[4500,16000], drop:[['spike',6],['crate_iron',8]],          jail:[180,420], bust:'hospital',
    lvl:6, tag:'pro',
    blurb:'Customs men watch the big ships. That is why you use the little rowboat and the fog.' },
  { id:'phish',         cat:'trick',  name:'The lonely-hearts letters',      nerve:1,  req:{dx:26}, base:80, cash:[250,1000],     drop:[['neon_phone',6],['silk_laptop',3]],      jail:[30,70],  bust:'jail',
    lvl:1, tag:'petty',
    blurb:'A wounded soldier needs help with his inheritance — he just needs a small loan first. Again.' },
  { id:'crypto_job',    cat:'trick',  name:'The oil-share swindle',          nerve:2,  req:{dx:44}, base:68, cash:[900,3800],     drop:[['crypto_rig',8],['silk_laptop',4]],       jail:[60,150], bust:'jail',
    lvl:3, tag:'entry',
    blurb:'Paper shares in a Texas oilfield that does not exist. The old women of Brum will thank you to be richer.' },
  { id:'bank_hack',     cat:'org',    name:'Empty the savings bank',         nerve:4,  req:{dx:70}, base:44, cash:[9000,32000],   drop:[['crypto_rig',20],['pink_diamond',2]],     jail:[240,600], bust:'hospital',
    lvl:8, tag:'pro',
    blurb:'A forged letter of introduction, a distracted clerk, and the vault key on the peg behind him.' },
  { id:'shakedown',     cat:'heat',   name:'Collect the street rents',       nerve:2,  req:{st:28,de:22}, base:72, cash:[600,2200], drop:[['thick_wallet',8]],                        jail:[20,60],  bust:'jail',
    lvl:2, tag:'petty',
    blurb:'Fire insurance. Breakage insurance. Polite-words insurance. The stallholders pay all three to you.' },
  { id:'enforcer',      cat:'heat',   name:'Lean on the slow payers',        nerve:3,  req:{st:42,de:34,sp:22}, base:64, cash:[1900,7000], drop:[['heavy_iron',6]],                   jail:[60,150], bust:'hospital',
    lvl:4, tag:'entry',
    blurb:'The ledger says three weeks overdue. The razor in the cap says you are here to settle the account.' },
  { id:'liquor_rob',    cat:'heat',   name:'Blag the corner off-licence',    nerve:3,  req:{sp:36,st:30}, base:60, cash:[2800,9500], drop:[['heavy_iron',8],['lockpicks',8]],        jail:[120,300], bust:'hospital',
    lvl:5, tag:'pro',
    blurb:'Three minutes from door to alley. The clerk knows the drill, and the camera is, regrettably, broken.' },
  { id:'gem_heist',     cat:'org',    name:'Blag the Jewellery Quarter coach', nerve:6, req:{sp:60,dx:58,st:30}, base:50, cash:[13000,48000], drop:[['pink_diamond',8],['ice_ring',15],['vault_watch',10]], jail:[360,900], bust:'hospital',
    lvl:10, tag:'pro',
    blurb:'The jewellers\' wagon takes the same route home every Friday. This Friday, you are waiting at the lights.' },
  { id:'armored',       cat:'org',    name:'Hold up the wages van',          nerve:8,  req:{st:55,de:50,sp:48}, base:40, cash:[42000,150000], drop:[['heavy_iron',15],['ice_ring',10]], jail:[600,1440], bust:'hospital',
    lvl:16, tag:'legend',
    blurb:'Every Friday the mills pay in cash. Two guards, one route, and a nation of men who want their Saturday night.' },
  { id:'vault',         cat:'org',    name:'The last vault job',             nerve:10, req:{dx:95,sp:70,de:60}, base:30, cash:[160000,600000], drop:[['pink_diamond',25],['ice_ring',20]], jail:[1440,2880], bust:'hospital',
    lvl:26, tag:'legend',
    blurb:'The Exchange Bank vault: iron, stone and sixty years of "it cannot be done." One more try, then never again.' },
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
  volt_cola:   { name:'Strong Working Tea', icon:'\uD83C\uDF75', type:'use', buy:120,  sell:30,  effect:{energy:6, happy:12}, desc:'Nursed in a chipped mug at the factory gate. +6 energy, +12 happy.' },
  black_espr:  { name:'Black Tea, No Sugar',icon:'\u2615', type:'use', buy:70,   sell:15,  effect:{energy:4, happy:6},  desc:'Two spoons, no nonsense. +4 energy.' },
  diesel_shake:{ name:'Meat Pie & Gravy',   icon:'\uD83E\uDD67',type:'use',buy:320,sell:70, effect:{energy:22,happy:18}, desc:'Suet crust, thick gravy, dignity optional. +22 energy.' },
  rainy_ale:   { name:'Bottle of Brown Ale', icon:'\uD83C\uDF7A', type:'use', buy:45,  sell:10, effect:{happy:28},          desc:'Warm, flat, and from the back of the off-licence. +28 happy.' },
  noir_whisky: { name:'Smuggled Whisky',    icon:'\uD83E\uDD43', type:'use', buy:240, sell:60, effect:{happy:70},          desc:'Twelve years in oak, no questions answered. +70 happy.' },
  champagne:   { name:'French Champagne',    icon:'\uD83C\uDF7E', type:'use', buy:900, sell:220,effect:{happy:150},         desc:'From the mayor\u2019s own cellar. He\u2019ll never miss it. +150 happy.' },
  happy_caps:  { name:'Dr. Bright\u2019s Pick-Me-Up', icon:'\uD83E\uDDEA', type:'use', buy:700, sell:180,effect:{happy:90},  desc:'Patent tonic, guaranteed to put a shine on your Monday. +90 happy.' },
  trauma_kit:  { name:'Doc\u2019s Kit',      icon:'\uD83D\uDEC9', type:'use', buy:1500,sell:380,effect:{life:100},          desc:'Bandages, iodine and a steady hand. Fully restores life.' },
  nerve_tab:   { name:'Chemist\u2019s Nerve Draught', icon:'\uD83E\uDDEA', type:'use', buy:6000,sell:1500,effect:{nerve:15}, desc:'Two fingers of steadiness from behind the counter. +15 nerve.' },
  spike:   { name:'Iron Tonic \u2014 Strength', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'st',mult:1.5,min:30}, desc:'Puts iron in the blood. Strength x1.5 for 30 minutes.' },
  stim:    { name:'Whippet Tonic \u2014 Speed', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'sp',mult:1.5,min:30}, desc:'Run like the dogs are behind you. Speed x1.5 for 30 minutes.' },
  cortex:  { name:'Fingersmith\u2019s Tonic \u2014 Dexterity', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'dx',mult:1.5,min:30}, desc:'Fingers quicker than the coppers\u2019 eyes. Dexterity x1.5 for 30 minutes.' },
  plating: { name:'Boxer\u2019s Tonic \u2014 Defense', icon:'\uD83D\uDC89', type:'boost', buy:5500, sell:1400, boost:{stat:'de',mult:1.5,min:30}, desc:'Bricks bounce off. Defense x1.5 for 30 minutes.' },
  thick_wallet:{ name:'Fat Wallet',  icon:'\uD83D\uDCB5', type:'loot', sell:160,  desc:'Swelled with Saturday takings. Fence it quick.' },
  neon_phone:  { name:'Silver Cigarette Case', icon:'\uD83D\uDEAC', type:'loot', sell:950,  desc:'Monogrammed, engraved, and freshly mislaid by a gentleman.' },
  silk_laptop: { name:'Tailored Suit',  icon:'\uD83E\uDDE5', type:'loot', sell:4100, desc:'Three-piece herringbone. Someone is attending a funeral in his shirtsleeves.' },
  pixelbox_x:  { name:'Ladies\u2019 Fur Stole', icon:'\uD83E\uDDE3', type:'loot', sell:1300, desc:'Warm, expensive, and about to be very "lost".' },
  crypto_rig:  { name:'Silver Tea Service', icon:'\uD83E\uDDD6\uFE0F', type:'loot', sell:9500, desc:'Twenty-two pieces, one monogram, a whole history.' },
  vault_watch: { name:'Gold Pocket Watch',   icon:'\u23F1\uFE0F', type:'loot', sell:2600, desc:'Wind it, set it, sell it before the owner winds the police.' },
  gold_chain:  { name:'Watch Chain',    icon:'\uD83D\uDD17', type:'loot', sell:1400, desc:'The kind that anchors a waistcoat \u2014 now anchor for your fortune.' },
  ice_ring:    { name:'Diamond Solitaire',  icon:'\uD83D\uDC8D', type:'loot', sell:16000, desc:'A stone that says "engagement". It is now saying "gone".' },
  pink_diamond:{ name:'The Crown Diamond',  icon:'\uD83D\uDC8E', type:'loot', sell:56000, desc:'Pink as a promise. Every fence in town wants a piece of it.' },
  lockpicks:   { name:'Skeleton Keys',  icon:'\uD83D\uDDDD\uFE0F', type:'loot', buy:1500, sell:600, desc:'Five keys, a hundred doors, no landlord\u2019s permission required.' },
  heavy_iron:  { name:'Open Razor',    icon:'\uD83E\uDE91', type:'loot', buy:6000, sell:2500, desc:'Strapped to a flat cap it commands respect. Sells quick at the yard.' },
  crate_iron:  { name:'Crate of Razors',icon:'\uD83D\uDCE6', type:'loot', sell:28000, desc:'A whole crate. You are, technically, an arsenal now.' },
};

// ---------------------------------------------------------------- GYMS
const GYMS = [
  { id:'abandoned_gym', name:'The Dugout Gym', lvl:1, desc:'A cellar, a punchbag, and a bell from a decommissioned mill. No mirrors, no nonsense.' },
  { id:'boxing_club',   name:'The Crown Boxing Hall', lvl:8, desc:'Blood on the boards and champions in the rafters. Run by an old pro with a short memory for faces.' },
  { id:'synth_fit',     name:'The Fives Court Athletic Rooms', lvl:16, desc:'Paid-up members only, warmed by gas lamps. The serious men train here before the serious work.' },
];

// ---------------------------------------------------------------- JOBS
const JOBS = [
  { id:'street_cleaner', name:'Corporation Night Crew', minLvl:1, tier:'blue',   base:180,  desc:'Sweep the streets while the town sleeps. Honest pay, terrible hours.' },
  { id:'diner',          name:'Corner Caf\u00E9 Kitchen', minLvl:1, tier:'blue',   base:150,  desc:'Bacon, bread and gossip. The regulars tip well when their wives aren\u2019t watching.' },
  { id:'grocery',        name:'Co-op Warehouseman', minLvl:2, tier:'blue',   base:260,  desc:'Third shift at the depot. Crates, tea breaks and no questions.' },
  { id:'taxi',           name:'Motor-Cab Driver', minLvl:4, tier:'blue',   base:420,  desc:'You drive, you listen, nobody asks where you went.' },
  { id:'casino',         name:'Racing Clerk', minLvl:8, tier:'blue',   base:760,  desc:'Keep the book at the betting shop. The house always wins; you get paid either way.' },
  { id:'hospital',       name:'Infirmary Porter', minLvl:12, tier:'blue',  base:1250, desc:'You see every kind of Saturday night. The nurses tell the best stories.' },
  { id:'tech',           name:'Exchange Engineer', minLvl:16, tier:'white', base:2100, desc:'Wire and repair the town\u2019s telephones. You leave a few lines unpatched. Professionally.' },
  { id:'law',            name:'Solicitor\u2019s Clerk', minLvl:20, tier:'white', base:3200, desc:'File the motions by day. Read the truly interesting files by night.' },
  { id:'army',           name:'Ex-Army Works Guard', minLvl:26, tier:'white', base:5200, desc:'Regimented, decorated, and very good at looking the other way for the right price.' },
];

// ---------------------------------------------------------------- ORIGINS
const ORIGINS = [
  { id:'street',  name:'Street Lad',   icon:'\uD83E\uDDE2', stat:'sp', bonus:8,  trait:'+8 starting Speed. You know every ginnel and shortcut between here and the canal.', starter:['volt_cola','volt_cola','thick_wallet'] },
  { id:'schemer', name:'Bookie\u2019s Clerk',icon:'\uD83E\uDDFE', stat:'dx', bonus:8, trait:'+8 starting Dexterity. You can count a punt, a wallet and a quick escape in the same breath.', starter:['black_espr','black_espr'] },
  { id:'bruiser', name:'Mill Pugilist',icon:'\uD83E\uDD4A', stat:'st', bonus:8, trait:'+8 starting Strength. Forty hours at the loom and still swinging at the bell.', starter:['diesel_shake','rainy_ale'] },
  { id:'hacker',  name:'The Sharper',  icon:'\uD83C\uDFA9', stat:'de', bonus:8, trait:'+8 starting Defense. A sharp suit, a sharper smile, and fists that have been tested.', starter:['black_espr','volt_cola'] },
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
};

// ---------------------------------------------------------------- NEWS flavor
const NEWS_FLAIR = [
  '{name} was seen leaving the betting shop with a grin like a razor.',
  'Scuffles reported near {place}. Nobody saw a thing, of course.',
  '{name} bought a round for the whole pub. Nobody asked where the money came from.',
  'The word on the street is that {name} is planning something big.',
  '{name} paid off a widow\u2019s rent. The neighbourhood is suddenly very loyal.',
  'A motor car was found abandoned by {place}. Registration plate filed off.',
];

const PLACES = ['the Bull Ring','the canal basin','Digbeth','the Rag Market','Aston','the Jewellery Quarter','Snow Hill station','the Custard Factory'];

// ---------------------------------------------------------------- BOT names (era citizens)
const BOT_FIRST = ['Archie','Bert','Cyril','Doris','Enoch','Flora','Gus','Hettie','Ivor','Jem','Kit','Lorna','Maude','Ned','Olive','Percy','Queenie','Ruby','Stan','Tilda','Vera','Wilf','Yvette','Zed','Clara','Frank','Gwen','Hugh','Ida','Jack','Kate','Len','Minnie'];
const BOT_LAST = ['Barker','Crow','Dalton','Fitch','Garvey','Hobbs','Ingram','Jakes','Kemp','Lucas','Marsh','Naylor','Oakes','Pargeter','Quick','Rudd','Stokes','Tarrant','Vale','Wright','Yardley','Moss','Perrin'];


// ---------------------------------------------------------------- EDUCATION
// Courses at the Digbeth Technical College. Timed, one at a time, and the
// grants are permanent — the classic way to grow a character between crimes.
const COURSES = [
  { id: 'bookkeeping', name: 'Bookkeeping & Ledgers', icon: '📒', cost: 5000, minutes: 45,
    desc: 'Double entry, petty cash and how to make a shortfall disappear.',
    grant: { crimePct: 1 }, grantText: '+1% crime success' },
  { id: 'shorthand', name: 'Pitman Shorthand', icon: '✍️', cost: 8000, minutes: 60,
    desc: 'Take a conversation down at the speed it happens.',
    grant: { dx: 3 }, grantText: '+3 Dexterity' },
  { id: 'carpentry', name: 'Carpentry & Joinery', icon: '🪚', cost: 12000, minutes: 90,
    desc: 'Tenons, jigs and doors that open when you want them to.',
    grant: { st: 4 }, grantText: '+4 Strength' },
  { id: 'driving', name: 'Motor Driving', icon: '🚗', cost: 30000, minutes: 150,
    desc: 'A motor car is a getaway and a weapon if you drive like the post office boys.',
    grant: { sp: 4, dx: 2 }, grantText: '+4 Speed, +2 Dexterity' },
  { id: 'firstaid', name: 'St John Ambulance First Aid', icon: '🩹', cost: 20000, minutes: 120,
    desc: 'Splints, stitches and staying conscious long enough to run.',
    grant: { jailPct: -15 }, grantText: '15% shorter sentences (you look after the guards too)' },
  { id: 'selfdefence', name: 'Boxing & Self Defence', icon: '🥊', cost: 35000, minutes: 180,
    desc: 'The man who can box is politely asked to leave the pub.',
    grant: { de: 5, gymPct: 2 }, grantText: '+5 Defence, +2% training gains' },
  { id: 'engineering', name: 'Mechanical Engineering', icon: '⚙️', cost: 90000, minutes: 300,
    desc: 'Lathes, boilers and the mathematics of swinging a heavy object.',
    grant: { gymPct: 3 }, grantText: '+3% training gains' },
  { id: 'chemistry', name: 'Industrial Chemistry', icon: '⚗️', cost: 65000, minutes: 240,
    desc: 'Acids, solvents and what not to mix in a shared kitchen.',
    grant: { crimePct: 3 }, grantText: '+3% crime success' },
  { id: 'accountancy', name: 'Accountancy', icon: '🧮', cost: 150000, minutes: 420,
    desc: 'Books that balance, and books that merely appear to.',
    req: { course: 'bookkeeping', level: 5 },
    grant: { crimePct: 2, bankPct: 1 }, grantText: '+2% crime success, +1% bank interest', }
,  { id: 'law', name: 'Law of Property', icon: '⚖️', cost: 200000, minutes: 480,
    desc: 'Deeds, leases and which magistrate takes a drink.',
    req: { course: 'shorthand', level: 5 },
    grant: { propDiscPct: 10, jailPct: -10 }, grantText: '10% off homes and upgrades, 10% shorter sentences' },
  { id: 'medicine', name: 'Medicine & Anatomy', icon: '🩺', cost: 260000, minutes: 540,
    desc: 'Where the bones are and how long a man stays down.',
    req: { course: 'firstaid', level: 8 },
    grant: { maxLife: 30 }, grantText: '+30 maximum life' },
  { id: 'navigation', name: 'Navigation & Telegraphy', icon: '🧭', cost: 120000, minutes: 300,
    desc: 'Morse, maps and the routes the canal boats do not declare.',
    req: { level: 4 },
    grant: { sp: 4, maxNerve: 1 }, grantText: '+4 Speed, +1 maximum nerve' },
  { id: 'physicalculture', name: 'Physical Culture', icon: '🤸', cost: 45000, minutes: 200,
    desc: 'Sandbags, Indian clubs and a cold bath every morning.',
    grant: { st: 3, maxEnergy: 4 }, grantText: '+3 Strength, +4 maximum energy' },
  { id: 'commercialfrench', name: 'Commercial French', icon: '🗼', cost: 40000, minutes: 180,
    desc: 'For the Belgians in the jewellery trade and the boatmen off the Seine.',
    grant: { marketFee: -1 }, grantText: '1% lower trading fees' }
];

// ---------------------------------------------------------------- PROPERTIES
// Where you live sets how happy you can get, how much you can keep in a safe,
// and how much the place costs you to run every week.
const PROPERTIES = [
  { id: 'shack', name: 'Back-to-back Terrace', icon: '🏚️', price: 0, happy: 100, upkeep: 0, vault: 0,
    desc: 'One up, one down, shared privy. It is yours.',
    upgrades: [
      { id: 'range', name: 'Kitchen Range', icon: '🔥', cost: 2000, happy: 10 },
      { id: 'bed', name: 'Clean Bedding', icon: '🛏️', cost: 1500, happy: 8 },
      { id: 'lock', name: 'Strong Door Lock', icon: '🔒', cost: 3000, happy: 4 }
    ] },
  { id: 'cottage', name: 'Canal-side Cottage', icon: '🏡', price: 5000, happy: 130, upkeep: 10, vault: 10000,
    desc: 'Coal fire, a yard for the washing, boats going past all night.',
    upgrades: [
      { id: 'stove', name: 'Modern Stove', icon: '🍳', cost: 4000, happy: 12 },
      { id: 'radio', name: 'Wireless Set', icon: '📻', cost: 6000, happy: 10 },
      { id: 'safe', name: 'Iron Safe', icon: '🗄️', cost: 8000, happy: 0, vault: 5000 }
    ] },
  { id: 'rooms', name: 'Digbeth Rooms', icon: '🏘️', price: 25000, happy: 160, upkeep: 25, vault: 50000,
    desc: 'Two rooms above a workshop. The noise stops at seven.',
    upgrades: [
      { id: 'bath', name: 'Bathroom Fitted', icon: '🛁', cost: 12000, happy: 14 },
      { id: 'piano', name: 'Second-hand Piano', icon: '🎹', cost: 20000, happy: 16 },
      { id: 'vault', name: 'Wall Safe', icon: '🔐', cost: 15000, happy: 0, vault: 25000 }
    ] },
  { id: 'semi', name: 'Semi-detached, Pershore Road', icon: '🏠', price: 75000, happy: 200, upkeep: 70, vault: 150000,
    desc: 'A garden, a garage, and neighbours who do not ask questions.',
    upgrades: [
      { id: 'garden', name: 'Laid-out Garden', icon: '🌳', cost: 25000, happy: 18 },
      { id: 'motor', name: 'Motor Car', icon: '🚙', cost: 45000, happy: 20, vault: 0 },
      { id: 'housekeeper', name: 'Housekeeper', icon: '🧹', cost: 30000, happy: 22 }
    ] },
  { id: 'detached', name: 'Detached House, Edgbaston', icon: '🏛️', price: 300000, happy: 260, upkeep: 150, vault: 400000,
    desc: 'Trees, iron gates, and a drive long enough to hide a van.',
    upgrades: [
      { id: 'wing', name: 'New Wing', icon: '🏗️', cost: 90000, happy: 24 },
      { id: 'cellar', name: 'Brick Cellar', icon: '🍷', cost: 70000, happy: 12, vault: 100000 },
      { id: 'chauffeur', name: 'Chauffeur', icon: '🧥', cost: 60000, happy: 26 }
    ] },
  { id: 'townhouse', name: "Townhouse, St Paul's", icon: '🏦', price: 750000, happy: 330, upkeep: 300, vault: 1000000,
    desc: 'Georgian frontage, four floors, a view of the church.',
    upgrades: [
      { id: 'library', name: 'Panelled Library', icon: '📚', cost: 150000, happy: 28 },
      { id: 'billiard', name: 'Billiard Room', icon: '🎱', cost: 120000, happy: 26 },
      { id: 'strongroom', name: 'Strong Room', icon: '🏰', cost: 200000, happy: 0, vault: 250000 }
    ] },
  { id: 'country', name: 'Country House, Sutton Coldfield', icon: '🏞️', price: 2000000, happy: 420, upkeep: 600, vault: 3000000,
    desc: 'Twelve acres, a lake, and no neighbours for a mile.',
    upgrades: [
      { id: 'stables', name: 'Stables & Horses', icon: '🐎', cost: 400000, happy: 32 },
      { id: 'orangery', name: 'Orangery', icon: '🍊', cost: 300000, happy: 30 },
      { id: 'garage', name: 'Motor Garage Block', icon: '🏎️', cost: 350000, happy: 28 }
    ] },
  { id: 'manor', name: 'The Manor, Solihull', icon: '🏰', price: 6000000, happy: 550, upkeep: 1500, vault: 10000000,
    desc: 'Tudor beams, a long drive, and staff who know nothing.',
    upgrades: [
      { id: 'shoot', name: 'Shooting & Coverts', icon: '🦌', cost: 900000, happy: 34 },
      { id: 'gymroom', name: 'Private Gymnasium', icon: '🏋️', cost: 1200000, happy: 30, gymPct: 2 },
      { id: 'airfield', name: 'Private Landing Strip', icon: '✈️', cost: 1500000, happy: 36 }
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

module.exports = { CRIMES, CRIME_CATS, ITEMS, GYMS, JOBS, ORIGINS, ACHIEVEMENTS, NEWS_FLAIR, PLACES, BOT_FIRST, BOT_LAST, COURSES, PROPERTIES, MERIT_PERKS };
