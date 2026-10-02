// TOUCHGRASS.EXE: every plant, every Scroller and every level.
//
// The rules are a lawn-defense classic's, number for number (costs, recharges, health, damage,
// speeds, which zombie does what). The names, looks and jokes are ours: the zombies are
// Scrollers, phone-addicted people shuffling across your lawn to get at your Wi-Fi.
//
// Units: time in seconds, distance in tiles (a lawn is 9 tiles wide), health in hit points
// (one pea = 20; a plain Scroller has 190: ten peas).

const FAST = 7.5
const SLOW = 30
const VSLOW = 50
/** How long a seed takes to recharge, and how long it's unavailable when a level starts. */
const charge = (recharge) => ({ recharge, start: recharge === FAST ? 0 : recharge === SLOW ? 20 : 35 })

// ================= Plants =================
// kind: what it does (the engine has a behaviour for each). Most plants have 300 health.
// mushroom: sleeps in daytime areas until woken by an Espresso Bean.
// aquatic: only on water. base: holds another plant (Float Lily on water, Clay Pot on the roof).
// shell: goes over another plant (Pumpkin Bunker). upgrade: only on top of that plant.
// lob: thrown over things (hits over shields, works from anywhere on the roof).
export const PLANTS = [
  // ---------- Day ----------
  { id: 'pea', name: 'Pea Spitter', cost: 100, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'pea' }], rate: 1.5,
    desc: 'Spits peas at whatever is coming down its lane.', damage: 'Normal', flavor: 'Has never once asked “who’s that” when its phone rang. It doesn’t have one.' },
  { id: 'sun', name: 'Sun Daisy', cost: 50, ...charge(FAST), hp: 300, kind: 'sun', amount: 25, every: 24, first: [3, 12.5],
    desc: 'Makes extra sun. The more of these, the more of everything else.', flavor: 'Wakes at 6, journals, makes sun. Annoying, frankly.' },
  { id: 'pom', name: 'Pomegranade', cost: 150, ...charge(VSLOW), hp: 300, kind: 'bomb', fuse: 1.2, area: 'square', radius: 1, damage: 1800,
    desc: 'Explodes, destroying every Scroller in the 3×3 around it.', flavor: 'Full of antioxidants. And shrapnel.' },
  { id: 'coco', name: 'Coco-Wall', cost: 50, ...charge(SLOW), hp: 4000, kind: 'wall', wall: true,
    desc: 'A very hard coconut. Scrollers chew on it while your plants get to work.', flavor: 'Has heard every “nuts” joke. Laughs anyway. Has to, really.' },
  { id: 'mine', name: 'Turnip Mine', cost: 25, ...charge(SLOW), hp: 300, kind: 'mine', arm: 15, damage: 1800,
    desc: 'Takes 15 seconds to arm, then explodes under the first Scroller to step on it.', flavor: 'Patience is a virtue. So is not standing on turnips.' },
  { id: 'frost', name: 'Frost Spitter', cost: 175, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'frost' }], rate: 1.5,
    desc: 'Frozen peas: they slow Scrollers down (walking and chewing) for 10 seconds.', flavor: 'Gets cold easily. Has turned it into a personality.' },
  { id: 'gulp', name: 'Gulp Trap', cost: 150, ...charge(FAST), hp: 300, kind: 'chomper', chew: 42,
    desc: 'Swallows a whole Scroller in front of it, then needs 42 seconds to digest.', flavor: 'Eats one meal a day. It’s a whole person.' },
  { id: 'double', name: 'Double Spitter', cost: 200, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'pea' }, { shot: 'pea', delay: 0.15 }], rate: 1.5,
    desc: 'Spits two peas at a time.', flavor: 'Says everything twice. Says everything twice.' },

  // ---------- Night ----------
  { id: 'puff', name: 'Puffball', cost: 0, ...charge(FAST), hp: 300, kind: 'shooter', mushroom: true, shots: [{ shot: 'spore' }], rate: 1.5, range: 3,
    desc: 'Free! Shoots short-range spores (3 tiles).', flavor: 'Free to play. Genuinely. No catch. It checked.' },
  { id: 'glow', name: 'Glowcap', cost: 25, ...charge(FAST), hp: 300, kind: 'sun', mushroom: true, amount: 15, grown: 25, grow: 120, every: 24, first: [3, 12.5],
    desc: 'Makes small sun at first, then normal sun once it grows up (2 minutes).', flavor: 'A late bloomer, its mum says. To everyone.' },
  { id: 'stink', name: 'Stinkhorn', cost: 75, ...charge(FAST), hp: 300, kind: 'fume', mushroom: true, rate: 1.5, reach: 4, damage: 20,
    desc: 'A cloud of fumes that hurts everything up to 4 tiles ahead, through shields.', flavor: 'Real mushroom. Real smell. Look it up. Actually, don’t.' },
  { id: 'gobbler', name: 'Grave Gobbler', cost: 75, ...charge(FAST), hp: 300, kind: 'gravebuster', mushroom: false, eat: 4.5,
    desc: 'Plant it on a gravestone to eat the gravestone.', flavor: 'Fiber is fiber.' },
  { id: 'swirl', name: 'Swirlcap', cost: 75, ...charge(SLOW), hp: 300, kind: 'hypno', mushroom: true,
    desc: 'The Scroller that eats it turns around and fights for you.', flavor: 'Explains the algorithm to whoever bites it. They log off for good.' },
  { id: 'shy', name: 'Shycap', cost: 25, ...charge(FAST), hp: 300, kind: 'shooter', mushroom: true, shots: [{ shot: 'spore' }], rate: 1.5, scared: true,
    desc: 'Long-range spores, but it hides when a Scroller gets close.', flavor: 'Prefers texting. To be fair, so do the Scrollers.' },
  { id: 'frostcap', name: 'Frostcap', cost: 75, ...charge(VSLOW), hp: 300, kind: 'freeze', mushroom: true, fuse: 1, freeze: 4, slow: 20, damage: 20,
    desc: 'Freezes every Scroller on screen for a few seconds, then slows them.', flavor: 'Cold as a read receipt.' },
  { id: 'cloud', name: 'Mushroom Cloud', cost: 125, ...charge(VSLOW), hp: 300, kind: 'bomb', mushroom: true, fuse: 1.2, area: 'circle', radius: 2.6, damage: 1800, crater: 180,
    desc: 'A huge explosion. Leaves a crater nothing can grow in for 3 minutes.', flavor: 'Overreacts. Constantly. Usefully.' },

  // ---------- Pool ----------
  { id: 'lily', name: 'Float Lily', cost: 25, ...charge(FAST), hp: 300, kind: 'base', base: 'water', aquatic: true,
    desc: 'Floats on water, so land plants can go on top of it.', flavor: 'Holds everyone up. Nobody asks how it’s doing.' },
  { id: 'zucchini', name: 'Zucchini Slam', cost: 50, ...charge(SLOW), hp: 300, kind: 'squash', damage: 1800,
    desc: 'Jumps on the first Scroller that comes near and flattens it.', flavor: 'Gym every day. Leg day twice.' },
  { id: 'triple', name: 'Triple Spitter', cost: 325, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'pea', lane: -1 }, { shot: 'pea', lane: 0 }, { shot: 'pea', lane: 1 }], rate: 1.5, lanes: [-1, 0, 1],
    desc: 'Spits peas down three lanes at once.', flavor: 'Three heads. One group chat. Constant arguing.' },
  { id: 'kelp', name: 'Grabby Kelp', cost: 25, ...charge(SLOW), hp: 300, kind: 'tangle', aquatic: true,
    desc: 'Drags the first Scroller that swims up to it underwater.', flavor: 'Just wants a hug. A long, wet one.' },
  { id: 'ghost', name: 'Ghost Pepper', cost: 125, ...charge(VSLOW), hp: 300, kind: 'bomb', fuse: 1, area: 'lane', damage: 1800,
    desc: 'Burns everything in its lane, end to end.', flavor: 'Rated 1,000,000 on the Scoville scale and “a bit much” on Yelp.' },
  { id: 'rug', name: 'Thorn Rug', cost: 100, ...charge(FAST), hp: 300, kind: 'spikes', damage: 20, every: 1, durability: 1, ground: true,
    desc: 'Hurts every Scroller walking over it. Pops tyres (and Slushmobiles).', flavor: 'Wipe your feet. Please. It’s begging.' },
  { id: 'tiki', name: 'Tiki Torch', cost: 175, ...charge(FAST), hp: 300, kind: 'torch',
    desc: 'Peas that pass through it catch fire and do double damage.', flavor: 'Hosted one luau in 2014. Still talks about it.' },
  { id: 'cocotower', name: 'Coco-Tower', cost: 125, ...charge(SLOW), hp: 8000, kind: 'wall', wall: true, tall: true,
    desc: 'A tall, very hard coconut. Nothing jumps or vaults over it.', flavor: 'Built different. Says so in its bio.' },

  // ---------- Fog ----------
  { id: 'seapuff', name: 'Sea Puff', cost: 0, ...charge(SLOW), hp: 300, kind: 'shooter', mushroom: true, aquatic: true, shots: [{ shot: 'spore' }], rate: 1.5, range: 3,
    desc: 'A Puffball that floats. Free, short range.', flavor: 'Moved to the coast for the lifestyle. Found Scrollers there too.' },
  { id: 'lantern', name: 'Bulb Lantern', cost: 25, ...charge(SLOW), hp: 300, kind: 'lantern', light: 2.2,
    desc: 'Lights up the fog around it so you can see what’s coming.', flavor: 'Brightens every room. In a literal, measurable way.' },
  { id: 'prickly', name: 'Prickly Pear', cost: 125, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'spike' }], rate: 1.5, popsBalloons: true,
    desc: 'Shoots spikes that also pop the drones Scrollers fly in on.', flavor: 'Not prickly, just has boundaries.' },
  { id: 'fan', name: 'Fan Clover', cost: 100, ...charge(FAST), hp: 300, kind: 'blower', fogClear: 20,
    desc: 'Blows every flying Scroller away and clears the fog for a while.', flavor: 'Four leaves. Five speed settings. Lucky.' },
  { id: 'back', name: 'Back Spitter', cost: 125, ...charge(FAST), hp: 300, kind: 'shooter', shots: [{ shot: 'pea' }, { shot: 'pea', back: true }, { shot: 'pea', back: true, delay: 0.15 }], rate: 1.5,
    desc: 'One pea forwards, two backwards.', flavor: 'Has eyes in the back of its head. And a mouth. It’s a lot.' },
  { id: 'anise', name: 'Star Anise', cost: 125, ...charge(FAST), hp: 300, kind: 'star', rate: 1.5, damage: 20,
    desc: 'Shoots stars in five directions.', flavor: 'Smells like Christmas. Shoots like a fireworks factory fire.' },
  { id: 'bunker', name: 'Pumpkin Bunker', cost: 125, ...charge(SLOW), hp: 4000, kind: 'shell', shell: true,
    desc: 'Goes around another plant and protects it. Scrollers have to get through this first.', flavor: 'Seasonal. Year-round.' },
  { id: 'magnet', name: 'Magnet Morel', cost: 100, ...charge(FAST), hp: 300, kind: 'magnet', mushroom: true, reach: 3.5, reload: 15,
    desc: 'Pulls metal off Scrollers: VR headsets, helmets, screens, ladders, pickaxes, pogo sticks.', flavor: 'Attracts the wrong people. Specifically, their stuff.' },

  // ---------- Roof ----------
  { id: 'lettuce', name: 'Lettuce Lobber', cost: 100, ...charge(FAST), hp: 300, kind: 'lobber', shot: 'lettuce', rate: 3,
    desc: 'Lobs lettuce over obstacles. Works anywhere on the roof.', flavor: 'Iceberg. Do not ask it about the Titanic.' },
  { id: 'pot', name: 'Clay Pot', cost: 25, ...charge(FAST), hp: 300, kind: 'base', base: 'roof',
    desc: 'Lets you plant on the roof (or on land, or on a Float Lily).', flavor: 'Hand-thrown. By someone who was very angry.' },
  { id: 'popcorn', name: 'Popcorn Lobber', cost: 100, ...charge(FAST), hp: 300, kind: 'lobber', shot: 'kernel', rate: 3,
    desc: 'Lobs kernels, and now and then a blob of caramel that sticks a Scroller in place.', flavor: 'Movie night every night. Nobody else picks the film.' },
  { id: 'espresso', name: 'Espresso Bean', cost: 75, ...charge(FAST), hp: 300, kind: 'coffee', onMushroom: true,
    desc: 'Plant it on a sleeping mushroom to wake it up.', flavor: 'Triple shot. Oat milk. Personality.' },
  { id: 'onion', name: 'Stinky Onion', cost: 50, ...charge(SLOW), hp: 400, kind: 'garlic',
    desc: 'Scrollers that bite it cry and switch lanes.', flavor: 'Has layers. Mostly tears.' },
  { id: 'parasol', name: 'Parasol Palm', cost: 100, ...charge(SLOW), hp: 300, kind: 'umbrella',
    desc: 'Shields the plants around it from thrown phones and bungee thieves.', flavor: 'Throws shade. Professionally.' },
  { id: 'gold', name: 'Gold Daisy', cost: 50, ...charge(SLOW), hp: 300, kind: 'marigold', every: 24, first: [10, 20],
    desc: 'Makes coins for Gary’s Garage Sale.', flavor: 'Pays for itself. Eventually. Probably.' },
  { id: 'melon', name: 'Melon Lobber', cost: 300, ...charge(FAST), hp: 300, kind: 'lobber', shot: 'melon', rate: 3,
    desc: 'Lobs heavy melons that also splash the Scrollers around the one they hit.', flavor: 'Summer in a sling. Concussions included.' },

  // ---------- Upgrades (Gary’s Garage Sale) ----------
  { id: 'quad', name: 'Quad Spitter', cost: 250, ...charge(FAST), hp: 300, kind: 'shooter', upgrade: 'double', shots: [0, 0.15, 0.3, 0.45].map((delay) => ({ shot: 'pea', delay })), rate: 1.5, shop: 5000,
    desc: 'Four peas at a time. Plant it on a Double Spitter.', flavor: 'Talks so fast the subtitles give up.' },
  { id: 'twin', name: 'Twin Daisy', cost: 150, ...charge(FAST), hp: 300, kind: 'sun', upgrade: 'sun', amount: 25, count: 2, every: 24, first: [3, 12.5], shop: 5000,
    desc: 'Twice the sun. Plant it on a Sun Daisy.', flavor: 'Two daisies, one stem, zero personal space.' },
  { id: 'gloom', name: 'Gloomcap', cost: 150, ...charge(FAST), hp: 300, kind: 'gloom', mushroom: true, upgrade: 'stink', rate: 1.5, damage: 20, shop: 7500,
    desc: 'Fumes in every direction, hitting everything around it. Plant it on a Stinkhorn.', flavor: 'Wears black. Listens to vinyl. You wouldn’t know the band.' },
  { id: 'bulrush', name: 'Bulrush', cost: 225, ...charge(FAST), hp: 300, kind: 'cattail', aquatic: true, upgrade: 'lily', rate: 1.5, shop: 10000,
    desc: 'Homing spikes at anything in any lane, drones included. Plant it on a Float Lily.', flavor: 'A pond’s idea of a sniper.' },
  { id: 'frostmelon', name: 'Frost Melon', cost: 200, ...charge(FAST), hp: 300, kind: 'lobber', shot: 'frostmelon', rate: 3, upgrade: 'melon', shop: 10000,
    desc: 'Frozen melons: splash damage that slows. Plant it on a Melon Lobber.', flavor: 'Brain freeze, delivered.' },
  { id: 'goldmagnet', name: 'Gold Magnet', cost: 50, ...charge(FAST), hp: 300, kind: 'goldmagnet', mushroom: true, upgrade: 'magnet', shop: 3000,
    desc: 'Collects coins and diamonds for you. Plant it on a Magnet Morel.', flavor: 'A finance bro, but useful.' },
  { id: 'thornrock', name: 'Thorn Rock', cost: 125, ...charge(SLOW), hp: 300, kind: 'spikes', upgrade: 'rug', damage: 40, every: 1, durability: 9, ground: true, shop: 7500,
    desc: 'Twice the damage of a Thorn Rug, and it survives 9 tyres. Plant it on a Thorn Rug.', flavor: 'A rug that went to the gym.' },
  { id: 'cannon', name: 'Kernel Cannon', cost: 500, ...charge(VSLOW), hp: 300, kind: 'cob', upgrade: 'popcorn', wide: 2, reload: 35, damage: 1800, shop: 20000,
    desc: 'Click it, then click anywhere: a giant corncob lands there and explodes. Plant it on two Popcorn Lobbers side by side.', flavor: 'Corn. Weaponised.' },
  { id: 'copycat', name: 'Copycat Sprout', cost: 0, ...charge(SLOW), hp: 300, kind: 'imitater', shop: 30000,
    desc: 'Pick it with another plant in the seed picker: it becomes a copy of that plant (in black and white).', flavor: 'Is literally just doing what you’re doing.' },
]
export const PLANT_BY_ID = Object.fromEntries(PLANTS.map((p) => [p.id, p]))
/** The order seeds appear in the picker and the Almanac. */
export const PLANT_ORDER = PLANTS.map((p) => p.id)

// ================= Scrollers =================
// hp: the Scroller itself. helmet: worn armour that takes every hit first (metal = a Magnet
// Morel can take it). shield: carried in front: it blocks straight shots from the front, but
// lobbed shots, fumes and shots from behind go round it.
// speed: tiles a second. points: how much of a wave it costs.
export const ZOMBIES = [
  { id: 'scroller', name: 'Scroller', hp: 190, speed: 0.21, points: 1, land: true,
    desc: 'Walks towards your house, phone first.', flavor: 'Hasn’t looked up since 2016. Wants your Wi-Fi password. Not in that order.' },
  { id: 'trend', name: 'Trend Setter', hp: 190, speed: 0.28, points: 1, land: true, flag: true,
    desc: 'Leads a huge wave of Scrollers, waving the hashtag everyone’s following today.', flavor: '#blessed #grind #lawn' },
  { id: 'beanie', name: 'Beanie Scroller', hp: 190, helmet: { hp: 370, metal: false, name: 'Beanie' }, speed: 0.21, points: 2, land: true,
    desc: 'The beanie soaks up about twice as much as a Scroller.', flavor: 'Wears it indoors. In July.' },
  { id: 'selfie', name: 'Selfie-Stick Scroller', hp: 340, speed: 0.42, points: 2, land: true, vaults: 'stick',
    desc: 'Runs, then vaults over the first plant it meets on its selfie stick. Then walks.', flavor: 'Got the shot. Lost the plot.' },
  { id: 'vr', name: 'VR Scroller', hp: 190, helmet: { hp: 1100, metal: true, name: 'VR headset' }, speed: 0.21, points: 4, land: true,
    desc: 'The VR headset makes it very hard to stop. It’s metal: magnets work.', flavor: 'Thinks your lawn is a metaverse. Charges you for it.' },
  { id: 'boomer', name: 'Boomer', hp: 190, shield: { hp: 150, metal: false, name: 'Newspaper' }, speed: 0.21, angrySpeed: 0.55, points: 2, land: true,
    desc: 'Reads a printed newspaper. Destroy it and he gets furious and fast.', flavor: 'Has opinions about phones. Is on his way to take yours.' },
  { id: 'bigscreen', name: 'Big-Screen Scroller', hp: 190, shield: { hp: 1100, metal: true, name: 'Big screen' }, speed: 0.21, points: 4, land: true,
    desc: 'Carries a TV that blocks peas. Fumes, lobs and magnets get round it.', flavor: 'Watches its own POV. On a 65-inch.' },
  { id: 'cryptobro', name: 'Crypto Bro', hp: 190, helmet: { hp: 1400, metal: true, name: 'Motorcycle helmet' }, speed: 0.42, points: 7, land: true,
    desc: 'Fast, and the helmet takes forever to get through. It’s metal.', flavor: 'Bought the dip. Is the dip.' },
  { id: 'dancer', name: 'Trend Dancer', hp: 340, speed: 0.33, points: 5, land: true, dancer: true,
    desc: 'Moonwalks in, then summons four Backup Dancers around it.', flavor: 'Has done this dance 4,000 times. Has 3 followers.' },
  { id: 'backup', name: 'Backup Dancer', hp: 190, speed: 0.33, points: 1, land: true, summoned: true,
    desc: 'Dances wherever the Trend Dancer says.', flavor: 'Paid in exposure.' },
  { id: 'floatie', name: 'Floatie Scroller', hp: 190, speed: 0.21, points: 1, water: true, floatie: true,
    desc: 'A Scroller in a flamingo float. Swims down the pool lanes.', flavor: 'Brought the phone in a ziplock bag. Big brain.' },
  { id: 'scuba', name: 'Scuba Scroller', hp: 340, speed: 0.21, points: 3, water: true, submerged: true,
    desc: 'Swims underwater (peas fly over it), and comes up to eat.', flavor: 'The phone is waterproof. The phone is everything.' },
  { id: 'slush', name: 'Slushmobile', hp: 1350, speed: 0.18, points: 7, land: true, vehicle: 'slush',
    desc: 'Runs over plants and leaves a trail of slush nothing can be planted on. Spikes pop it.', flavor: 'Blue raspberry. Unlicensed.' },
  { id: 'sled', name: 'Sled Squad', hp: 340, speed: 0.6, points: 3, land: true, sled: true,
    desc: 'Four Scrollers on a sled. Only comes down lanes with slush on them.', flavor: 'Synchronised. Unsupervised.' },
  { id: 'jetski', name: 'Jet-Ski Scroller', hp: 340, speed: 0.45, points: 3, water: true, vaults: 'jetski',
    desc: 'Races across the pool and jumps the first plant it meets.', flavor: 'Rented. Not returning it.' },
  { id: 'powerbank', name: 'Power Bank Scroller', hp: 340, speed: 0.42, points: 3, land: true, jack: true,
    desc: 'The swelling power bank explodes at a random moment, taking out the plants around it.', flavor: 'Charged it overnight, on the bed, under a pillow.' },
  { id: 'drone', name: 'Drone Scroller', hp: 190, balloon: 20, speed: 0.27, points: 2, land: true, flies: true,
    desc: 'Flies over your plants hanging off a drone. Prickly Pears, Bulrushes and Fan Clovers bring it down.', flavor: 'Delivery by air. Delivering itself.' },
  { id: 'miner', name: 'Crypto Miner', hp: 340, speed: 0.45, points: 4, land: true, digger: true,
    desc: 'Tunnels under your lawn with a (metal) pickaxe, then comes up behind your plants.', flavor: 'Mining. Literally. The blockchain was right there.' },
  { id: 'pogo', name: 'Pogo Streamer', hp: 340, speed: 0.33, points: 4, land: true, pogo: true,
    desc: 'Bounces over every plant. A Coco-Tower stops it, and a magnet takes the (metal) pogo stick.', flavor: 'Live 24/7. Bouncing for subs.' },
  { id: 'sasquatch', name: 'Sasquatch Scroller', hp: 1350, speed: 0.21, points: 4, land: true, rare: true,
    desc: 'Very rare. Very hairy. Drops diamonds.', flavor: 'Blurry in every photo. Uses the beauty filter anyway.' },
  { id: 'bungee', name: 'Bungee Thief', hp: 450, speed: 0, points: 3, land: true, bungee: true,
    desc: 'Drops from the sky and steals a plant. A Parasol Palm bounces it.', flavor: 'Saw it on a TikTok. Tried it on your lawn.' },
  { id: 'ladderguy', name: 'Ladder Guy', hp: 500, shield: { hp: 500, metal: true, name: 'Ladder' }, speed: 0.42, points: 4, land: true, ladder: true,
    desc: 'Leans a (metal) ladder on your walls so everyone can climb over them.', flavor: 'Says “trust me, I’m an engineer.” Is not.' },
  { id: 'flinger', name: 'Phone Flinger', hp: 850, speed: 0.3, points: 5, land: true, catapult: true, ammo: 20,
    desc: 'Flings old phones at the plant furthest back in its lane, then runs plants over.', flavor: 'Upgrades every year. Throws the old one at you.' },
  { id: 'gigachad', name: 'Gigachad', hp: 3000, speed: 0.15, points: 10, land: true, gargantuar: true,
    desc: 'Smashes plants flat with a phone mast. Hurt it enough and it throws its iPad Kid.', flavor: 'Never skips leg day, arm day, or doomscroll day.' },
  { id: 'ipadkid', name: 'iPad Kid', hp: 190, speed: 0.35, points: 2, land: true, small: true,
    desc: 'Thrown over your defences by a Gigachad.', flavor: 'Has been watching unboxing videos since birth.' },
  { id: 'algorithm', name: 'The Algorithm', hp: 40000, speed: 0, points: 0, boss: true,
    desc: 'The final boss, in a giant robot. Drops Scrollers, throws vans, and breathes fire and ice.', flavor: 'Knows what you want before you do. Wants your yard.' },
]
export const ZOMBIE_BY_ID = Object.fromEntries(ZOMBIES.map((z) => [z.id, z]))

// ================= Areas =================
export const AREAS = {
  day: { name: 'Front Yard', rows: 5, water: [], night: false, fog: 0, roof: false, sky: true },
  night: { name: 'Front Yard at Night', rows: 5, water: [], night: true, fog: 0, roof: false, sky: false },
  pool: { name: 'Backyard Pool', rows: 6, water: [2, 3], night: false, fog: 0, roof: false, sky: true },
  fog: { name: 'Backyard Fog', rows: 6, water: [2, 3], night: true, fog: 4, roof: false, sky: false },
  roof: { name: 'Roof', rows: 5, water: [], night: false, fog: 0, roof: true, sky: true },
}

// ================= Levels =================
// waves: how many waves (every 10th is a huge wave, with a Trend Setter; wave n is worth
// floor(n × 0.8) + 1 points of Scrollers, × 2.5 for a huge one). power: smaller waves (the first levels). unlock: the plant you win. lanes: which rows Scrollers use (the first levels are
// narrower). special: the odd levels out.
const L = (id, area, opts) => ({ id, area, waves: 10, power: 1, lanes: null, graves: 0, sunStart: 50, ...opts })
export const LEVELS = [
  // Day
  L('1-1', 'day', { waves: 4, power: 0.6, zombies: ['scroller'], lanes: [2], sod: [2], unlock: 'sun', plants: ['pea'] }),
  L('1-2', 'day', { waves: 6, power: 0.7, zombies: ['scroller'], lanes: [1, 2, 3], sod: [1, 2, 3], unlock: 'pom' }),
  L('1-3', 'day', { waves: 8, power: 0.8, zombies: ['scroller', 'beanie'], lanes: [1, 2, 3], sod: [1, 2, 3], intro: 'beanie', unlock: 'coco' }),
  L('1-4', 'day', { waves: 10, power: 0.9, zombies: ['scroller', 'beanie'], unlock: 'mine', reward: 'shovel' }),
  L('1-5', 'day', { special: 'bowling', waves: 10, zombies: ['scroller', 'beanie'], unlock: 'frost', title: 'Coconut Bowling' }),
  L('1-6', 'day', { waves: 10, zombies: ['scroller', 'beanie', 'selfie'], intro: 'selfie', unlock: 'gulp' }),
  L('1-7', 'day', { waves: 10, zombies: ['scroller', 'beanie', 'selfie'], unlock: 'double' }),
  L('1-8', 'day', { waves: 10, zombies: ['scroller', 'beanie', 'selfie', 'vr'], intro: 'vr', reward: 'almanac' }),
  L('1-9', 'day', { waves: 20, zombies: ['scroller', 'beanie', 'selfie', 'vr'], reward: 'note' }),
  L('1-10', 'day', { special: 'conveyor', waves: 20, zombies: ['scroller', 'beanie', 'selfie', 'vr'], conveyor: ['pea', 'double', 'frost', 'coco', 'pom', 'mine', 'gulp'], unlock: 'puff', title: 'Conveyor Belt' }),
  // Night
  L('2-1', 'night', { waves: 10, zombies: ['scroller', 'beanie', 'boomer'], intro: 'boomer', graves: 5, unlock: 'glow' }),
  L('2-2', 'night', { waves: 10, zombies: ['scroller', 'beanie', 'boomer', 'selfie'], graves: 6, unlock: 'stink' }),
  L('2-3', 'night', { waves: 10, zombies: ['scroller', 'beanie', 'boomer', 'bigscreen'], intro: 'bigscreen', graves: 6, unlock: 'gobbler' }),
  L('2-4', 'night', { waves: 20, zombies: ['scroller', 'beanie', 'boomer', 'bigscreen', 'vr'], graves: 7, unlock: 'swirl' }),
  L('2-5', 'night', { special: 'whack', waves: 10, zombies: ['scroller', 'beanie', 'vr'], graves: 0, unlock: 'shy', title: 'Whack-a-Scroller' }),
  L('2-6', 'night', { waves: 20, zombies: ['scroller', 'beanie', 'boomer', 'cryptobro'], intro: 'cryptobro', graves: 7, unlock: 'frostcap' }),
  L('2-7', 'night', { waves: 20, zombies: ['scroller', 'beanie', 'boomer', 'bigscreen', 'cryptobro'], graves: 8, unlock: 'cloud' }),
  L('2-8', 'night', { waves: 20, zombies: ['scroller', 'beanie', 'boomer', 'dancer'], intro: 'dancer', graves: 8, reward: 'note' }),
  L('2-9', 'night', { waves: 30, zombies: ['scroller', 'beanie', 'boomer', 'bigscreen', 'cryptobro', 'dancer', 'selfie'], graves: 9, reward: 'note' }),
  L('2-10', 'night', { special: 'conveyor', waves: 20, zombies: ['scroller', 'beanie', 'boomer', 'cryptobro', 'dancer'], graves: 6, conveyor: ['puff', 'stink', 'gobbler', 'swirl', 'shy', 'frostcap', 'cloud', 'coco'], unlock: 'lily', title: 'Night Conveyor' }),
  // Pool
  L('3-1', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie'], intro: 'floatie', unlock: 'zucchini' }),
  L('3-2', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'scuba'], intro: 'scuba', unlock: 'triple' }),
  L('3-3', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'scuba', 'selfie'], unlock: 'kelp' }),
  L('3-4', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'slush'], intro: 'slush', unlock: 'ghost', reward: 'shop' }),
  L('3-5', 'pool', { special: 'tiny', waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'vr'], conveyor: ['lily', 'pea', 'double', 'frost', 'zucchini', 'kelp', 'coco'], unlock: 'rug', title: 'Tiny Trouble' }),
  L('3-6', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'slush', 'sled'], intro: 'sled', unlock: 'tiki' }),
  L('3-7', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'scuba', 'vr', 'boomer'], unlock: 'cocotower' }),
  L('3-8', 'pool', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'jetski'], intro: 'jetski', reward: 'note' }),
  L('3-9', 'pool', { waves: 30, zombies: ['scroller', 'beanie', 'floatie', 'scuba', 'jetski', 'slush', 'sled', 'cryptobro'], reward: 'note' }),
  L('3-10', 'pool', { special: 'conveyor', waves: 20, zombies: ['scroller', 'beanie', 'vr', 'floatie', 'jetski', 'slush', 'sled'], conveyor: ['lily', 'triple', 'tiki', 'rug', 'zucchini', 'kelp', 'ghost', 'cocotower'], unlock: 'seapuff', title: 'Pool Conveyor' }),
  // Fog
  L('4-1', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'powerbank'], intro: 'powerbank', unlock: 'lantern' }),
  L('4-2', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'powerbank', 'scuba'], unlock: 'prickly' }),
  L('4-3', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'drone'], intro: 'drone', unlock: 'fan' }),
  L('4-4', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'drone', 'jetski', 'cryptobro'], unlock: 'back' }),
  L('4-5', 'night', { special: 'vase', waves: 1, zombies: ['scroller', 'beanie', 'vr', 'cryptobro', 'selfie'], unlock: 'anise', title: 'Vase Smasher' }),
  L('4-6', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'miner'], intro: 'miner', unlock: 'bunker' }),
  L('4-7', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'miner', 'drone', 'jetski'], unlock: 'magnet' }),
  L('4-8', 'fog', { waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'pogo'], intro: 'pogo', reward: 'note' }),
  L('4-9', 'fog', { waves: 30, zombies: ['scroller', 'beanie', 'vr', 'floatie', 'pogo', 'miner', 'drone', 'powerbank', 'scuba'], reward: 'note' }),
  L('4-10', 'fog', { special: 'conveyor', waves: 20, zombies: ['scroller', 'beanie', 'floatie', 'pogo', 'drone', 'miner', 'powerbank'], conveyor: ['lily', 'lantern', 'prickly', 'fan', 'back', 'anise', 'bunker', 'magnet', 'seapuff'], unlock: 'lettuce', title: 'Fog Conveyor' }),
  // Roof
  L('5-1', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'bungee'], intro: 'bungee', pots: 3, unlock: 'popcorn' }),
  L('5-2', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'bungee', 'vr'], unlock: 'espresso' }),
  L('5-3', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'ladderguy'], intro: 'ladderguy', unlock: 'onion' }),
  L('5-4', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'ladderguy', 'flinger'], intro: 'flinger', unlock: 'parasol' }),
  L('5-5', 'roof', { special: 'bungeeblitz', waves: 20, zombies: ['scroller', 'beanie', 'vr', 'bungee'], conveyor: ['pot', 'lettuce', 'popcorn', 'parasol', 'coco', 'pom', 'ghost'], unlock: 'gold', title: 'Bungee Blitz' }),
  L('5-6', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'gigachad'], intro: 'gigachad', unlock: 'melon' }),
  L('5-7', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'vr', 'gigachad', 'ladderguy', 'bungee'], reward: 'note' }),
  L('5-8', 'roof', { waves: 20, zombies: ['scroller', 'beanie', 'vr', 'flinger', 'cryptobro', 'powerbank'], reward: 'note' }),
  L('5-9', 'roof', { waves: 30, zombies: ['scroller', 'beanie', 'vr', 'flinger', 'gigachad', 'ladderguy', 'bungee', 'cryptobro', 'powerbank', 'dancer'], reward: 'note' }),
  L('5-10', 'roof', { special: 'boss', waves: 1, zombies: [], conveyor: ['pot', 'lettuce', 'popcorn', 'melon', 'frostcap', 'ghost', 'coco'], reward: 'trophy', title: 'The Algorithm' }),
]
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]))
export const nextLevelId = (id) => LEVELS[LEVELS.findIndex((l) => l.id === id) + 1]?.id ?? null

/** Plants you have when you reach a level (the ones won before it, and Clay Pots on the roof). */
export function plantsUnlockedBefore(levelId) {
  const out = ['pea']
  for (const l of LEVELS) {
    if (l.id === levelId) break
    if (l.unlock && !out.includes(l.unlock)) out.push(l.unlock)
  }
  if (LEVEL_BY_ID[levelId]?.area === 'roof') out.push('pot')
  return out
}
/** Gary hands you Clay Pots when you reach the roof. */
export const POTS_FROM = '5-1'
/** Scrollers you've met by a level (for the Almanac). */
export function zombiesSeenBy(levelId) {
  const out = new Set()
  for (const l of LEVELS) {
    for (const z of l.zombies) out.add(z)
    if (l.zombies.includes('trend') || l.waves >= 10) out.add('trend')
    if (l.zombies.includes('dancer')) out.add('backup')
    if (l.zombies.includes('gigachad')) out.add('ipadkid')
    if (l.special === 'boss') out.add('algorithm')
    if (l.id === levelId) break
  }
  return [...out]
}

// ================= Gary’s Garage Sale =================
export const SHOP = [
  { id: 'slot7', name: 'Seed slot #7', price: 750, icon: '🎒', desc: 'Bring a 7th plant to every level.', needs: null },
  { id: 'slot8', name: 'Seed slot #8', price: 5000, icon: '🎒', desc: 'An 8th plant.', needs: 'slot7' },
  { id: 'slot9', name: 'Seed slot #9', price: 20000, icon: '🎒', desc: 'A 9th plant.', needs: 'slot8' },
  { id: 'slot10', name: 'Seed slot #10', price: 80000, icon: '🎒', desc: 'A 10th plant. The maximum. Gary checked.', needs: 'slot9' },
  { id: 'poolbot', name: 'Pool robots', price: 1000, icon: '🛟', desc: 'Last-ditch defence for the pool lanes, like the robo-mowers.', needs: 'area:pool' },
  { id: 'roofbot', name: 'Roof robots', price: 3000, icon: '🧹', desc: 'Last-ditch defence on the roof.', needs: 'area:roof' },
  { id: 'rake', name: 'Rake', price: 200, icon: '🪤', desc: 'Lies on the lawn and takes out the first Scroller to step on it (one level).', needs: null, consumable: true },
  ...PLANTS.filter((p) => p.shop).map((p) => ({ id: `plant:${p.id}`, name: p.name, price: p.shop, icon: '🌱', desc: p.desc, needs: p.upgrade ? `plant:${p.upgrade}` : 'beat' })),
]
export const COIN_VALUES = { silver: 10, gold: 50, diamond: 1000 }
